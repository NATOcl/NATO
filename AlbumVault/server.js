import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ESM desde que el proyecto lleva "type": "module" (Vite lo necesita para
// vite.config.js). Solo cambian las cuatro líneas del principio: no hay nada más
// de CommonJS en el fichero.
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3000);
const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_BASE = "https://coverartarchive.org";
const ITUNES_BASE = "https://itunes.apple.com";
// Hardcoding country=us hid albums that never shipped there. A storefront
// that has no match falls back to the US one so results are never empty.
const ITUNES_COUNTRY = (process.env.ITUNES_COUNTRY || "es").toLowerCase();
const ITUNES_FALLBACK_COUNTRY = "us";
const USER_AGENT = process.env.MUSICBRAINZ_USER_AGENT || "AlbumVault/1.0 (http://localhost:3000)";

let lastMusicBrainzRequestAt = 0;
let musicBrainzQueue = Promise.resolve();

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ *
 * In-memory cache.
 *
 * Providers charge latency twice for the same album: once when the
 * search lists it and once when its cover is painted. The cache only
 * lives as long as the process, so it never becomes the source of
 * truth for anything -- restart it and every request simply goes
 * upstream again.
 * ------------------------------------------------------------------ */
function createCache({ maxEntries, maxBytes, ttlMs }) {
  const map = new Map();
  let bytes = 0;

  const drop = key => {
    const entry = map.get(key);
    if (!entry) return;
    bytes -= entry.bytes;
    map.delete(key);
  };

  // Re-insert so the Map iterates oldest-use-first.
  const touch = (key, entry) => {
    map.delete(key);
    map.set(key, entry);
  };

  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (entry.expires <= Date.now()) {
        drop(key);
        return undefined;
      }
      touch(key, entry);
      return entry.value;
    },
    set(key, value, size = 0) {
      drop(key);
      while (map.size >= maxEntries || (size > 0 && bytes + size > maxBytes)) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        drop(oldest);
      }
      map.set(key, { value, bytes: size, expires: Date.now() + ttlMs });
      bytes += size;
    }
  };
}

// Covers are big and change rarely; provider JSON is small and changes
// more often, so the two get separate budgets and lifetimes.
const coverCache = createCache({ maxEntries: 600, maxBytes: 96 * 1024 * 1024, ttlMs: 7 * 24 * 60 * 60 * 1000 });
const jsonCache = createCache({ maxEntries: 500, maxBytes: 16 * 1024 * 1024, ttlMs: 10 * 60 * 1000 });

// Two requests for the same missing key must not both hit the upstream.
const inFlight = new Map();

async function cached(cache, cacheKey, loader) {
  const hit = cache.get(cacheKey);
  if (hit !== undefined) return hit;

  let pending = inFlight.get(cacheKey);
  if (!pending) {
    pending = (async () => loader())().finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, pending);
  }
  return pending;
}

function queueMusicBrainzRequest(task) {
  const run = musicBrainzQueue.then(async () => {
    const elapsed = Date.now() - lastMusicBrainzRequestAt;
    if (elapsed < 1100) await wait(1100 - elapsed);
    lastMusicBrainzRequestAt = Date.now();
    return task();
  });
  musicBrainzQueue = run.catch(() => {});
  return run;
}

async function musicBrainzFetch(url) {
  // MusicBrainz is the slowest provider by design (one request every
  // 1.1s), so a repeat search is worth serving from memory rather than
  // making the user sit through the queue a second time.
  return cached(jsonCache, `mb:${url}`, () =>
    queueMusicBrainzRequest(async () => {
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": USER_AGENT
        }
      });
      if (!response.ok) {
        const error = new Error(`MusicBrainz returned ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const data = await response.json();
      jsonCache.set(`mb:${url}`, data, JSON.stringify(data).length);
      return data;
    })
  );
}




function safeLucenePhrase(text) {
  return String(text || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
}

async function iTunesFetch(url) {
  return cached(jsonCache, `itunes:${url}`, async () => {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "AlbumVault/1.2"
      }
    });
    if (!response.ok) {
      const error = new Error(`iTunes Search returned ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    jsonCache.set(`itunes:${url}`, data, JSON.stringify(data).length);
    return data;
  });
}

function parseArtistAlbumQuery(q) {
  const parts = String(q || "").split(/\s+[—–-]\s+/);
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      album: parts.slice(1).join(" - ").trim()
    };
  }
  return { artist: "", album: "" };
}

function normalizeItunesAlbum(item, matchType = "album") {
  const releaseDate = String(item?.releaseDate || "").slice(0, 10);
  const collectionType = item?.collectionType || (item?.collectionId ? "Album" : "");
  // Result rows paint the art at 46 CSS px, so 200 is the smallest size
  // that stays sharp on a 2x display. Asking for the 600px variant meant
  // downloading ~100 KB to fill a 46 px box.
  const coverUrl = imageProxyUrl(
    String(item?.artworkUrl100 || "").replace(/100x100bb\./i, "200x200bb.")
  );

  return {
    id: item?.collectionId ? String(item.collectionId) : "",
    artistId: item?.artistId ? String(item.artistId) : "",
    title: item?.collectionName || "",
    artist: item?.artistName || "",
    year: releaseDate.slice(0, 4),
    date: releaseDate,
    coverUrl,
    trackCount: Number(item?.trackCount) || 0,
    collectionType,
    source: "Apple/iTunes",
    matchType
  };
}

function itunesUrl(pathname, params) {
  const url = new URL(`${ITUNES_BASE}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url;
}

async function itunesSearch(params) {
  const data = await iTunesFetch(itunesUrl("/search", { ...params, country: ITUNES_COUNTRY }).toString());
  const results = Array.isArray(data?.results) ? data.results : [];
  if (results.length) return results;
  if (ITUNES_COUNTRY === ITUNES_FALLBACK_COUNTRY) return results;
  const fallback = await iTunesFetch(itunesUrl("/search", { ...params, country: ITUNES_FALLBACK_COUNTRY }).toString());
  return Array.isArray(fallback?.results) ? fallback.results : [];
}

async function itunesLookup(params) {
  const data = await iTunesFetch(itunesUrl("/lookup", { ...params, country: ITUNES_COUNTRY }).toString());
  let results = Array.isArray(data?.results) ? data.results : [];
  if (results.length || ITUNES_COUNTRY === ITUNES_FALLBACK_COUNTRY) return results;
  const fallback = await iTunesFetch(itunesUrl("/lookup", { ...params, country: ITUNES_FALLBACK_COUNTRY }).toString());
  results = Array.isArray(fallback?.results) ? fallback.results : [];
  return results;
}

function chooseBestItunesArtist(items, query) {
  const artists = (Array.isArray(items) ? items : []).filter(x => x?.wrapperType === "artist" && x?.artistId);
  const qn = String(query || "").trim().toLocaleLowerCase();
  return artists
    .map(item => ({
      item,
      exact: String(item.artistName || "").trim().toLocaleLowerCase() === qn
    }))
    .sort((a, b) => Number(b.exact) - Number(a.exact))[0]?.item || artists[0] || null;
}

function artistCreditName(credit) {
  if (!Array.isArray(credit)) return "";
  return credit.map(item => `${item?.artist?.name || ""}${item?.joinphrase || ""}`).join("").trim();
}

function chooseBestMusicBrainzArtist(items, query) {
  const artists = (Array.isArray(items) ? items : []).filter(x => x?.id && x?.name);
  const qn = String(query || "").trim().toLocaleLowerCase();
  return artists
    .map(item => ({
      item,
      exact: String(item.name || "").trim().toLocaleLowerCase() === qn,
      score: Number(item.score) || 0
    }))
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score)[0]?.item || null;
}

async function musicBrainzArtistDiscography(query) {
  const artistUrl = new URL(`${MB_BASE}/artist`);
  artistUrl.searchParams.set("query", `artist:"${safeLucenePhrase(query)}"`);
  artistUrl.searchParams.set("limit", "10");
  artistUrl.searchParams.set("fmt", "json");
  const artistData = await musicBrainzFetch(artistUrl.toString());
  const artist = chooseBestMusicBrainzArtist(artistData.artists, query);
  if (!artist) return [];

  const groupsUrl = new URL(`${MB_BASE}/release-group`);
  groupsUrl.searchParams.set("artist", artist.id);
  groupsUrl.searchParams.set("type", "album|ep");
  groupsUrl.searchParams.set("release-group-status", "website-default");
  groupsUrl.searchParams.set("limit", "100");
  groupsUrl.searchParams.set("offset", "0");
  groupsUrl.searchParams.set("fmt", "json");

  const groupsData = await musicBrainzFetch(groupsUrl.toString());
  return (groupsData["release-groups"] || []).map(group => ({
    id: group.id,
    releaseGroupId: group.id,
    title: group.title || "",
    artist: artist.name || "",
    year: String(group["first-release-date"] || "").slice(0, 4),
    date: group["first-release-date"] || "",
    primaryType: group["primary-type"] || "",
    secondaryTypes: group["secondary-types"] || [],
    // A release group with a disambiguation is usually the "other one with
    // the same name": a tribute, a bootleg or a regional variant.
    disambiguation: group.disambiguation || "",
    coverUrl: `/api/cover-art-group/${encodeURIComponent(group.id)}/front-250`,
    source: "MusicBrainz",
    matchType: "artist"
  })).filter(x => x.title);
}

// A misconfigured upstream can return megabytes; refuse to buffer them.
const MAX_COVER_BYTES = 12 * 1024 * 1024;

/* ------------------------------------------------------------------ *
 * Cover loading
 *
 * Every cover is served same-origin through /api/img so the browser
 * never talks to the providers directly. That keeps the CSP at
 * img-src 'self' and means the user's IP is not handed to a third
 * party on every search.
 * ------------------------------------------------------------------ */

// A generic image proxy is an SSRF primitive unless the target is
// pinned: only these hosts are ever fetched, matched on the exact host
// or one of its subdomains.
const IMAGE_HOST_ALLOWLIST = new Set([
  "mzstatic.com",
  "coverartarchive.org",
  "archive.org"
]);

function hostAllowed(hostname) {
  const host = String(hostname || "").toLowerCase();
  for (const allowed of IMAGE_HOST_ALLOWLIST) {
    if (host === allowed || host.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

function imageProxyUrl(remoteUrl) {
  if (!remoteUrl) return "";
  try {
    const parsed = new URL(String(remoteUrl));
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    if (!hostAllowed(parsed.hostname)) return "";
    return `/api/img?u=${encodeURIComponent(parsed.href)}`;
  } catch {
    return "";
  }
}

// Inverse of imageProxyUrl. Lets warmCovers reuse the value already on
// the release without every normalizer having to carry the raw upstream
// URL around (and without shipping it to the browser).
function remoteFromProxyUrl(proxyUrl) {
  if (typeof proxyUrl !== "string" || !proxyUrl.startsWith("/api/img?u=")) return "";
  try {
    const remote = new URL(decodeURIComponent(proxyUrl.slice("/api/img?u=".length)));
    if (!hostAllowed(remote.hostname)) return "";
    return remote.href;
  } catch {
    return "";
  }
}

async function readCapped(response, limit) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) {
    const error = new Error("Image too large");
    error.status = 413;
    throw error;
  }

  const chunks = [];
  let total = 0;

  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > limit) {
      const error = new Error("Image too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

const CONTENT_TYPE_BY_EXTENSION = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".avif", "image/avif"]
]);

// Content-Type is part of the cached entry, so a revalidation never has
// to guess it again.
async function loadImage(remoteUrl, cap = MAX_COVER_BYTES) {
  const response = await fetch(remoteUrl, { redirect: "follow" });
  if (!response.ok) {
    const error = new Error(`Cover upstream returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const buffer = await readCapped(response, cap);
  const byExtension = CONTENT_TYPE_BY_EXTENSION.get(path.extname(new URL(remoteUrl).pathname).toLowerCase());
  return {
    buffer,
    contentType: byExtension || response.headers.get("content-type") || "image/jpeg"
  };
}

// Returns { buffer, contentType } or { notFound: true }. A 404 is
// remembered too: releases without art are common, and re-asking the
// provider for every one of them is pure waste.
async function resolveCover(cacheKey, loader) {
  return cached(coverCache, cacheKey, async () => {
    try {
      const entry = await loader();
      coverCache.set(cacheKey, entry, entry.buffer ? entry.buffer.length : 0);
      return entry;
    } catch (error) {
      if (error.status === 404 || error.status === 400) {
        coverCache.set(cacheKey, { notFound: true }, 0);
      }
      throw error;
    }
  });
}

// Warms the covers of a normalized search result list, so the first paint
// does not wait on 20 sequential upstream round trips. Runs after the
// response is already sent and swallows failures: a failed warm-up only
// costs the same round trip the browser was going to make anyway.
function warmReleaseCovers(items) {
  const inThisRound = new Set();

  for (const item of items || []) {
    const proxyUrl = String(item?.coverUrl || "");
    if (!proxyUrl || inThisRound.has(proxyUrl)) continue;

    // MusicBrainz rows already point at our own /api/cover-art-* routes,
    // so they are warmed under the same keys those routes will look up.
    const groupMatch = proxyUrl.match(/^\/api\/cover-art-group\/([0-9a-fA-F-]{36})\/front-(250|500|1200)$/);
    if (groupMatch) {
      const [, id, size] = groupMatch;
      inThisRound.add(proxyUrl);
      resolveCover(`caa:group:${id}:${size}`, () =>
        loadImage(`${CAA_BASE}/release-group/${id}/front-${size}`)
      ).catch(() => {});
      continue;
    }

    const remote = remoteFromProxyUrl(proxyUrl);
    if (!remote) continue;
    inThisRound.add(proxyUrl);
    resolveCover(`proxy:${remote}`, () => loadImage(remote)).catch(() => {});
  }
}

function sendCover(res, entry) {
  if (entry.notFound) {
    res.writeHead(404, { "Cache-Control": "public, max-age=3600" });
    return res.end();
  }
  res.writeHead(200, {
    "Content-Type": entry.contentType || "image/jpeg",
    "Content-Length": entry.buffer.length,
    "Cache-Control": "public, max-age=604800, immutable"
  });
  res.end(entry.buffer);
}

export function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

export async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/musicbrainz/discography") {
    const q = String(url.searchParams.get("q") || "").trim();
    if (q.length < 2) return sendJson(res, 400, { error: "Search query is too short." });

    try {
      const releases = await musicBrainzArtistDiscography(q);
      sendJson(res, 200, { releases });
      warmReleaseCovers(releases);
    } catch (error) {
      console.error("MusicBrainz discography error", error);
      sendJson(res, error.status === 503 ? 503 : 502, { error: "MusicBrainz artist discography is temporarily unavailable." });
    }
    return true;
  }

  const releaseGroupMatch = url.pathname.match(/^\/api\/musicbrainz\/release-group\/([0-9a-fA-F-]{36})$/);
  if (req.method === "GET" && releaseGroupMatch) {
    try {
      const groupUrl = new URL(`${MB_BASE}/release-group/${releaseGroupMatch[1]}`);
      groupUrl.searchParams.set("inc", "releases+artist-credits");
      groupUrl.searchParams.set("fmt", "json");

      const data = await musicBrainzFetch(groupUrl.toString());
      const releases = Array.isArray(data?.releases) ? data.releases : [];

      const sorted = [...releases].sort((a, b) => {
        const officialDiff = Number(String(a?.status || "").toLowerCase() === "official")
          - Number(String(b?.status || "").toLowerCase() === "official");
        if (officialDiff) return -officialDiff;
        return String(a?.date || "").localeCompare(String(b?.date || ""));
      });

      const chosen = sorted.find(r => r?.id) || null;
      if (!chosen) {
        return sendJson(res, 404, { error: "No release edition was found for that release group." });
      }

      sendJson(res, 200, {
        releaseGroupId: data.id || releaseGroupMatch[1],
        title: data.title || chosen.title || "",
        artist: artistCreditName(data["artist-credit"]) || "",
        year: String(data["first-release-date"] || chosen.date || "").slice(0, 4),
        releaseId: chosen.id,
        chosenReleaseDate: chosen.date || "",
        status: chosen.status || ""
      });
    } catch (error) {
      console.error("MusicBrainz release-group error", error);
      sendJson(res, error.status === 404 ? 404 : 502, { error: "Could not load that MusicBrainz release group." });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/musicbrainz/search") {
    const q = String(url.searchParams.get("q") || "").trim();
    if (q.length < 2) return sendJson(res, 400, { error: "Search query is too short." });

    try {
      // Search the release index by BOTH artist and release title. This means
      // the same input box accepts an artist name, an album title, or both.
      // MusicBrainz supports fielded Lucene queries such as artistname: and release:.
      // We keep the query as a phrase to avoid splitting multi-word K-pop names.
      let artistPart = "";
      let albumPart = "";
      const parts = q.split(/\s+[—–-]\s+/);
      if (parts.length >= 2) {
        artistPart = parts[0].trim();
        albumPart = parts.slice(1).join(" - ").trim();
      }

      const mbUrl = new URL(`${MB_BASE}/release`);
      if (artistPart && albumPart) {
        mbUrl.searchParams.set("query", `artistname:"${safeLucenePhrase(artistPart)}" AND release:"${safeLucenePhrase(albumPart)}"`);
      } else {
        mbUrl.searchParams.set("query", `artistname:"${safeLucenePhrase(q)}" OR release:"${safeLucenePhrase(q)}"`);
      }
      mbUrl.searchParams.set("limit", "50");
      mbUrl.searchParams.set("fmt", "json");
      const data = await musicBrainzFetch(mbUrl.toString());
      sendJson(res, 200, {
        releases: (data.releases || []).map(release => {
          // The release-group carries the canonical-album signals the client
          // uses to rank: secondary types (live, remix, compilation) and
          // disambiguation. Without them a bootleg with the same title ranks
          // exactly as the studio album.
          const group = release["release-group"] || {};
          return {
            id: release.id,
            title: release.title,
            date: release.date || "",
            year: String(release.date || "").slice(0, 4),
            country: release.country || "",
            status: release.status || "",
            trackCount: Number(release["track-count"]) || 0,
            primaryType: group["primary-type"] || "",
            secondaryTypes: group["secondary-types"] || [],
            disambiguation: group.disambiguation || "",
            "artist-credit": release["artist-credit"] || [],
            matchType: artistPart ? "artist+album" : "artist-or-album"
          };
        })
      });
    } catch (error) {
      console.error("MusicBrainz search error", error);
      sendJson(res, error.status === 503 ? 503 : 502, { error: "MusicBrainz search is temporarily unavailable." });
    }
    return true;
  }

  const releaseMatch = url.pathname.match(/^\/api\/musicbrainz\/release\/([0-9a-fA-F-]{36})$/);
  if (req.method === "GET" && releaseMatch) {
    try {
      const mbUrl = new URL(`${MB_BASE}/release/${releaseMatch[1]}`);
      mbUrl.searchParams.set("inc", "media+artist-credits");
      mbUrl.searchParams.set("fmt", "json");
      const data = await musicBrainzFetch(mbUrl.toString());
      sendJson(res, 200, data);
    } catch (error) {
      console.error("MusicBrainz release error", error);
      sendJson(res, error.status === 404 ? 404 : 502, { error: "Could not load that MusicBrainz release." });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/itunes/search") {
    const q = String(url.searchParams.get("q") || "").trim();
    if (q.length < 2) return sendJson(res, 400, { error: "Search query is too short." });

    try {
      const { artist, album } = parseArtistAlbumQuery(q);
      const results = [];

      if (artist) {
        const artistResults = await itunesSearch({
          term: artist,
          media: "music",
          entity: "musicArtist",
          limit: "10"
        });
        const bestArtist = chooseBestItunesArtist(artistResults, artist);

        if (bestArtist?.artistId) {
          const lookupResults = await itunesLookup({
            id: String(bestArtist.artistId),
            entity: "album",
            limit: "200"
          });

          for (const item of lookupResults) {
            if (item?.wrapperType === "collection" && item?.collectionId && item?.collectionName) {
              results.push(normalizeItunesAlbum(item, "artist"));
            }
          }
        }
      }

      // Album-title search works even when the query was not an artist.
      if (!artist || album) {
        const albumResults = await itunesSearch({
          term: artist ? `${artist} ${album}` : (album || q),
          media: "music",
          entity: "album",
          limit: "50"
        });

        for (const item of albumResults) {
          if (item?.wrapperType === "collection" && item?.collectionId && item?.collectionName) {
            results.push(normalizeItunesAlbum(item, artist ? "artist+album" : "album"));
          }
        }
      }

      const seen = new Set();
      const unique = results.filter(item => {
        const key = `${item.id}::${String(item.title).toLocaleLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 200);

      sendJson(res, 200, { albums: unique });
      warmReleaseCovers(unique);
    } catch (error) {
      console.error("iTunes search error", error);
      sendJson(res, error.status === 429 ? 429 : 502, { error: "Apple/iTunes catalog search is temporarily unavailable." });
    }
    return true;
  }

  const itunesAlbumMatch = url.pathname.match(/^\/api\/itunes\/album\/(\d+)$/);
  if (req.method === "GET" && itunesAlbumMatch) {
    try {
      const id = itunesAlbumMatch[1];
      const results = await itunesLookup({ id, entity: "song", limit: "200" });
      const collection = results.find(r => r?.wrapperType === "collection") || null;

      if (!collection) {
        return sendJson(res, 404, { error: "Apple/iTunes album was not found." });
      }

      const songs = results
        .filter(r => r?.wrapperType === "track" && r?.kind === "song")
        .map((track, index) => ({
          title: String(track?.trackName || "").trim(),
          position: Number(track?.trackNumber) || index + 1,
          duration: Number(track?.trackTimeMillis) || 0
        }))
        .filter(t => t.title);

      const coverUrl = String(collection?.artworkUrl100 || "").replace(/100x100bb\./i, "1200x1200bb.");

      sendJson(res, 200, {
        id,
        title: collection.collectionName || "",
        artist: collection.artistName || "",
        year: String(collection.releaseDate || "").slice(0, 4),
        coverUrl,
        songs,
        source: "Apple/iTunes"
      });
    } catch (error) {
      console.error("iTunes album error", error);
      sendJson(res, error.status === 404 ? 404 : error.status === 429 ? 429 : 502, { error: "Could not load that Apple/iTunes album." });
    }
    return true;
  }

  const itunesCoverMatch = url.pathname.match(/^\/api\/itunes\/cover\/(\d+)$/);
  if (req.method === "GET" && itunesCoverMatch) {
    try {
      const id = itunesCoverMatch[1];
      const results = await itunesLookup({ id, entity: "song", limit: "1" });
      const collection = results.find(r => r?.wrapperType === "collection") || null;
      const imageUrl = String(collection?.artworkUrl100 || "").replace(/100x100bb\./i, "1200x1200bb.");
      if (!imageUrl) {
        res.writeHead(404);
        return res.end();
      }

      const entry = await resolveCover(
        `itunes:1200:${id}`,
        () => loadImage(imageUrl)
      );
      sendCover(res, entry);
    } catch (error) {
      console.error("iTunes cover error", error);
      res.writeHead(error.status === 413 ? 413 : 502);
      res.end();
    }
    return true;
  }

  const coverGroupMatch = url.pathname.match(/^\/api\/cover-art-group\/([0-9a-fA-F-]{36})\/front-(250|500|1200)$/);
  if (req.method === "GET" && coverGroupMatch) {
    const id = coverGroupMatch[1];
    const size = coverGroupMatch[2];
    try {
      const entry = await resolveCover(
        `caa:group:${id}:${size}`,
        () => loadImage(`${CAA_BASE}/release-group/${id}/front-${size}`)
      );
      sendCover(res, entry);
    } catch (error) {
      console.error("Cover Art Archive release-group error", error);
      res.writeHead(error.status === 413 ? 413 : 502);
      res.end();
    }
    return true;
  }

  const coverMatch = url.pathname.match(/^\/api\/cover-art\/([0-9a-fA-F-]{36})\/front-500$/);
  if (req.method === "GET" && coverMatch) {
    const id = coverMatch[1];
    try {
      const entry = await resolveCover(
        `caa:release:${id}:500`,
        () => loadImage(`${CAA_BASE}/release/${id}/front-500`)
      );
      sendCover(res, entry);
    } catch (error) {
      console.error("Cover Art Archive error", error);
      res.writeHead(error.status === 413 ? 413 : 502);
      res.end();
    }
    return true;
  }

  // Same-origin image proxy. Search results point here instead of at the
  // providers directly, so the CSP can keep img-src 'self' and every byte
  // goes through the cache.
  if (req.method === "GET" && url.pathname === "/api/img") {
    const remote = remoteFromProxyUrl(`/api/img?u=${url.searchParams.get("u") || ""}`);
    if (!remote) return sendJson(res, 400, { error: "Unsupported image host." });

    try {
      const entry = await resolveCover(`proxy:${remote}`, () => loadImage(remote));
      sendCover(res, entry);
    } catch (error) {
      if (error.status === 413) return sendJson(res, 413, { error: "Image too large." });
      console.error("Image proxy error", error);
      sendJson(res, error.status === 404 ? 404 : 502, { error: "Cover is temporarily unavailable." });
    }
    return true;
  }

  return false;
}

// Lo que emite el build de Vite. Un módulo con el MIME equivocado no se ejecuta
// (el navegador lo rechaza en silencio con un error de consola), así que .js y
// .css tienen que estar aquí sí o sí.
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

// Only the built SPA is reachable. A broad extension regex is not enough:
// server.js, package.json and the stale index.before-*.html backups all match
// one, so the list is explicit.
//
// With Vite the document is dist/index.html and the code it loads lives in
// dist/assets/ under hashed names. So the allow-list has two shapes: the document
// itself, and the asset directory by extension. The name of an asset is chosen
// by the build, not by whoever asks, so this stays an allow-list and not a hole.
const DIST = path.join(ROOT, "dist");
const PUBLIC_FILES = new Set(["/", "/index.html"]);
const ASSET_EXTENSIONS = new Set([".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".ico", ".woff2", ".map"]);

function safePath(requestPath) {
  let p = decodeURIComponent(requestPath);
  if (p.includes("\0")) return null;
  // El build integrado en el CV usa base /albumvault/, así que este servidor
  // también acepta ese prefijo y lo ignora: la app sigue funcionando sola.
  if (p === "/albumvault" || p === "/albumvault/") p = "/index.html";
  else if (p.startsWith("/albumvault/")) p = p.slice("/albumvault".length);
  if (p === "/") p = "/index.html";

  if (PUBLIC_FILES.has(p)) {
    const document_ = path.join(DIST, "index.html");
    // Before `npm run build` there is nothing to serve: say so instead of a 404
    // that looks like a broken app.
    if (!fs.existsSync(document_)) return "MISSING_BUILD";
    return document_;
  }

  if (p.startsWith("/assets/")) {
    const full = path.normalize(path.join(DIST, p));
    if (!full.startsWith(DIST + path.sep)) return null;
    if (!ASSET_EXTENSIONS.has(path.extname(full).toLowerCase())) return null;
    return full;
  }

  return null;
}

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  // Bootstrap se empaqueta con el build (ya no hay link a jsdelivr), así que el
  // único origen de terceros son las fuentes de Google. Nada evalúa código: el
  // 'unsafe-inline' de script-src queda solo para el script del tema en el <head>,
  // que tiene que correr antes del primer pintado. El de style-src lo necesitan
  // los estilos en línea (--fill de las estrellas, marginLeft de los paneles).
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ")
};

const appServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (handled) return;
      console.error("[DEBUG404]", req.method, url.pathname, "headersSent:", res.headersSent, "ended:", res.writableEnded);
      return sendJson(res, 404, { error: "API route not found." });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Allow": "GET, HEAD" });
      return res.end();
    }

    const file = safePath(url.pathname);

    // Sin build todavía: decirlo claro es mejor que un 404 que parece la app rota.
    if (file === "MISSING_BUILD") {
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
      return res.end("dist/ no existe. Ejecuta `npm run build` (o usa `npm run dev` en el puerto 5173).");
    }

    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
      return res.end("Not found");
    }

    res.writeHead(200, {
      "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
      // El documento nunca se cachea; los assets llevan hash en el nombre, así que
      // pueden cachearse para siempre sin riesgo de servir un bundle viejo.
      "Cache-Control": url.pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
      ...SECURITY_HEADERS
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end("Server error");
  }
});

// El servidor raíz del CV importa `handleApi` y no debe abrir un segundo puerto.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  appServer.listen(PORT, () => {
    console.log(`AlbumVault running at http://localhost:${PORT}`);
    console.log(`MusicBrainz User-Agent: ${USER_AGENT}`);
    if (!fs.existsSync(path.join(DIST, "index.html"))) {
      console.log("dist/ todavía no existe: `npm run build`, o `npm run dev` para el servidor de Vite en el 5173.");
    }
  });
}

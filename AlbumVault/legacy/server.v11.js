const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_BASE = "https://coverartarchive.org";
const AUDIO_DB_KEY = process.env.THEAUDIODB_API_KEY || "123";
const AUDIO_DB_BASE = `https://www.theaudiodb.com/api/v1/json/${AUDIO_DB_KEY}`;
const USER_AGENT = process.env.MUSICBRAINZ_USER_AGENT || "AlbumVault/1.0 (http://localhost:3000)";

let lastMusicBrainzRequestAt = 0;
let musicBrainzQueue = Promise.resolve();

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

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
  return queueMusicBrainzRequest(async () => {
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
    return response.json();
  });
}




async function audioDbFetch(url) {
  const response = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "AlbumVault/1.0" }
  });
  if (!response.ok) {
    const error = new Error(`TheAudioDB returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function audioDbAlbumsFromSearch(data) {
  // TheAudioDB v1 searchalbum.php returns an object whose `album` property
  // is an array when matches exist. Some responses can also be null/empty.
  if (Array.isArray(data?.album)) return data.album;
  if (data?.album && typeof data.album === "object") return [data.album];
  return [];
}

function audioDbAlbumsFromDiscography(data) {
  if (Array.isArray(data?.album)) return data.album;
  if (data?.album && typeof data.album === "object") return [data.album];
  return [];
}

function normalizeAudioDbAlbum(album, matchType = "album") {
  const year = String(album?.intYearReleased || album?.strReleaseDate || "").slice(0, 4);
  return {
    id: String(album?.idAlbum || ""),
    title: album?.strAlbum || "",
    artist: album?.strArtist || "",
    year,
    coverUrl: album?.strAlbumThumbHQ || album?.strAlbumThumb || album?.strAlbumThumb2 || "",
    country: album?.strCountry || "",
    source: "TheAudioDB",
    matchType
  };
}

function safeLucenePhrase(text) {
  return String(text || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

async function handleApi(req, res, url) {
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
        releases: (data.releases || []).map(release => ({
          id: release.id,
          title: release.title,
          date: release.date || "",
          country: release.country || "",
          status: release.status || "",
          "artist-credit": release["artist-credit"] || [],
          matchType: artistPart ? "artist+album" : "artist-or-album"
        }))
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

  if (req.method === "GET" && url.pathname === "/api/theaudiodb/search") {
    const q = String(url.searchParams.get("q") || "").trim();
    if (q.length < 2) return sendJson(res, 400, { error: "Search query is too short." });

    try {
      let artist = "";
      let album = "";
      const parts = q.split(/\s+[—–-]\s+/);
      if (parts.length >= 2) {
        artist = parts[0].trim();
        album = parts.slice(1).join(" - ").trim();
      }

      // Two complementary searches make the input box work for either use case:
      // 1) artist name -> full discography
      // 2) album title -> album search
      // When "Artist — Album" is typed, use the exact two-field search as well.
      const tasks = [];

      if (artist && album) {
        const exactUrl = new URL(`${AUDIO_DB_BASE}/searchalbum.php`);
        exactUrl.searchParams.set("s", artist);
        exactUrl.searchParams.set("a", album);
        tasks.push(
          audioDbFetch(exactUrl.toString())
            .then(data => audioDbAlbumsFromSearch(data).map(a => normalizeAudioDbAlbum(a, "artist+album")))
            .catch(() => [])
        );
      } else {
        const discographyUrl = new URL(`${AUDIO_DB_BASE}/discography.php`);
        discographyUrl.searchParams.set("s", q);
        tasks.push(
          audioDbFetch(discographyUrl.toString())
            .then(data => audioDbAlbumsFromDiscography(data).map(a => normalizeAudioDbAlbum(a, "artist")))
            .catch(() => [])
        );

        const albumUrl = new URL(`${AUDIO_DB_BASE}/searchalbum.php`);
        albumUrl.searchParams.set("a", q);
        tasks.push(
          audioDbFetch(albumUrl.toString())
            .then(data => audioDbAlbumsFromSearch(data).map(a => normalizeAudioDbAlbum(a, "album")))
            .catch(() => [])
        );
      }

      const groups = await Promise.all(tasks);
      const albums = groups.flat().filter(a => a.id && a.title);

      // De-duplicate TheAudioDB's artist/album overlap.
      const seen = new Set();
      const uniqueAlbums = albums.filter(a => {
        const key = `${a.id}::${String(a.title).toLocaleLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 50);

      sendJson(res, 200, { albums: uniqueAlbums });
    } catch (error) {
      console.error("TheAudioDB search error", error);
      sendJson(res, error.status === 429 ? 429 : 502, { error: "TheAudioDB search is temporarily unavailable." });
    }
    return true;
  }

  const audioDbAlbumMatch = url.pathname.match(/^\/api\/theaudiodb\/album\/(\d+)$/);
  if (req.method === "GET" && audioDbAlbumMatch) {
    try {
      const albumId = audioDbAlbumMatch[1];
      const albumData = await audioDbFetch(`${AUDIO_DB_BASE}/album.php?i=${encodeURIComponent(albumId)}`);
      const album = Array.isArray(albumData?.album) ? albumData.album[0] : null;
      if (!album) return sendJson(res, 404, { error: "TheAudioDB album was not found." });

      let tracks = [];
      try {
        const trackData = await audioDbFetch(`${AUDIO_DB_BASE}/track.php?m=${encodeURIComponent(albumId)}`);
        if (Array.isArray(trackData?.track)) tracks = trackData.track;
      } catch (trackError) {
        console.warn("TheAudioDB track lookup failed", trackError.message);
      }

      sendJson(res, 200, {
        id: String(album.idAlbum || albumId),
        title: album.strAlbum || "",
        artist: album.strArtist || "",
        year: String(album.intYearReleased || album.strReleaseDate || "").slice(0, 4),
        coverUrl: album.strAlbumThumbHQ || album.strAlbumThumb || "",
        songs: tracks.map((track, index) => ({
          title: String(track?.strTrack || "").trim(),
          position: Number(track?.intTrackNumber) || index + 1,
          duration: Number(track?.intDuration) || 0
        })).filter(t => t.title),
        source: "TheAudioDB"
      });
    } catch (error) {
      console.error("TheAudioDB album error", error);
      sendJson(res, error.status === 404 ? 404 : error.status === 429 ? 429 : 502, { error: "Could not load that TheAudioDB album." });
    }
    return true;
  }

  const audioDbCoverMatch = url.pathname.match(/^\/api\/theaudiodb\/cover\/(\d+)$/);
  if (req.method === "GET" && audioDbCoverMatch) {
    try {
      const albumId = audioDbCoverMatch[1];
      const albumData = await audioDbFetch(`${AUDIO_DB_BASE}/album.php?i=${encodeURIComponent(albumId)}`);
      const album = Array.isArray(albumData?.album) ? albumData.album[0] : null;
      const imageUrl = album?.strAlbumThumbHQ || album?.strAlbumThumb || "";
      if (!imageUrl) {
        res.writeHead(404, { "Cache-Control": "no-store" });
        return res.end();
      }

      const response = await fetch(imageUrl, { redirect: "follow" });
      if (!response.ok) {
        res.writeHead(response.status === 404 ? 404 : 502, { "Cache-Control": "no-store" });
        return res.end();
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400"
      });
      res.end(buffer);
    } catch (error) {
      console.error("TheAudioDB cover error", error);
      res.writeHead(502);
      res.end();
    }
    return true;
  }

  const coverMatch = url.pathname.match(/^\/api\/cover-art\/([0-9a-fA-F-]{36})\/front-500$/);
  if (req.method === "GET" && coverMatch) {
    try {
      const response = await fetch(`${CAA_BASE}/release/${coverMatch[1]}/front-500`, { redirect: "follow" });
      if (!response.ok) {
        res.writeHead(response.status === 404 ? 404 : 502, { "Cache-Control": "no-store" });
        return res.end();
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400"
      });
      res.end(buffer);
    } catch (error) {
      console.error("Cover Art Archive error", error);
      res.writeHead(502);
      res.end();
    }
    return true;
  }
  return false;
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function safePath(requestPath) {
  let p = decodeURIComponent(requestPath);
  if (p === "/") p = "/index.html";
  const full = path.normalize(path.join(ROOT, p));
  return full.startsWith(ROOT) ? full : null;
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (handled) return;
      return sendJson(res, 404, { error: "API route not found." });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Allow": "GET, HEAD" });
      return res.end();
    }

    const file = safePath(url.pathname);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }

    res.writeHead(200, {
      "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end("Server error");
  }
}).listen(PORT, () => {
  console.log(`AlbumVault running at http://localhost:${PORT}`);
  console.log(`MusicBrainz User-Agent: ${USER_AGENT}`);
});

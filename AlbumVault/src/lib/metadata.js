/* Búsqueda de metadatos e importación. Aquí vive todo lo que habla con
   MusicBrainz y Apple/iTunes: la consulta en paralelo, el dedupe, el orden por
   relevancia y las tres rutas de importación. La UI solo recibe datos.

   Un fallo de proveedor devuelve [] en vez de reventar la búsqueda entera: se
   degrada el resultado, no la pantalla. */

import { appApi, fetchCoverBlob, artistCreditName, parsePairQuery } from "./api.js";
import { normalize, uid } from "./format.js";

const SOURCE_LABEL = { musicbrainz: "MusicBrainz", itunes: "Apple/iTunes" };

export function filteredMetadataResults(results, source) {
  if (source === "all") return results;
  return results.filter((item) => item.source === SOURCE_LABEL[source]);
}

/* Una clave estable por fila, independiente de cuál de las tres llamadas de
   importación vaya a dispararse. Es lo que usan aria-current y la restauración
   de foco, así que volver a pintar la lista no pierde la fila elegida. */
export function metadataResultKey(release) {
  if (release.source === "Apple/iTunes") return `itunes:${release.id}`;
  if (release.releaseGroupId || release.matchType === "artist") {
    return `mb-group:${release.releaseGroupId || release.id}`;
  }
  return `mb-release:${release.id}`;
}

/* MusicBrainz y Apple/iTunes no exponen ninguna métrica de popularidad: la
   búsqueda de MB devuelve score=100 para todo, el browse de discografía no tiene
   campo de score e iTunes no manda ninguno. "Lo más conocido primero" se
   aproxima con lo canónico y lo bien catalogado que es un álbum, que es lo que
   de verdad aparta los impostores que comparten título.

   Pesos, de más fuerte a más flojo: artista y título exactos, un release group
   sin tipos secundarios (nada de bootlegs en vivo, remixes ni homenajes), tipo
   canónico y entrada completa. */
const CANONICAL_SOURCE_BONUS = { MusicBrainz: 5, "Apple/iTunes": 0 };

function metadataRelevance(item, target) {
  const artist = item.artist || artistCreditName(item["artist-credit"]);
  const nArtist = normalize(artist);
  const nTitle = normalize(item.title);
  const nTarget = normalize(target);
  let score = 0;

  // La consulta nombra a este artista: esta es la discografía que se quería.
  if (item.matchType === "artist") score += 100;

  if (nTarget && nArtist === nTarget) score += 45;

  if (nTarget && nTitle === nTarget) score += 50;
  else if (nTarget && nTitle && (nTitle.startsWith(nTarget) || nTarget.startsWith(nTitle))) score += 20;

  // El filtro de verdad: un disco de estudio normal le gana a un live/remix/recopilatorio
  // con el mismo nombre, y una edición sin ambigüedad le gana a "The Album (Deluxe Tribute Edition)".
  const secondary = Array.isArray(item.secondaryTypes) ? item.secondaryTypes : [];
  score += secondary.length ? -20 * secondary.length : 25;
  if (item.disambiguation) score -= 15;
  if (item.primaryType === "album") score += 8;

  // Entradas bien catalogadas: un año, y una lista de canciones de verdad en vez
  // de un single que iTunes archiva como álbum.
  if (item.year) score += 8;
  const tracks = Number(item.trackCount) || 0;
  if (tracks >= 4) score += 6;
  else if (tracks > 0) score -= 5;

  score += CANONICAL_SOURCE_BONUS[item.source] ?? 0;
  return score;
}

/* Lanza las tres fuentes en paralelo y devuelve la lista deduplicada y
   ordenada. `signal` permite cancelar una búsqueda que ya no importa. */
export async function searchMetadata(query, source, { signal } = {}) {
  const pair = parsePairQuery(query);
  const tasks = [];

  if (source === "all" || source === "musicbrainz") {
    if (!pair) {
      tasks.push(
        appApi(`/api/musicbrainz/discography?q=${encodeURIComponent(query)}`, { signal })
          .then((data) => (Array.isArray(data?.releases) ? data.releases : []).map((r) => ({ ...r, source: "MusicBrainz", matchType: "artist" })))
          .catch((error) => {
            if (error.name === "AbortError") throw error;
            console.warn("MusicBrainz discography failed", error);
            return [];
          })
      );
    }

    tasks.push(
      appApi(`/api/musicbrainz/search?q=${encodeURIComponent(query)}`, { signal })
        .then((data) => (Array.isArray(data?.releases) ? data.releases : []).map((r) => ({ ...r, source: "MusicBrainz" })))
        .catch((error) => {
          if (error.name === "AbortError") throw error;
          console.warn("MusicBrainz release search failed", error);
          return [];
        })
    );
  }

  if (source === "all" || source === "itunes") {
    tasks.push(
      appApi(`/api/itunes/search?q=${encodeURIComponent(query)}`, { signal })
        .then((data) => (Array.isArray(data?.albums) ? data.albums : []).map((a) => ({ ...a, source: "Apple/iTunes" })))
        .catch((error) => {
          if (error.name === "AbortError") throw error;
          console.warn("Apple/iTunes search failed", error);
          return [];
        })
    );
  }

  const groups = await Promise.all(tasks);
  const raw = groups.flat();

  const sourceOrder = { MusicBrainz: 0, "Apple/iTunes": 1 };

  // Ordenar antes de deduplicar, para que la copia que se queda sea la canónica
  // de la fuente más fiable.
  raw.sort((a, b) => (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99));

  const deduped = [];
  const seen = new Map();

  for (const item of raw) {
    const artist = item.artist || artistCreditName(item["artist-credit"]);
    const key = `${normalize(item.title)}::${normalize(artist)}`;
    if (!key || key === "::") continue;

    if (!seen.has(key)) {
      const copy = { ...item, alternatives: [] };
      seen.set(key, copy);
      deduped.push(copy);
    } else {
      // El dedupe se quedó con una copia y tiró el resto. Se anota de dónde
      // venían las otras, o una fila combinada parece el único proveedor que
      // tenía el disco.
      seen.get(key).alternatives.push({
        source: item.source,
        id: item.id,
        releaseGroupId: item.releaseGroupId || null
      });
    }
  }

  // Ordenar por relevancia y no por proveedor: es lo que deja abajo a los
  // impostores que comparten título.
  const rankTarget = pair ? pair.artist : query;
  deduped.sort((a, b) => {
    const diff = metadataRelevance(b, rankTarget) - metadataRelevance(a, rankTarget);
    if (diff) return diff;
    return (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99);
  });

  return deduped;
}

/* Cada proveedor se pide primero su propia lista de canciones. Cuando lo tiene
   registrado pero no devuelve pistas, se reintenta por Apple/iTunes, que es el
   único con lookup de canciones fiable: así el usuario no tiene que escribir la
   lista a mano. */
async function autoImportSongsWithFallback({ source, data }) {
  const ownSongs = Array.isArray(data?.songs) ? data.songs : [];
  if (ownSongs.length) return { songs: ownSongs, fellBack: false };

  const artist = String(data?.artist || "").trim();
  const title = String(data?.title || "").trim();
  if (!artist || !title) return { songs: [], fellBack: false };

  try {
    const search = await appApi(`/api/itunes/search?q=${encodeURIComponent(`${artist} — ${title}`)}`);
    const candidates = Array.isArray(search?.albums) ? search.albums : [];
    const artistKey = normalize(artist);
    const titleKey = normalize(title);

    const best = candidates
      .filter((a) => a?.id)
      .map((a) => ({
        album: a,
        score:
          (normalize(a.title) === titleKey ? 2 : 0) + (normalize(a.artist) === artistKey ? 2 : 0)
      }))
      .sort(
        (a, b) => b.score - a.score || Number(b.album.trackCount || 0) - Number(a.album.trackCount || 0)
      )[0]?.album;

    if (!best?.id) return { songs: [], fellBack: false };

    const details = await appApi(`/api/itunes/album/${encodeURIComponent(best.id)}`);
    const songs = Array.isArray(details?.songs) ? details.songs : [];
    return { songs, fellBack: songs.length > 0, source };
  } catch (fallbackError) {
    console.warn(`Song fallback failed for ${source}`, fallbackError);
    return { songs: [], fellBack: false, source };
  }
}

function makeDraftSongs(tracks) {
  return (Array.isArray(tracks) ? tracks : [])
    .map((track, index) => ({
      id: uid("song"),
      title: String(track?.title || "").trim(),
      rating: 3,
      position: Number(track?.position) || index + 1
    }))
    .filter((track) => track.title)
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
}

async function importItunesAlbum(albumId) {
  const data = await appApi(`/api/itunes/album/${encodeURIComponent(albumId)}`);
  const { songs, fellBack } = await autoImportSongsWithFallback({ source: "Apple/iTunes", data });

  let coverBlob = null;
  let coverFailed = false;
  try {
    coverBlob = await fetchCoverBlob(`/api/itunes/cover/${encodeURIComponent(albumId)}`);
  } catch {
    coverFailed = true;
  }

  return {
    title: data?.title || "",
    artist: data?.artist || "Artista desconocido",
    year: data?.year || "",
    songs: makeDraftSongs(songs),
    coverBlob,
    musicbrainzId: null,
    musicbrainzReleaseGroupId: null,
    itunesId: data?.id || albumId,
    metadataSource: "Apple/iTunes",
    fellBack,
    coverFailed
  };
}

async function importMusicBrainzRelease(mbid, resultKey) {
  const data = await appApi(`/api/musicbrainz/release/${encodeURIComponent(mbid)}`);
  const musicbrainzId = data?.id || mbid;

  const tracks = [];
  let position = 0;
  for (const medium of data?.media || []) {
    for (const track of medium?.tracks || []) {
      const recording = track?.recording || {};
      tracks.push({
        title: String(track?.title || recording?.title || "").trim(),
        position: Number(track?.position || position + 1)
      });
      position++;
    }
  }

  const { songs, fellBack } = await autoImportSongsWithFallback({
    source: "MusicBrainz",
    data: {
      title: data?.title || "",
      artist: artistCreditName(data?.["artist-credit"]) || "",
      songs: tracks
    }
  });

  let coverBlob = null;
  let coverFailed = false;
  try {
    coverBlob = await fetchCoverBlob(`/api/cover-art/${encodeURIComponent(musicbrainzId)}/front-500`);
  } catch {
    coverFailed = true;
  }

  return {
    title: data?.title || "",
    artist: artistCreditName(data?.["artist-credit"]) || "Artista desconocido",
    year: data?.date ? String(data.date).slice(0, 4) : "",
    songs: makeDraftSongs(songs),
    coverBlob,
    musicbrainzId,
    musicbrainzReleaseGroupId: null,
    itunesId: null,
    metadataSource: "MusicBrainz",
    fellBack,
    coverFailed
  };
}

/* El grupo de lanzamientos es la edición canónica: primero se pide cuál es la
   buena y luego se importa esa. */
async function importMusicBrainzReleaseGroup(groupId) {
  const group = await appApi(`/api/musicbrainz/release-group/${encodeURIComponent(groupId)}`);
  if (!group?.releaseId) {
    throw new Error("No se encontró una edición de lanzamiento para ese grupo de lanzamientos.");
  }
  const releaseGroupId = group.releaseGroupId || groupId;
  const imported = await importMusicBrainzRelease(group.releaseId);
  return { ...imported, musicbrainzReleaseGroupId: releaseGroupId };
}

/* Un solo punto de entrada para las tres rutas de la lista. Devuelve los campos
   para rellenar el formulario; la UI no sabe de dónde vino cada uno. */
export async function importRelease(release) {
  if (release.source === "Apple/iTunes") {
    return { ...(await importItunesAlbum(release.id)), resultKey: metadataResultKey(release) };
  }
  if (release.releaseGroupId || release.matchType === "artist") {
    const imported = await importMusicBrainzReleaseGroup(release.releaseGroupId || release.id);
    return { ...imported, resultKey: `mb-group:${release.releaseGroupId || release.id}` };
  }
  const imported = await importMusicBrainzRelease(release.id);
  return { ...imported, resultKey: metadataResultKey(release) };
}

export const RELEASE_TYPE_LABELS = {
  live: "en vivo",
  remix: "remezcla",
  compilation: "recopilación",
  soundtrack: "banda sonora",
  spokenword: "hablado",
  interview: "entrevista",
  audiobook: "audiolibro",
  "audio drama": "audio drama",
  "dj-mix": "dj mix",
  mixtape: "mixtape",
  demo: "demo",
  tribute: "homenaje",
  split: "split"
};

/* Las etiquetas dicen una sola cosa: si esto es el disco de estudio o una de las
   cosas que comparten su título. Las secundarias llevan el lavado de acento
   porque son las que cambian lo que vas a importar. */
export function releaseTags(release) {
  const tags = [];

  for (const type of Array.isArray(release.secondaryTypes) ? release.secondaryTypes : []) {
    const key = String(type).toLowerCase();
    tags.push({ label: RELEASE_TYPE_LABELS[key] || key, variant: true });
  }

  const primary = String(release.primaryType || "").toLowerCase();
  if (primary && primary !== "album") tags.push({ label: primary });

  if (release.disambiguation) tags.push({ label: release.disambiguation });

  const elsewhere = (Array.isArray(release.alternatives) ? release.alternatives : [])
    .filter((alt) => alt.source !== release.source)
    .map((alt) => (alt.source === "Apple/iTunes" ? "iTunes" : "MB"));
  if (elsewhere.length) tags.push({ label: `también ${elsewhere.join(" + ")}` });

  return tags;
}

export function releaseFacts(release) {
  const artist =
    release.source === "MusicBrainz"
      ? artistCreditName(release["artist-credit"]) || release.artist || "Artista desconocido"
      : release.artist || "Artista desconocido";
  const title = release.title || "Sin título";
  const year = release.year
    ? String(release.year).slice(0, 4)
    : release.date
      ? String(release.date).slice(0, 4)
      : "sin año";
  return { artist, title, year, tracks: Number(release.trackCount) || 0 };
}
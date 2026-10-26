/* La copia de seguridad es la única salida del catálogo: todo vive en el
   IndexedDB de este navegador. El formato es JSON con las portadas en base64 y
   no se cambia sin motivo — una copia hecha con la versión anterior tiene que
   seguir entrando aquí. */

import { getAllAlbums, replaceAllAlbums, normalizeSong } from "./db.js";
import { normalize, uid } from "./format.js";
import { isValidRating, normalizeRating } from "./rating.js";

function blobToDataURL(blob) {
  if (!blob) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer la portada"));
    reader.readAsDataURL(blob);
  });
}

function dataURLToBlob(dataUrl) {
  if (!dataUrl) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Invalid cover data");

  const header = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  const mimeMatch = header.match(/^data:([^;]+);base64$/i);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function buildBackup() {
  const albums = await getAllAlbums();
  const exportedAlbums = [];

  for (const album of albums) {
    exportedAlbums.push({
      id: album.id,
      title: album.title,
      titleKey: album.titleKey || normalize(album.title),
      artist: album.artist,
      artistKey: album.artistKey || normalize(album.artist),
      year: album.year,
      rating: album.rating,
      musicbrainzId: album.musicbrainzId || null,
      musicbrainzReleaseGroupId: album.musicbrainzReleaseGroupId || null,
      itunesId: album.itunesId || null,
      spotifyId: album.spotifyId || null,
      // TheAudioDB ya no existe: una copia vieja que lo mencione no debe
      // seguir reclamando un proveedor con el que la app ya no habla.
      metadataSource: album.metadataSource === "TheAudioDB" ? null : album.metadataSource || null,
      songs: Array.isArray(album.songs) ? album.songs.map(normalizeSong) : [],
      createdAt: album.createdAt || Date.now(),
      updatedAt: album.updatedAt || Date.now(),
      cover: await blobToDataURL(album.cover || null)
    });
  }

  return {
    format: "albumvault-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "AlbumVault",
    albumCount: exportedAlbums.length,
    albums: exportedAlbums
  };
}

export function downloadJson(filename, payload) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function validateBackup(data) {
  if (!data || data.format !== "albumvault-backup" || !Array.isArray(data.albums)) {
    throw new Error("INVALID_BACKUP");
  }

  const seenTitles = new Set();

  return data.albums.map((raw, index) => {
    const title = String(raw.title || "").trim();
    const artist = String(raw.artist || "").trim();
    const year = Number(raw.year);
    const rating = Number(raw.rating);
    const titleKey = normalize(title);

    if (!title || !artist || !Number.isFinite(year) || year < 1 || year > 3000 || !isValidRating(rating)) {
      throw new Error(`INVALID_ALBUM_${index + 1}`);
    }

    if (seenTitles.has(titleKey)) throw new Error("DUPLICATE_BACKUP_TITLE");
    seenTitles.add(titleKey);

    return {
      id: raw.id || uid("album"),
      title,
      titleKey,
      artist,
      artistKey: normalize(artist),
      year,
      rating: normalizeRating(rating, 1),
      musicbrainzId: raw.musicbrainzId || null,
      musicbrainzReleaseGroupId: raw.musicbrainzReleaseGroupId || null,
      itunesId: raw.itunesId || null,
      spotifyId: raw.spotifyId || null,
      metadataSource: raw.metadataSource === "TheAudioDB" ? null : raw.metadataSource || null,
      songs: Array.isArray(raw.songs) ? raw.songs.map(normalizeSong) : [],
      cover: dataURLToBlob(raw.cover || null),
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Date.now()
    };
  });
}

/* Restaurar REEMPLAZA el catálogo, no lo mezcla: es una copia completa y una
   mezcla de dos catálogos solo puede tener títulos duplicados. */
export async function replaceCatalogWithBackup(data) {
  const albums = validateBackup(data);
  await replaceAllAlbums(albums);
  return albums.length;
}
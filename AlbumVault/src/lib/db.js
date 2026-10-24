/* IndexedDB. El catálogo entero vive aquí, en el navegador: el servidor es un
   proxy sin estado y nunca ve un álbum. Se conserva el nombre y la versión de
   la base anterior, así que los álbumes ya guardados sobreviven a este rewrite. */

import { uid } from "./format.js";
import { normalizeRating } from "./rating.js";

export const DB_NAME = "watched_album_catalog";
export const DB_VERSION = 2;
export const STORE = "albums";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      let store;

      if (!db.objectStoreNames.contains(STORE)) {
        store = db.createObjectStore(STORE, { keyPath: "id" });
      } else {
        store = request.transaction.objectStore(STORE);
      }

      if (!store.indexNames.contains("title")) {
        store.createIndex("title", "titleKey", { unique: true });
      }
      if (!store.indexNames.contains("artist")) {
        store.createIndex("artist", "artistKey", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllAlbums() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAlbum(album) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(album);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export async function deleteAlbumFromDb(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* Reemplaza el catálogo entero en una transacción: es lo que hace "Restaurar
   desde una copia". O se escriben todos o no se escribe ninguno. */
export async function replaceAllAlbums(albums) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    for (const album of albums) store.put(album);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Import aborted"));
  });
}

/* ---------- canciones ---------- */

export function normalizeSong(song, fallbackIndex = 0) {
  return {
    id: song?.id || uid("song"),
    title: String(song?.title || "").trim(),
    rating: normalizeRating(song?.rating, 1),
    position: Number.isFinite(song?.position) ? song.position : fallbackIndex
  };
}

export function sortSongs(songs) {
  return [...songs]
    .filter((song) => String(song.title || "").trim())
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
}

export function moveSong(songs, songId, delta) {
  const index = songs.findIndex((song) => song.id === songId);
  if (index < 0) return songs;
  const target = index + delta;
  if (target < 0 || target >= songs.length) return songs;
  const next = [...songs];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((song, i) => ({ ...song, position: i }));
}
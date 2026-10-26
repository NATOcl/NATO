/* El catálogo: la lista en memoria, la fuente de verdad en IndexedDB y el
   parcheo de los registros viejos. Es el único hook que escribe. */

import { useCallback, useEffect, useRef, useState } from "react";
import { getAllAlbums, saveAlbum, deleteAlbumFromDb, normalizeSong } from "../lib/db.js";
import { normalize } from "../lib/format.js";
import { normalizeRating } from "../lib/rating.js";

/* Migra los registros que vinieron de versiones anteriores y dice si hubo que
   escribir algo: si no, no se toca la base. Un álbum sin `songs` gana un [] y
   un `audioDbId` sobra, porque TheAudioDB ya no existe y un id que no significa
   nada solo confunde. */
function migrate(albums) {
  let migrated = false;

  const next = albums.map((album) => {
    const row = { ...album };

    row.titleKey = row.titleKey || normalize(row.title);
    row.artistKey = row.artistKey || normalize(row.artist);
    row.musicbrainzId = row.musicbrainzId || null;
    row.musicbrainzReleaseGroupId = row.musicbrainzReleaseGroupId || null;
    row.itunesId = row.itunesId || null;
    row.spotifyId = row.spotifyId || null;

    if ("audioDbId" in row) {
      delete row.audioDbId;
      migrated = true;
    }
    if (row.metadataSource === "TheAudioDB") {
      row.metadataSource = null;
      migrated = true;
    }
    row.metadataSource = row.metadataSource || null;

    if (!Array.isArray(row.songs)) {
      row.songs = [];
      migrated = true;
    }

    row.rating = normalizeRating(row.rating, 0);
    row.songs = row.songs.map(normalizeSong);
    return row;
  });

  return { albums: next, migrated };
}

export function useCatalog() {
  const [albums, setAlbums] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await getAllAlbums();
        const { albums: migratedAlbums, migrated } = migrate(rows || []);

        // Persistir la migración ligera una sola vez, para que los registros
        // viejos ganen `songs: []` de verdad y no solo en memoria.
        if (migrated) await Promise.all(migratedAlbums.map((album) => saveAlbum(album)));

        if (cancelled) return;
        setAlbums(migratedAlbums);
        setStatus("ready");
      } catch (loadError) {
        if (cancelled) return;
        console.error(loadError);
        setError(loadError);
        setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const put = useCallback(async (album) => {
    await saveAlbum(album);
    setAlbums((current) => {
      const exists = current.some((row) => row.id === album.id);
      return exists ? current.map((row) => (row.id === album.id ? album : row)) : [album, ...current];
    });
  }, []);

  const remove = useCallback(async (id) => {
    await deleteAlbumFromDb(id);
    setAlbums((current) => current.filter((row) => row.id !== id));
  }, []);

  /* Releer sin escribir: lo necesita "Restaurar desde una copia", que ya ha
     escrito la base entera por su cuenta y solo quiere que la memoria se ponga
     al día. */
  const refresh = useCallback(async () => {
    setAlbums(await getAllAlbums());
  }, []);

  return { albums, status, error, put, remove, refresh };
}
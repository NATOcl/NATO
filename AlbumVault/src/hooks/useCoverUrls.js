/* Las portadas son Blobs en IndexedDB y hay que convertirlas en object URLs para
   que el navegador las pueda pintar. Este hook es el único que llama a
   createObjectURL y el único que los revoca.

   coverUrl solo llama a createObjectURL si el valor ES un Blob: un registro
   corrupto con una cadena donde debería haber un Blob no debe dejar el catálogo
   entero en blanco, así que en ese caso se devuelve el valor tal cual. */

import { useCallback, useEffect, useRef } from "react";

export function useCoverUrls(albums) {
  const cache = useRef(new Map());
  const signature = albums
    .map((album) => `${album.id}:${album.cover instanceof Blob ? `${album.cover.size}.${album.updatedAt || 0}` : "raw"}`)
    .join("|");

  const get = useCallback((album) => {
    if (!album?.cover) return "";
    const cached = cache.current.get(album.id);
    if (cached && cached.blob === album.cover) return cached.url;

    // El disco cambió de portada: el object URL viejo ya no lo muestra nadie.
    if (cached) URL.revokeObjectURL(cached.url);

    const url = album.cover instanceof Blob ? URL.createObjectURL(album.cover) : String(album.cover);
    cache.current.set(album.id, { blob: album.cover, url });
    return url;
  }, []);

  // Reciclado: lo que desaparece del catálogo, o cuya portada ha cambiado, no
  // debe dejar un object URL vivo. Un render por cambio de catálogo: la firma
  // solo cambia cuando un disco entra, sale o cambia de portada.
  useEffect(() => {
    const alive = new Set();
    for (const album of albums) {
      alive.add(album.id);
      get(album);
    }
    for (const [id, entry] of Array.from(cache.current.entries())) {
      if (!alive.has(id)) {
        URL.revokeObjectURL(entry.url);
        cache.current.delete(id);
      }
    }
  }, [signature, albums, get]);

  // Los object URLs no se quedan colgados hasta que se cierra la página.
  useEffect(() => () => {
    for (const entry of cache.current.values()) URL.revokeObjectURL(entry.url);
    cache.current.clear();
  }, []);

  return useCallback((album) => (album ? get(album) : ""), [get]);
}
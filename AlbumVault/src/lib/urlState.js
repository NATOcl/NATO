/* El número que se escribe en la URL es el estado: recargar conserva la vista,
   Back sale de un álbum en vez de salir del sitio, y una vista se puede
   compartir. Navegar empuja historial; retocar un filtro lo reemplaza, para que
   Back no recorra veinte cambios de filtro. */

import { DEFAULT_FILTERS } from "./filters.js";
import { isValidRating } from "./rating.js";
import { SORT_CHOICES } from "./filters.js";

export function buildHash({ view, artist, albumId, filters }) {
  const parts = [];

  if (view === "artist" && artist) parts.push("artista/" + encodeURIComponent(artist));
  else if (view === "album" && albumId) parts.push("album/" + encodeURIComponent(albumId));

  const query = new URLSearchParams();
  if (filters.search) query.set("q", filters.search);
  if (filters.rating !== "all") query.set("valoracion", filters.rating);
  if (filters.decade !== "all") query.set("decada", filters.decade);
  if (filters.sort !== "year-desc") query.set("orden", filters.sort);
  if (filters.dense) query.set("densa", "1");

  const qs = query.toString();
  return "#/" + parts.join("/") + (qs ? "?" + qs : "");
}

/* Lee el hash y devuelve los filtros. Un valor que no se reconoce cae a su
   defecto en vez de dejar la lista vacía sin explicación: la década es la que
   muerde, porque un valor viejo o editado a mano es una pantalla de cero
   resultados en silencio. */
export function parseHash(hash) {
  const raw = String(hash || "").replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const steps = path.split("/").filter(Boolean);
  const params = new URLSearchParams(query || "");

  const filters = {
    ...DEFAULT_FILTERS,
    search: params.get("q") || "",
    rating: params.get("valoracion") || "all",
    decade: params.get("decada") || "all",
    sort: params.get("orden") || "year-desc",
    dense: params.get("densa") === "1",
    page: 1
  };

  if (!isValidRating(filters.rating)) filters.rating = "all";
  if (!SORT_CHOICES.some(([value]) => value === filters.sort)) filters.sort = "year-desc";
  if (filters.decade !== "all" && !/^\d{3,4}0$/.test(filters.decade)) filters.decade = "all";

  const route = { kind: "catalog", artist: null, albumId: null };
  if (steps[0] === "album" && steps[1]) {
    route.kind = "album";
    route.albumId = decodeURIComponent(steps[1]);
  } else if (steps[0] === "artista" && steps[1]) {
    route.kind = "artist";
    route.artist = decodeURIComponent(steps[1]);
  }

  return { route, filters };
}

export function sameHash(location, hash) {
  return location.hash === hash;
}

export function writeHash(hash, { replace = false } = {}) {
  const url = location.pathname + location.search + hash;
  if (replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
}
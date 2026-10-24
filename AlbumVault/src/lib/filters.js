/* Filtros, orden y paginación. Todo lo que decide qué_STOP aparece en la rejilla
   está aquí y en ningún otro sitio: la misma función alimenta el catálogo, la
   vista de artista y el panel de filtros. */

import { normalize } from "./format.js";
import { PAGE_SIZE } from "./constants.js";

/* El panel de filtros nombra la orden entera; la línea del catálogo la dice en
   tres palabras, porque es un readout y no un menú. */
export const SORT_CHOICES = [
  ["year-desc", "Año, más reciente primero", "Año ↓"],
  ["year-asc", "Año, más antiguo primero", "Año ↑"],
  ["rating-desc", "Valoración, de mayor a menor", "Valoración ↓"],
  ["rating-asc", "Valoración, de menor a mayor", "Valoración ↑"],
  ["artist-asc", "Artista, A a Z", "Artista A–Z"],
  ["artist-desc", "Artista, Z a A", "Artista Z–A"],
  ["title-asc", "Título, A a Z", "Título A–Z"],
  ["title-desc", "Título, Z a A", "Título Z–A"]
];

const ORDER_SUMMARY = {
  "year-desc": "del más nuevo al más antiguo",
  "year-asc": "del más antiguo al más nuevo",
  "rating-desc": "de mayor a menor valoración",
  "rating-asc": "de menor a mayor valoración",
  "artist-asc": "por artista, A a Z",
  "artist-desc": "por artista, Z a A",
  "title-asc": "por título, A a Z",
  "title-desc": "por título, Z a A"
};

export function orderSummary(sort) {
  return ORDER_SUMMARY[sort] || "";
}

export const DEFAULT_FILTERS = {
  search: "",
  sort: "year-desc",
  rating: "all",
  decade: "all",
  dense: false,
  page: 1
};

/* El filtro de década se construye con el catálogo delante, así que un single de
   1953 es tan alcanzable como una publicación de 2026, y las décadas sin
   álbumes no se ofrecen. */
export function decadeChoices(albums) {
  const decades = new Set();
  for (const album of albums) {
    const year = Number(album.year);
    if (Number.isFinite(year) && year >= 1000) decades.add(Math.floor(year / 10) * 10);
  }
  const list = [...decades].sort((a, b) => b - a).map((d) => [String(d), `${d}s`]);
  return [["all", "Todas"], ...list];
}

export function availableDecades(albums, selected) {
  return decadeChoices(albums).filter(
    ([value]) => value === "all" || value === selected || albums.some((a) => String(Math.floor(Number(a.year) / 10) * 10) === value)
  );
}

export function getFiltered(albums, filters) {
  let items = [...albums];
  const q = normalize(filters.search);

  if (q) {
    items = items.filter(
      (a) => normalize(a.title).includes(q) || normalize(a.artist).includes(q)
    );
  }

  if (filters.rating !== "all") {
    items = items.filter((a) => Number(a.rating) >= Number(filters.rating));
  }

  if (filters.decade !== "all") {
    items = items.filter((a) => Math.floor(Number(a.year) / 10) * 10 === Number(filters.decade));
  }

  items.sort((a, b) => {
    switch (filters.sort) {
      case "year-asc":
        return a.year - b.year || a.title.localeCompare(b.title, "es");
      case "rating-desc":
        return b.rating - a.rating || b.year - a.year;
      case "rating-asc":
        return a.rating - b.rating || b.year - a.year;
      case "artist-asc":
        return a.artist.localeCompare(b.artist, "es") || a.title.localeCompare(b.title, "es");
      case "artist-desc":
        return b.artist.localeCompare(a.artist, "es") || a.title.localeCompare(b.title, "es");
      case "title-asc":
        return a.title.localeCompare(b.title, "es");
      case "title-desc":
        return b.title.localeCompare(a.title, "es");
      case "year-desc":
      default:
        return b.year - a.year || a.title.localeCompare(b.title, "es");
    }
  });

  return items;
}

export function artistAlbums(albums, artistKey) {
  return albums
    .filter((a) => a.artistKey === artistKey)
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, "es"));
}

/* Cuántos filtros están de verdad estrechando la lista. El trigger cuenta esto
   y no "cuántos valores hay escritos", porque un filtro puesto en su valor por
   defecto no está filtrando nada. */
export function activeFilterCount(filters) {
  return [
    filters.rating !== "all",
    filters.decade !== "all",
    filters.sort !== "year-desc",
    Boolean(filters.search)
  ].filter(Boolean).length;
}

export function pageSlice(items, page) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * PAGE_SIZE;
  return { pageItems: items.slice(start, start + PAGE_SIZE), totalPages, page: current };
}

/* Menos de ocho páginas se numeran enteras; con más se recortan los extremos. */
export function pageWindow(totalPages, page) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  return [1, 2, 3, 4, 5, "gap", totalPages - 1, totalPages];
}
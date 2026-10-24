/* Claves y texto. `normalize()` es la función de la que depende medio catálogo:
   es la clave del índice único de títulos, la que decide si dos Browne son el
   mismo artista y la que hace que "parallel   LINES" colisione con
   "Parallel Lines". No colapsa espacios internos a propósito: cambiar la clave
   obligaría a reescribir todos los titleKey guardados. */

export function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function uid(prefix = "id") {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollBehavior() {
  return prefersReducedMotion() ? "auto" : "smooth";
}

export function formatCount(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}
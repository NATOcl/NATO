/* Valoraciones: medio paso, y solo medio paso. Este fichero es la única fuente
   de la aritmética — validarla, formatearla y pintar el relleno parcial. Un
   cuarto control de valoración que se.Calcule lo suyo es un bug, no una variante. */

export function normalizeRating(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (number === 0 && fallback === 0) return 0;
  return Math.max(0.5, Math.min(5, Math.round(number * 2) / 2));
}

export function isValidRating(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0.5 && number <= 5 && Number.isInteger(number * 2);
}

export function formatRating(value) {
  const rating = normalizeRating(value, 0);
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

/* El relleno de una estrella suelta: 0-100. */
export function starFill(score, starIndex) {
  return Math.max(0, Math.min(1, score - (starIndex - 1))) * 100;
}

/* El relleno de una barra de cinco estrellas: 0-100 sobre el ancho entero. */
export function barFill(score) {
  return (Math.max(0, Math.min(5, score)) / 5) * 100;
}

/* El hit-test de media estrella, compartido por los tres controles (formulario,
   ficha de álbum y filtro). La mitad izquierda de la estrella N es N - 0,5 y la
   derecha es N; se divide el rectángulo propio en cinco, así que el control no
   puede llevar ningún transform encima (lo mueve en el instante de elegir). */
export function ratingFromPointer(element, clientX) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0) return 0;

  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const starWidth = rect.width / 5;
  const index = Math.min(5, Math.floor(x / starWidth) + 1);
  const within = x - starWidth * (index - 1);
  return normalizeRating(index - (within < starWidth / 2 ? 0.5 : 0), 0);
}

/* El teclado usa los mismos diez pasos que el ratón. */
export function ratingFromKey(key, current) {
  const step =
    key === "ArrowLeft" || key === "ArrowDown" ? -0.5
      : key === "ArrowRight" || key === "ArrowUp" ? 0.5
        : 0;
  const jump = /^[1-5]$/.test(key) ? Number(key) : 0;

  if (!step && !jump && key !== "Home" && key !== "End") return null;
  if (key === "Home") return 0.5;
  if (key === "End") return 5;
  if (jump) return jump;
  return Math.max(0.5, Math.min(5, (Number(current) || 0.5) + step));
}

export function ratingText(rating) {
  return rating ? `${formatRating(rating)} de 5` : "Sin valorar";
}
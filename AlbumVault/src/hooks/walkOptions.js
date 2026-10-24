/* Recorre un radiogroup con las flechas, que es justo para lo que existen. Lo
   comparten el panel de filtros y el menú de tema: el conjunto de opciones es el
   grupo etiquetado más cercano, o el panel entero si no tiene subgrupos. Sin
   esto las opciones de tema son solo de ratón. */

export function walkOptions(event) {
  if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) return;

  const group = event.target.closest("[data-filter-group]") || event.target.closest("[data-dropdown]");
  if (!group) return;

  const options = [...group.querySelectorAll('[role="radio"], [role="menuitemradio"]')];
  const index = options.indexOf(event.target);
  if (index < 0) return;

  event.preventDefault();
  event.stopPropagation();
  const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
  const next = options[(index + (forward ? 1 : options.length - 1)) % options.length];
  next.focus();
  next.click();
}
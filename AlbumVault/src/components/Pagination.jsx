/* Los botones de la paginación. El contenedor con la clase `.pager` lo pone la
   vista (`.pager button` y `.pager .gap` son los selectores del CSS), así que
   aquí solo viven los botones. */

import { pageWindow } from "../lib/filters.js";

export default function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  return (
    <>
      {pageWindow(totalPages, page).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="gap x-grid x-place-items-center" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={entry}
            onClick={() => onPage(entry)}
            aria-current={entry === page ? "page" : undefined}
            aria-label={`Página ${entry}`}
          >
            {entry}
          </button>
        )
      )}
    </>
  );
}
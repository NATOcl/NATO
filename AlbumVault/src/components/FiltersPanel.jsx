/* Un panel, tres escalas y un reset. El trigger cuenta cuántas están de verdad
   estrechando la lista, porque "Valoración: todas · Década: todas" en dos
   readouts distintos no era la forma de nadie de mostrar el estado.

   El filtro de valoración ES la escala de estrellas de la app, no una lista de
   números: mismo control y misma aritmética que el formulario y la ficha. Cinco
   estrellas (una por punto entero) más la cifra a la derecha ("3,5 o más"), que
   es lo único que dice *mínimo*.

   Dos reglas de foco que costaron sangre antes:
   1. La escala se pinta en sitio. Si el panel se re-renderizara al cambiar el
      umbral, el nodo en el que está el teclado desaparecería y las flechas
      funcionarían una vez y pararían.
   2. Los chips de década, orden y el switch sí se regeneran, así que al elegir
      hay que devolver el foco al mismo valor. Y si ese nodo ya no existe —el
      chip "Sin mínimo" desaparece al pulsarlo, el pie entero se va cuando no
      queda nada que restablecer— el foco pasa al trigger, o cae en <body> y Tab
      rehace la página desde arriba. */

import { useEffect, useRef } from "react";
import StarPicker from "./StarPicker.jsx";
import { walkOptions } from "../hooks/walkOptions.js";
import { useDropdown } from "../hooks/useDropdown.js";
import { availableDecades, SORT_CHOICES } from "../lib/filters.js";
import { formatRating } from "../lib/rating.js";

export default function FiltersPanel({ albums, filters, activeCount, onFilter, onToggleDense, onReset }) {
  const { panelRef, triggerRef, open, toggle } = useDropdown({ role: "dialog" });
  const decades = availableDecades(albums, filters.decade);
  const threshold = filters.rating === "all" ? 0 : Number(filters.rating);
  const thresholdText = threshold ? `${formatRating(threshold)} o más` : "Sin mínimo";

  // Qué nodo tiene que recuperar el foco tras el próximo render del panel.
  const wanted = useRef(null);

  useEffect(() => {
    const key = wanted.current;
    wanted.current = null;
    if (!key) return;

    const target = panelRef.current?.querySelector(key);
    // Si el nodo ya no existe (un chip que se acaba de ir), al trigger.
    (target || triggerRef.current)?.focus({ preventScroll: true });
  });

  const pick = (name, value) => {
    // La escala y su "Sin mínimo" se pintan en sitio, sin re-render del panel:
    // si no, el nodo en el que está el teclado desaparecería.
    if (name !== "rating") wanted.current = `[data-group="${name}"][data-value="${value}"]`;
    onFilter(name, value);
  };

  return (
    <div className="x-relative">
      <button
        ref={triggerRef}
        id="filtersToggle"
        className="toggle"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="filtersMenu"
      >
        Filtros <span id="filterCount" className="filter-count" hidden={activeCount === 0}>{activeCount}</span>
        <span className="caret" aria-hidden="true">▼</span>
      </button>

      <div
        ref={panelRef}
        id="filtersMenu"
        className={`av-dropdown filter-panel${open ? "" : " x-hidden"}`}
        data-dropdown="filters"
        role="dialog"
        aria-label="Filtros del catálogo"
        onKeyDown={walkOptions}
      >
        <div className="filter-row">
          <div className="filter-head">
            <h3 className="filter-label" id="ratingGroupLabel">Valoración mínima</h3>
            <button
              type="button"
              role="radio"
              className="filter-chip filter-chip-clear"
              id="ratingClear"
              aria-checked={threshold === 0}
              data-filter="rating"
              data-group="rating"
              data-value="all"
              hidden={threshold === 0}
              onClick={() => {
                // Al pulsarlo desaparece (ya no hay umbral que quitar): el foco
                // lo recoge el efecto y lo pasa al trigger.
                wanted.current = '[data-group="rating"][data-value="all"]';
                onFilter("rating", "all");
              }}
            >
              Sin mínimo
            </button>
          </div>
          <div className="filter-rowline">
            <StarPicker
              id="ratingScale"
              value={threshold}
              onChange={(rating) => onFilter("rating", rating ? String(rating) : "all")}
              className="filter-scale"
              wrapped
              labelledBy="ratingGroupLabel"
              ariaValueText={thresholdText}
            />
            <span id="filterRatingReadout" className="filter-readout" data-empty={threshold ? "false" : "true"} aria-hidden="true">
              {thresholdText}
            </span>
          </div>
        </div>

        <div className="filter-row">
          <h3 className="filter-label" id="decadeGroupLabel">Década</h3>
          <div className="chip-grid" role="radiogroup" aria-labelledby="decadeGroupLabel" data-filter-group="decade">
            {decades.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                className="filter-chip"
                aria-checked={value === filters.decade}
                data-filter="decade"
                data-group="decade"
                data-value={value}
                onClick={() => pick("decade", value)}
              >
                {value === "all" ? "Todas" : label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <h3 className="filter-label" id="sortGroupLabel">Orden</h3>
          <div className="chip-grid chip-grid-2" role="radiogroup" aria-labelledby="sortGroupLabel" data-filter-group="sort">
            {SORT_CHOICES.map(([value, long, short]) => (
              <button
                key={value}
                type="button"
                role="radio"
                className="filter-chip"
                aria-checked={value === filters.sort}
                data-filter="sort"
                data-group="sort"
                data-value={value}
                title={long}
                onClick={() => pick("sort", value)}
              >
                {short}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <button
            type="button"
            className="switch-row"
            id="densityToggle"
            aria-pressed={filters.dense}
            onClick={() => {
              wanted.current = "#densityToggle";
              onToggleDense();
            }}
          >
            <span>Más portadas por fila</span>
            <span className="switch-box" aria-hidden="true" />
          </button>
        </div>

        <div className="filter-foot" hidden={activeCount === 0}>
          <button
            type="button"
            className="filter-reset"
            id="filterReset"
            onClick={() => {
              wanted.current = "#filterReset";
              onReset();
            }}
          >
            Restablecer filtros
          </button>
        </div>
      </div>
    </div>
  );
}
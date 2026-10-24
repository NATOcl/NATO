/* El puntero de un control de valoración. Los tres (formulario, ficha y filtro)
   comparten el mismo hit-test de media estrella y el mismo teclado de diez pasos;
   lo único que cambia es qué se pinta mientras el puntero pasa por encima.

   El nodo se guarda en un ref y no en estado a propósito: montarlo no debe
   provocar un segundo render, y el closure de los handlers ya lo ve fresco. */

import { useCallback, useRef, useState } from "react";
import { ratingFromKey, ratingFromPointer } from "../lib/rating.js";

export function useRatingPointer({ value, onChange, onPreview }) {
  const [preview, setPreview] = useState(null);
  const node = useRef(null);
  const bindRef = useCallback((element) => { node.current = element; }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
    onPreview?.(null);
  }, [onPreview]);

  const handlers = {
    ref: bindRef,

    onPointerMove(event) {
      // En táctil no hay hover: el puntero se apoya al tocar y así se movería
      // la barra bajo el dedo.
      if (event.pointerType === "touch") return;
      const next = ratingFromPointer(node.current, event.clientX);
      if (!next) return;
      setPreview(next);
      onPreview?.(next);
    },

    onPointerLeave: clearPreview,

    onPointerDown(event) {
      event.preventDefault();
      node.current?.focus();
      const next = ratingFromPointer(node.current, event.clientX);
      if (!next) return;
      clearPreview();
      onChange(next);
    },

    onKeyDown(event) {
      const next = ratingFromKey(event.key, preview ?? value);
      if (next === null) return;
      event.preventDefault();
      clearPreview();
      onChange(next);
    },

    onBlur: clearPreview
  };

  return { handlers, preview, shown: preview ?? (Number(value) || 0) };
}
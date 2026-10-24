/* La barra de una canción ES el control de valoración: su longitud es la nota y
   se pulsa para puntuarla, con fantasma al pasar por encima. Se comparte entre
   el modal y la ficha de álbum para que una canción se valore igual de bien
   donde aparezca.

   El relleno sale de barFill() y de nada más. */

import { useState } from "react";
import { barFill, ratingText } from "../lib/rating.js";
import { useRatingPointer } from "../hooks/useRatingPointer.js";

export default function RatingBar({ value, onChange, label }) {
  const score = Number(value) || 0;
  const [ghost, setGhost] = useState(null);
  const { handlers } = useRatingPointer({
    value: score,
    onChange,
    onPreview: setGhost
  });

  return (
    <span
      {...handlers}
      className="track-scale"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={score}
      aria-valuetext={ratingText(score)}
    >
      <span className="track-track" aria-hidden="true" />
      <span
        className="track-ghost"
        aria-hidden="true"
        style={{ width: `${barFill(ghost ?? score)}%` }}
      />
      <span className="track-fill" aria-hidden="true" style={{ width: `${barFill(score)}%` }} />
    </span>
  );
}
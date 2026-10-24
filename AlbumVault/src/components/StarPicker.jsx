/* Las cinco estrellas de un control de valoración: el del formulario, el de la
   ficha de álbum y la escala del panel de filtros. Es un `role="slider"` con
   diez pasos, no diez botones, y su relleno sale de starFill() como todo lo
   demás. Nada de transform en este elemento: el hit-test divide su propio
   rectángulo en cinco mientras el puntero está pulsado.

   `wrapped` es el único motivo por el que este componente tiene dos formas: el
   picker es inline-flex con las estrellas como hijos directos y 1px de gap,
   mientras que la escala del filtro necesita un `.filter-stars` intermedo para
   que cada estrella ocupe un quinto exacto. El CSS de las dos formas no se
   parece en nada. */

import { useRatingPointer } from "../hooks/useRatingPointer.js";
import { ratingText, starFill } from "../lib/rating.js";

export default function StarPicker({
  id,
  value,
  onChange,
  className = "star-picker",
  wrapped = false,
  label,
  labelledBy,
  describedBy,
  ariaValueText
}) {
  const { handlers, shown } = useRatingPointer({ value, onChange });
  const score = Number(value) || 0;

  const stars = [1, 2, 3, 4, 5].map((index) => (
    <span
      key={index}
      className="star"
      data-star-index={index}
      style={{ "--fill": `${starFill(shown, index)}%` }}
    >
      ★
    </span>
  ));

  return (
    <div
      {...handlers}
      id={id}
      className={className}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={score}
      aria-valuetext={ariaValueText ?? ratingText(score)}
    >
      {wrapped ? <span className="filter-stars" aria-hidden="true">{stars}</span> : stars}
    </div>
  );
}
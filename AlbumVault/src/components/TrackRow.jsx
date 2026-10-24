/* La única fila de canción de la app. El modal y la ficha de álbum renderizan
   este mismo componente, así que una canción se comporta igual donde aparezca:
   escribe el título, pulsa la barra o usa las flechas sobre ella, reordena con
   las flechas de al lado.

   El drag-and-drop HTML5 se eliminó: nunca funcionó en táctil y dos formas de
   reordenar una lista es peor que una que funciona en todas partes. */

import RatingBar from "./RatingBar.jsx";
import { formatRating, normalizeRating } from "../lib/rating.js";

export default function TrackRow({ song, index, total, onChange, onRemove, onMove, autoFocus }) {
  const title = String(song.title || "");
  const score = normalizeRating(song.rating, 1);
  const name = title.trim() || `canción ${index + 1}`;

  return (
    <div className="track-row">
      <span className="track-rank">{index + 1}</span>

      <div className="track-main">
        <input
          className="track-name"
          value={title}
          onChange={(event) => onChange(index, { title: event.target.value })}
          placeholder="Título de la canción"
          maxLength={160}
          aria-label={`Título de la canción ${index + 1}`}
          autoFocus={autoFocus}
        />
        <RatingBar
          value={score}
          label={`Valoración de «${name}»`}
          onChange={(rating) => onChange(index, { rating })}
        />
      </div>

      <span className="track-score">{formatRating(score)}</span>

      <span className="track-tools">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          aria-label={`Subir «${name}»`}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          aria-label={`Bajar «${name}»`}
        >
          ↓
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => onRemove(index)}
          aria-label={`Quitar «${name}» de la lista`}
        >
          ×
        </button>
      </span>
    </div>
  );
}
/* La ficha de álbum. La lista de canciones se edita en el sitio y la barra es el
   control de valoración, así que valorar una canción es un clic donde ya lo estás
   leyendo. La nota del álbum funciona igual, y un único "Guardar cambios"
   commitea las dos cosas: dos escrituras sueltas sobre el mismo registro son
   exactamente cómo se produce un álbum a medias. */

import { useState } from "react";
import Breadcrumb from "./Breadcrumb.jsx";
import StarPicker from "./StarPicker.jsx";
import TrackList from "./TrackList.jsx";
import { formatRating, normalizeRating } from "../lib/rating.js";
import { normalizeSong, sortSongs } from "../lib/db.js";
import { uid } from "../lib/format.js";

/* ¿Hay algo distinto de lo que se guardó? Se compara por posición y no por id:
   mover una canción ya es un cambio, aunque el conjunto sea el mismo. */
function detailIsDirty({ rating, songs, saved }) {
  if (rating !== saved.rating) return true;
  const savedSongs = saved.songs || [];
  if (savedSongs.length !== songs.length) return true;
  return songs.some((song, index) => {
    const other = savedSongs[index];
    return !other
      || song.title.trim() !== String(other.title || "").trim()
      || normalizeRating(song.rating, 0) !== normalizeRating(other.rating, 0);
  });
}

export default function AlbumDetail({ album, coverUrl, onCatalog, onArtist, onEdit, onSave }) {
  const initialSongs = () =>
    (album.songs || []).map(normalizeSong).sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));

  const [rating, setRating] = useState(() => normalizeRating(album.rating, 0));
  const [songs, setSongs] = useState(initialSongs);
  const [focusToken, setFocusToken] = useState(0);
  const [saving, setSaving] = useState(false);

  // Lo que se guardó por última vez: es contra esto contra lo que se compara el
  // borrador para saber si hay algo sin guardar. Se inicializa con el estado del
  // disco, no con un vacío: si no, "Guardar cambios" aparecería encendido al abrir
  // una ficha que no tiene nada pendiente.
  const [saved, setSaved] = useState(() => ({
    rating: normalizeRating(album.rating, 0),
    songs: initialSongs().map((song) => ({ ...song }))
  }));

  const dirty = detailIsDirty({ rating, songs, saved });

  const addTrack = () => {
    setSongs((current) => [...current, { id: uid("song"), title: "", rating: 3, position: current.length }]);
    setFocusToken((token) => token + 1);
  };

  const commit = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const ordered = sortSongs(
      songs.map((song, index) => ({
        id: song.id || uid("song"),
        title: String(song.title || "").trim(),
        rating: normalizeRating(song.rating, 1),
        position: index
      }))
    );
    const ratingChanged = rating !== saved.rating;
    const songsChanged = detailIsDirty({ rating: saved.rating, songs, saved });

    await onSave({ rating, songs: ordered }, { ratingChanged, songsChanged });

    // Tras guardar el borrador ES lo guardado: el botón se apaga solo.
    setSaved({ rating, songs: ordered.map((song) => ({ ...song })) });
    setSaving(false);
  };

  const count = songs.length;

  return (
    <section id="albumView" className="fade-in">
      <div className="viewbar">
        <Breadcrumb
          id="detailCrumb"
          steps={[
            { label: "Catálogo", onClick: onCatalog },
            { label: album.artist, onClick: () => onArtist(album.artist) },
            { label: album.title, current: true }
          ]}
        />
        <p id="detailMeta" className="view-count">
          <span className="count-num">{count}</span> {count === 1 ? "canción" : "canciones"}
        </p>
      </div>

      <div className="x-grid x-gap-8 md:x-grid-artist md:x-gap-12">
        <div id="detailCover">
          {coverUrl ? (
            <img src={coverUrl} alt={`Portada de ${album.title}, de ${album.artist}`} className="x-h-full x-w-full x-object-cover" />
          ) : (
            <span className="sleeve-blank" aria-hidden="true" />
          )}
        </div>

        <div className="x-min-w-0">
          <h1 id="detailAlbumTitle" className="detail-title">{album.title}</h1>
          <button id="detailArtistButton" className="x-mt-2 x-t-14 text-muted hover:x-text-ink" onClick={() => onArtist(album.artist)}>
            {album.artist}
          </button>

          {/* La nota del álbum se edita aquí, donde se lee. Diez medios pasos
              como el formulario, mismo hit-test. */}
          <div className="x-mt-8 x-flex x-flex-wrap x-items-center x-gap-x-8 x-gap-y-2">
            <StarPicker
              id="detailStars"
              value={rating}
              onChange={setRating}
              className="star-picker star-picker-lg"
              label="Valoración del álbum"
            />
            <p id="detailRatingReadout" className="detail-value" data-empty={rating ? "false" : "true"}>
              {rating ? `${formatRating(rating)} / 5` : "Sin valorar"}
            </p>
          </div>
          <p className="form-hint">Clic en la mitad izquierda de una estrella para bajar medio punto.</p>

          <div className="x-mt-6 x-flex x-flex-wrap x-items-center x-gap-x-6 x-gap-y-1 x-t-12-5 text-muted">
            <span id="detailYear">{album.year}</span>
          </div>

          <button id="editAlbumDetail" className="av-btn x-mt-7" onClick={() => onEdit(album.id)}>
            Editar título, portada y año
          </button>
        </div>
      </div>

      <div className="x-mt-14 x-border-t border-line x-pt-7">
        <div className="x-flex x-flex-wrap x-items-baseline x-justify-between x-gap-x-6 x-gap-y-2 x-pb-4">
          <h2 className="block-title">De la favorita a la menos favorita</h2>
          <p className="x-t-12 text-muted">Pulsa la barra para valorar de 0,5 a 5. Con el teclado, las flechas izquierda y derecha.</p>
        </div>

        <div id="trackList">
          <TrackList
            songs={songs}
            onChange={setSongs}
            focusToken={focusToken}
            emptyNode={
              <div className="track-empty">
                <p>Este álbum no tiene canciones.</p>
                <p className="hint">Pulsa «Añadir canción» para escribirlas y puntuarlas una a una.</p>
              </div>
            }
          />
        </div>

        <div className="detail-save">
          <div className="x-flex x-flex-wrap x-items-center x-gap-2">
            <button id="addTrackButton" className="av-btn" onClick={addTrack}>Añadir canción</button>
            <button id="detailSave" className="av-btn av-btn-primary" disabled={!dirty || saving} onClick={commit}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
          <p id="detailDirty" className="detail-dirty" hidden={!dirty}>Cambios sin guardar</p>
        </div>
      </div>
    </section>
  );
}
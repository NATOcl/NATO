/* Una tarjeta del catálogo: la portada es el botón de abrir, el título también,
   y el pie lleva la nota, el año, las canciones y las dos acciones. La portada
   es lo único que no tiene texto, así que su aria-label es lo único que anuncia
   el álbum. */

import { formatRating } from "../lib/rating.js";

export default function AlbumCard({ album, index, showArtist = true, coverUrl, onOpen, onArtist, onEdit, onDelete }) {
  const songs = (album.songs || []).length;
  const label = `Abrir ${album.title}, de ${album.artist}`;

  return (
    <article className="album-card x-min-w-0" style={{ "--i": Math.min(index, 14) }}>
      <button
        className="sleeve"
        onClick={() => onOpen(album.id)}
        title={`Abrir ${album.title}`}
        aria-label={label}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={`Portada de ${album.title}, de ${album.artist}`} loading="lazy" />
        ) : (
          <span className="sleeve-blank" aria-hidden="true" />
        )}
      </button>

      <button className="album-title" onClick={() => onOpen(album.id)} title={album.title} aria-label={label}>
        {album.title}
      </button>

      {showArtist ? (
        <button
          className="album-artist"
          onClick={() => onArtist(album.artist)}
          title={`Ver los álbumes de ${album.artist}`}
          aria-label={`Ver los álbumes de ${album.artist}`}
        >
          {album.artist}
        </button>
      ) : null}

      <div className="album-foot">
        <span className="score">{formatRating(album.rating)}</span>
        <span>{album.year}</span>
        <span className="album-foot-meta">
          {songs} {songs === 1 ? "canción" : "canciones"}
        </span>
        <span className="album-actions">
          <button onClick={() => onEdit(album.id)}>Editar</button>
          <button className="danger" onClick={() => onDelete(album.id)}>Eliminar</button>
        </span>
      </div>
    </article>
  );
}
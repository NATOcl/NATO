/* La vista de artista: la lista de sus álbumes con la media de valoración. El
   promedio solo dice lo que promedió: una media sobre álbumes sin valorar es una
   mentira, así que al lado se dice cuántos estaban valorados. */

import AlbumCard from "./AlbumCard.jsx";
import Breadcrumb from "./Breadcrumb.jsx";
import { formatRating } from "../lib/rating.js";

export default function ArtistView({ artist, albums, coverUrl, onOpen, onEdit, onDelete, onCatalog }) {
  const avg = albums.reduce((sum, album) => sum + Number(album.rating), 0) / albums.length;
  const rated = albums.filter((album) => Number(album.rating) > 0).length;

  return (
    <section id="artistView" className="fade-in">
      <div className="viewbar">
        <Breadcrumb
          steps={[
            { label: "Catálogo", onClick: onCatalog },
            { label: artist, current: true }
          ]}
        />
        <p id="artistMeta" className="view-count">
          <span className="count-num">{albums.length}</span> {albums.length === 1 ? "álbum" : "álbumes"}
        </p>
      </div>

      <h1 id="artistName" className="x-sr-only">{artist}</h1>

      <dl className="stat-strip">
        <div className="stat">
          <dt>Álbumes</dt>
          <dd id="artistCount">{albums.length}</dd>
        </div>
        <div className="stat">
          <dt>Valoración media</dt>
          <dd id="artistAvg">{formatRating(avg)}</dd>
          <p id="artistAvgNote" className="stat-note">
            {albums.length === rated ? "de todos los álbumes" : `solo de ${rated} de ${albums.length} valorados`}
          </p>
        </div>
      </dl>

      <div id="artistGrid" className="grid-covers x-mt-12">
        {albums.map((album, index) => (
          <AlbumCard
            key={album.id}
            album={album}
            index={index}
            showArtist={false}
            coverUrl={coverUrl(album)}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
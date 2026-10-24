/* La vista del catálogo: la barra de la vista, la rejilla, el estado vacío y la
   paginación. El contador dice el catálogo entero y, cuando está estrechado, el
   resultado de estrecharlo: "N de M" sin más es un callejón sin salida. */

import AlbumCard from "./AlbumCard.jsx";
import Pagination from "./Pagination.jsx";
import { orderSummary } from "../lib/filters.js";
import { scrollBehavior } from "../lib/format.js";

export default function CatalogView({
  albums,
  items,
  page,
  totalPages,
  artists,
  sort,
  entered,
  isNarrowed,
  coverUrl,
  onPage,
  onOpen,
  onArtist,
  onEdit,
  onDelete,
  onAdd,
  onResetFilters
}) {
  const filtered = items.length;
  const hasResults = filtered > 0;
  const hasAlbums = albums.length > 0;

  return (
    <section id="catalogView" className="fade-in">
      <div className="viewbar">
        <nav className="crumb" aria-label="Ruta de navegación">
          <span className="crumb-root">Catálogo</span>
        </nav>
        <p id="summary" className="view-count" aria-live="polite">
          {isNarrowed ? (
            <>
              <span className="count-num">{filtered}</span> de {albums.length}
            </>
          ) : (
            <span className="count-num">{albums.length}</span>
          )}{" "}
          {albums.length === 1 ? "álbum" : "álbumes"}
          <span className="sep"> / </span>
          {artists} {artists === 1 ? "artista" : "artistas"}
          <span className="sep"> / </span>
          {orderSummary(sort)}
        </p>
      </div>

      <div id="grid" className={`grid-covers${entered ? " grid-enter" : ""}`}>
        {items.map((album, index) => (
          <AlbumCard
            key={album.id}
            album={album}
            index={index}
            coverUrl={coverUrl(album)}
            onOpen={onOpen}
            onArtist={onArtist}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div id="emptyState" className="empty" hidden={hasResults}>
        <div className="empty-sleeve" aria-hidden="true" />
        <h2 id="emptyTitle">{hasAlbums ? "Nada coincide" : "Tu catálogo está vacío"}</h2>
        <p id="emptyText">
          {hasAlbums
            ? `Hay ${albums.length} ${albums.length === 1 ? "álbum" : "álbumes"} en el catálogo. Prueba con otras palabras o quita los filtros.`
            : "Busca un álbum por su nombre en MusicBrainz o Apple/iTunes, o escríbelo tú mismo."}
        </p>
        <div className="x-flex x-flex-wrap x-items-center x-gap-2">
          <button className="av-btn av-btn-primary" onClick={onAdd}>Añadir álbum</button>
          <button className="av-btn" hidden={!isNarrowed} onClick={onResetFilters}>Restablecer filtros</button>
        </div>
      </div>

      <div id="pagination" className="pager">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={(next) => {
            onPage(next);
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
          }}
        />
      </div>
    </section>
  );
}
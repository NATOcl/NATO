/* Los resultados de la búsqueda de metadatos. Cada fila es un botón: la lista es
   un solo tab stop, no uno por resultado, porque las flechas la recorren y
   envuelven por los dos extremos como debe ser una lista más larga que la
   ventana.

   El esqueleto no es decoración: es lo que se ve mientras los proveedores
   contestan, y lo que sustituye el primer render que venga detrás haya filas o
   no. Una búsqueda que vuelve vacía no deja nada detrás. */

import { useEffect, useRef } from "react";
import { metadataResultKey, releaseFacts, releaseTags } from "../lib/metadata.js";

function SkeletonRow() {
  return (
    <div className="metadata-slot is-loading" role="listitem" aria-hidden="true">
      <div className="metadata-skeleton">
        <span className="sk sk-thumb" />
        <span className="metadata-body">
          <span className="sk sk-line sk-line-sk" />
          <span className="sk sk-line sk-line-meta" />
        </span>
        <span className="sk sk-line-src" />
        <span />
      </div>
    </div>
  );
}

export default function MetadataResults({
  results,
  loading,
  chosenKey,
  onChoose,
  listRef,
  busy
}) {
  const firstRender = useRef(true);

  // Al abrir la banda de importación hay quetraerla a la vista: en un portátil
  // el esqueleto cae justo bajo el pliegue y el único indicio de que ha pasado
  // algo es el botón que dice "Buscando…".
  useEffect(() => {
    if (firstRender.current) return;
    listRef.current?.scrollIntoView({ block: "nearest" });
  }, [results, loading, listRef]);

  return (
    <div
      id="mbResults"
      className="metadata-list"
      role="list"
      aria-label="Resultados de la búsqueda"
      aria-busy={busy ? "true" : undefined}
      hidden={!loading && !results.length}
      ref={listRef}
      onKeyDown={(event) => {
        const rows = [...event.currentTarget.querySelectorAll(".metadata-result")];
        const current = rows.indexOf(document.activeElement);
        if (!rows.length || current < 0) return;

        let next = -1;
        if (event.key === "ArrowDown") next = current === rows.length - 1 ? 0 : current + 1;
        else if (event.key === "ArrowUp") next = current === 0 ? rows.length - 1 : current - 1;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = rows.length - 1;
        if (next < 0) return;

        event.preventDefault();
        rows[next].focus();
      }}
    >
      {loading
        ? Array.from({ length: 4 }, (_, index) => <SkeletonRow key={`sk-${index}`} />)
        : results.map((release, index) => (
          <MetadataRow
            key={metadataResultKey(release)}
            release={release}
            index={index}
            chosen={chosenKey === metadataResultKey(release)}
            disabled={busy}
            onChoose={onChoose}
          />
        ))}
    </div>
  );
}

function MetadataRow({ release, index, chosen, disabled, onChoose }) {
  const { artist, title, year, tracks } = releaseFacts(release);
  const tags = releaseTags(release);
  const key = metadataResultKey(release);

  return (
    <div className="metadata-slot" role="listitem" style={{ "--index": Math.min(index, 10) }}>
      <button
        type="button"
        className="metadata-result"
        data-key={key}
        aria-current={chosen ? "true" : "false"}
        disabled={disabled}
        title={`${title} — ${artist}, ${year}`}
        onClick={() => onChoose(release)}
      >
        <span className={`metadata-thumb${release.coverUrl ? "" : " is-blank"}`} aria-hidden="true">
          {/* Exactamente un hijo del pulgar, siempre: la imagen o nada. El disco
              vacío es CSS, no un nodo suelto que descuadre la rejilla de tres. */}
          {release.coverUrl ? (
            <img
              className="metadata-cover"
              src={release.coverUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.remove();
                event.currentTarget.parentElement?.classList.add("is-blank");
              }}
            />
          ) : null}
        </span>

        <span className="metadata-body">
          <span className="metadata-title">{title}</span>
          <span className="metadata-line">
            {artist} · {year}
            {tracks ? <> · <span className="num">{tracks}</span> {tracks === 1 ? "canción" : "canciones"}</> : null}
          </span>
          {tags.length ? (
            <span className="metadata-tags">
              {tags.map((tag, tagIndex) => (
                <span key={`${tag.label}-${tagIndex}`} className="metadata-tag" data-kind={tag.variant ? "variant" : undefined}>
                  {tag.label}
                </span>
              ))}
            </span>
          ) : null}
        </span>

        <span className="metadata-src">{release.source === "Apple/iTunes" ? "Apple/iTunes" : "MusicBrainz"}</span>
        <span className="metadata-go" aria-hidden="true">{chosen ? "✓" : "→"}</span>
      </button>
    </div>
  );
}
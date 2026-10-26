/* El modal de alta y edición, en el mismo componente: son el mismo formulario con
   un álbum precargado o sin ninguno. Tres bloques en el orden en que se hace la
   tarea — la portada, los créditos y el contenido — y luego la importación de la
   API a todo el ancho. La acción de guardar vive FUERA del scroller para que sea
   un clic en un móvil y nunca se vaya de pantalla en un portátil. */

import { useEffect, useRef, useState } from "react";
import StarPicker from "./StarPicker.jsx";
import TrackList from "./TrackList.jsx";
import MetadataResults from "./MetadataResults.jsx";
import { formatRating, isValidRating, normalizeRating } from "../lib/rating.js";
import { normalize, scrollBehavior, uid } from "../lib/format.js";
import { filteredMetadataResults, importRelease, searchMetadata } from "../lib/metadata.js";

const PROVIDERS = [
  ["all", "Todo"],
  ["musicbrainz", "MusicBrainz"],
  ["itunes", "Apple/iTunes"],
  ["spotify", "Spotify"]
];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function AlbumModal({ album, albums, onClose, onSave, onToast }) {
  const [title, setTitle] = useState(album?.title || "");
  const [artist, setArtist] = useState(album?.artist || "");
  const [year, setYear] = useState(album?.year ? String(album.year) : "");
  const [rating, setRating] = useState(() => normalizeRating(album?.rating, 0));
  const [coverBlob, setCoverBlob] = useState(album?.cover || null);
  const [coverName, setCoverName] = useState(album?.cover ? "Portada guardada. Haz clic para cambiarla." : "");
  const [songs, setSongs] = useState(() =>
    (album?.songs || []).map((song, index) => ({
      id: song.id || uid("song"),
      title: String(song?.title || ""),
      rating: normalizeRating(song?.rating, 1),
      position: Number.isFinite(song?.position) ? song.position : index
    })).sort((a, b) => Number(a.position) - Number(b.position))
  );
  const [focusToken, setFocusToken] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Los errores no salen al abrir el formulario: solo cuando se ha intentado
  // guardar. Un formulario que ya nace gritando "falta la valoración" culpa al
  // usuario por algo que aún no ha tenido ocasión de hacer.
  const [tried, setTried] = useState(false);

  const [provider, setProvider] = useState("all");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [chosenKey, setChosenKey] = useState(null);
  const [status, setStatus] = useState(null);

  const [ids, setIds] = useState({
    musicbrainzId: album?.musicbrainzId || null,
    musicbrainzReleaseGroupId: album?.musicbrainzReleaseGroupId || null,
    itunesId: album?.itunesId || null,
    spotifyId: album?.spotifyId || null
  });

  const backdropRef = useRef(null);
  const dialogRef = useRef(null);
  const fileRef = useRef(null);
  const resultsRef = useRef(null);
  const titleRef = useRef(null);
  const searchAbort = useRef(null);

  // Volver a abrir el modal con otro álbum (o con ninguno) deja el formulario como
  // estaba la última vez si no se limpia: este es el reset.
  useEffect(() => {
    setTitle(album?.title || "");
    setArtist(album?.artist || "");
    setYear(album?.year ? String(album.year) : "");
    setRating(normalizeRating(album?.rating, 0));
    setCoverBlob(album?.cover || null);
    setCoverName(album?.cover ? "Portada guardada. Haz clic para cambiarla." : "");
    setSongs((album?.songs || []).map((song, index) => ({
      id: song.id || uid("song"),
      title: String(song?.title || ""),
      rating: normalizeRating(song?.rating, 1),
      position: Number.isFinite(song?.position) ? song.position : index
    })).sort((a, b) => Number(a.position) - Number(b.position)));
    setProvider("all");
    setQuery("");
    setResults([]);
    setChosenKey(null);
    setStatus(null);
    setIds({
      musicbrainzId: album?.musicbrainzId || null,
      musicbrainzReleaseGroupId: album?.musicbrainzReleaseGroupId || null,
      itunesId: album?.itunesId || null,
      spotifyId: album?.spotifyId || null
    });
    // El foco entra en el título, que es lo primero que se escribe.
    const timer = setTimeout(() => titleRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [album]);

  // Cancelar una búsqueda en vuelo al cerrar o al abrir otra: el resultado que
  // llegue tarde no debe pintarse en un formulario que ya no es este.
  useEffect(() => () => searchAbort.current?.abort(), []);

  // El scroll del body se bloquea mientras el diálogo está abierto: si no, el
  // fondo se mueve detrás del scrim y al móvil le da por tastear la página.
  useEffect(() => {
    document.body.classList.add("x-overflow-hidden");
    return () => document.body.classList.remove("x-overflow-hidden");
  }, []);

  const coverUrl = coverBlob instanceof Blob ? URL.createObjectURL(coverBlob) : "";

  /* ---------- validación ---------- */

  const duplicate = Boolean(title.trim()) && albums.some(
    (row) => row.titleKey === normalize(title) && row.id !== album?.id
  );
  const yearNumber = Number(year);
  const yearOk = Boolean(yearNumber) && yearNumber >= 1 && yearNumber <= 3000;
  const artistOk = Boolean(artist.trim());
  const titleOk = Boolean(title.trim());
  const ratingOk = isValidRating(rating);

  const chooseCover = (file) => {
    if (!file) return;
    setCoverBlob(file);
    setCoverName(file.name);
  };

const submit = async (event) => {
    event.preventDefault();
    // Primer guardón: ignorar clics repetidos mientras corre la operación.
    if (submitting) return;

    // A partir de aquí los campos empiezan a seccionar sus propios problemas.
    setTried(true);

    const problems = [];
    if (duplicate) problems.push({ field: "title", toast: ["Ese título ya existe", "El catálogo solo admite un álbum por título."] });
    else if (!titleOk) problems.push({ field: "title", missing: "el título" });
    if (!artistOk) problems.push({ field: "artist", missing: "el artista" });
    if (!yearOk) problems.push({ field: "year", missing: "el año" });
    if (!ratingOk) problems.push({ field: "rating", missing: "una valoración" });

    if (problems.length) {
      const first = problems[0];
      // Cada campo reporta su problema junto a sí y el primero roto recibe el
      // foco: un toast solo deja al usuario buscando un campo que puede estar
      // fuera del modal.
      const node = first.field === "title" ? titleRef.current
        : first.field === "artist" ? dialogRef.current?.querySelector("#artistInput")
          : first.field === "year" ? dialogRef.current?.querySelector("#yearInput")
            : dialogRef.current?.querySelector(".star-picker");
      node?.focus();
      node?.scrollIntoView({ block: "center", behavior: scrollBehavior() });

      if (first.toast) onToast(first.toast[0], first.toast[1], "error");
      else if (!ratingOk && problems.length === 1) {
        onToast("Falta la valoración", "Pulsa las estrellas del álbum, o la mitad izquierda para bajar medio punto.", "error");
      } else {
        const missing = problems.filter((problem) => problem.missing).map((problem) => problem.missing);
        onToast(
          `Falta ${missing.length === 1 ? missing[0] : "algún dato"}`,
          `Completa ${missing.length === 1 ? missing[0] : missing.join(", ")} para guardar.`,
          "error"
        );
      }
      return;
    }

    const existing = albums.find((row) => row.id === album?.id);
    const draft = {
      id: existing?.id || uid("album"),
      title: title.trim(),
      titleKey: normalize(title),
      artist: artist.trim(),
      artistKey: normalize(artist),
      year: yearNumber,
      rating,
      musicbrainzId: ids.musicbrainzId,
      musicbrainzReleaseGroupId: ids.musicbrainzReleaseGroupId,
      itunesId: ids.itunesId,
      spotifyId: ids.spotifyId,
      metadataSource: ids.spotifyId ? "Spotify"
        : ids.itunesId ? "Apple/iTunes"
          : ids.musicbrainzId ? "MusicBrainz"
            : existing?.metadataSource || null,
      cover: coverBlob || existing?.cover || null,
      songs: songs
        .map((song, index) => ({
          id: song.id || uid("song"),
          title: String(song.title || "").trim(),
          rating: normalizeRating(song.rating, 1),
          position: index
        }))
        .filter((song) => song.title.length > 0),
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    setSubmitting(true);

    try {
      // Segundo guardón: releer la base antes de escribir. Dos pestañas pueden
      // pasar la comprobación en vivo del título a la vez.
      const latest = await onSave(draft, existing);
      if (latest === false) return;
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- importación ---------- */

  const runSearch = async (event) => {
    event?.preventDefault();
    if (searching || importing) return;

    const text = query.trim();
    if (text.length < 2) {
      setStatus({ message: "Escribe al menos 2 caracteres.", type: "error" });
      return;
    }

    setSearching(true);
    setStatus({ message: "Buscando en MusicBrainz, Apple/iTunes y Spotify a la vez…", type: "info" });

    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;

    try {
      const found = await searchMetadata(text, provider, { signal: controller.signal });
      setResults(provider === "all" ? found : filteredMetadataResults(found, provider));
      // Una búsqueda nueva invalida lo que estuviera elegido antes.
      setChosenKey(null);
      if (!found.length) {
        setStatus({ message: "Ningún resultado. Prueba con el nombre del artista solo, o con otra fuente.", type: "error" });
      } else {
        setStatus(null);
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error(error);
      setStatus({ message: "No se pudo ordenar la respuesta. Inténtalo de nuevo.", type: "error" });
    } finally {
      setSearching(false);
    }
  };

  const choose = async (release) => {
    if (importing) return;
    setImporting(true);
    setStatus({ message: "Importando datos y portada del álbum…", type: "info" });

    try {
      const imported = await importRelease(release);

      setTitle(imported.title);
      setArtist(imported.artist);
      setYear(imported.year ? String(imported.year) : "");
      setRating(0);
      setSongs(imported.songs.map((song, index) => ({ ...song, position: index })));
      if (imported.coverBlob) {
        setCoverBlob(imported.coverBlob);
        setCoverName(`Portada de ${imported.title || imported.metadataSource}. Haz clic para cambiarla.`);
      }
      setIds({
        musicbrainzId: imported.musicbrainzId,
        musicbrainzReleaseGroupId: imported.musicbrainzReleaseGroupId,
        itunesId: imported.itunesId,
        spotifyId: imported.spotifyId
      });
      setChosenKey(imported.resultKey);

      const where = imported.metadataSource;
      const songsNote = imported.songs.length ? ` con ${imported.songs.length} canciones` : "";
      const coverNote = imported.coverFailed
        ? " No había una portada disponible; sube una manualmente si es necesario."
        : "";
      const extra = imported.fellBack
        ? ` Se importaron ${imported.songs.length} canciones automáticamente desde Apple/iTunes.`
        : "";
      setStatus({
        message: `Importado ${imported.title || "el álbum"} desde ${where}${songsNote}. Revisa tu valoración y el orden de las canciones antes de guardar.${coverNote}${extra}`,
        type: "success"
      });
    } catch (error) {
      console.error(error);
      setStatus({ message: error.message || "No se pudo importar ese álbum.", type: "error" });
    } finally {
      setImporting(false);
    }
  };

  const merged = results.filter((item) => Array.isArray(item.alternatives) && item.alternatives.length).length;

  return (
    <div
      ref={backdropRef}
      id="modalBackdrop"
      className="av-modal-backdrop x-fixed x-inset-0 layer-modal x-flex x-items-center x-justify-center x-p-4"
      onClick={(event) => { if (event.target === backdropRef.current) onClose(); }}
      onKeyDown={(event) => {
        // Tab se queda dentro del diálogo mientras está abierto.
        if (event.key !== "Tab" || !backdropRef.current) return;
        const focusable = [...backdropRef.current.querySelectorAll(FOCUSABLE)]
          .filter((node) => node.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="av-modal x-w-full x-max-w-5xl x-overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="x-flex x-items-center x-justify-between x-gap-4 x-border-b border-line x-px-5 x-py-4 sm:x-px-7">
          <div className="x-min-w-0">
            <h2 id="modalTitle" className="x-truncate x-t-18 x-font-semibold x-stretch-88 x-tracking-tight text-ink">
              {album ? album.title : "Añadir álbum"}
            </h2>
            <p id="modalKicker" className="x-mt-0-5 x-t-11-5 text-muted">
              {album ? "Editando un álbum del catálogo" : "Nuevo álbum en el catálogo"}
            </p>
          </div>
          <button id="closeModal" className="icon-btn x-t-20" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>

        <form
          id="albumForm"
          className="scrollbar x-max-h-album x-overflow-y-auto x-px-5 x-py-6 sm:x-px-7"
          noValidate
          onSubmit={submit}
        >
          <div className="x-grid x-gap-7 md:x-grid-modal md:x-gap-9">
            <div className="x-min-w-0">
              <button
                id="coverPreview"
                type="button"
                className={`cover-drop${dragOver ? " over" : ""}`}
                aria-label="Elegir la portada del álbum"
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }}
                onDragLeave={(event) => { event.preventDefault(); setDragOver(false); }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const file = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith("image/"));
                  if (!file) {
                    setStatus({ message: "Ese archivo no es una imagen.", type: "error" });
                    return;
                  }
                  chooseCover(file);
                }}
              >
                {coverUrl ? <img src={coverUrl} alt="Portada elegida" /> : (
                  <span className="cover-hint">
                    <span className="cover-glyph" aria-hidden="true" />
                    Arrastra una imagen aquí<br />o haz clic para elegirla
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                id="coverInput"
                type="file"
                accept="image/*"
                className="x-hidden"
                onChange={(event) => chooseCover(event.target.files?.[0])}
              />
              <p id="coverFile" className="cover-file">
                {coverUrl ? coverName || "Portada elegida. Haz clic para cambiarla." : "Sin portada"}
              </p>
            </div>

            <div className="x-min-w-0">
              <div className="form-group">
                <label className="av-form-label" htmlFor="titleInput">Título del álbum</label>
                <input
                  id="titleInput"
                  ref={titleRef}
                  className="field x-mt-2"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Título del álbum"
                  aria-describedby="duplicateError"
                  aria-invalid={duplicate || (tried && !titleOk) ? "true" : undefined}
                />
                <p id="duplicateError" className="form-error" hidden={!duplicate}>Ese título ya existe en el catálogo.</p>
              </div>

              <div className="x-mt-4 x-grid x-gap-4 sm:x-grid-cols-2">
                <div className="form-group">
                  <label className="av-form-label" htmlFor="artistInput">Artista</label>
                  <input
                    id="artistInput"
                    className="field x-mt-2"
                    required
                    maxLength={120}
                    value={artist}
                    onChange={(event) => setArtist(event.target.value)}
                    placeholder="Nombre del artista"
                    aria-invalid={tried && !artistOk ? "true" : undefined}
                  />
                  <p id="artistError" className="form-error" hidden={!tried || artistOk}>Falta el artista.</p>
                </div>
                <div className="form-group">
                  <label className="av-form-label" htmlFor="yearInput">Año</label>
                  <input
                    id="yearInput"
                    className="field x-mt-2"
                    required
                    type="number"
                    min={1}
                    max={3000}
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    placeholder="1978"
                    aria-invalid={tried && !yearOk ? "true" : undefined}
                  />
                  <p id="yearError" className="form-error" hidden={!tried || yearOk}>
                    Falta el año, o no es un número entre 1 y 3000.
                  </p>
                </div>
              </div>

              <div className="form-group x-mt-5">
                <p className="av-form-label" id="ratingLabel">Valoración del álbum</p>
                <StarPicker
                  id="ratingPicker"
                  value={rating}
                  onChange={(next) => { setRating(next); setTried(false); }}
                  className="star-picker x-mt-2"
                  labelledBy="ratingLabel"
                  describedBy="ratingError"
                />
                <p id="ratingReadout" className="rating-readout x-mt-2" data-empty={rating ? "false" : "true"}>
                  {rating ? `${formatRating(rating)} / 5` : "Sin valorar"}
                </p>
                <p className="form-hint">Clic en la mitad izquierda de una estrella para bajar medio punto.</p>
                <p id="ratingError" className="form-error" hidden={!tried || ratingOk}>
                  El álbum necesita una valoración para guardarse.
                </p>
              </div>

              <div className="x-mt-6 x-border-t border-line-soft x-pt-5">
                <div className="x-flex x-flex-wrap x-items-end x-justify-between x-gap-3">
                  <h3 className="block-title">Canciones, de la favorita a la menos favorita</h3>
                  <button
                    id="addSongButton"
                    type="button"
                    className="av-btn x-shrink-0"
                    onClick={() => {
                      setSongs((current) => [...current, { id: uid("song"), title: "", rating: 3, position: current.length }]);
                      setFocusToken((token) => token + 1);
                    }}
                  >
                    Añadir canción
                  </button>
                </div>
                <p id="songCount" className="form-hint">
                  {songs.length
                    ? `${songs.length} ${songs.length === 1 ? "canción" : "canciones"}. El orden es tu preferencia, de la favorita a la menos favorita.`
                    : "Sin canciones. Puedes importarlas con la búsqueda o añadirlas tú."}
                </p>
                <div id="songEditor" className="x-mt-4 x-space-y-2" hidden={!songs.length}>
                  <TrackList songs={songs} onChange={setSongs} focusToken={focusToken} />
                </div>
              </div>
            </div>
          </div>

          {/* La importación de la API, a todo el ancho. Elegir entre títulos casi
              iguales necesita sitio: a 232px un título tenía 140px y la línea de
              la fuente se partía debajo. */}
          <section className="import-band" aria-labelledby="importHeading">
            <h3 id="importHeading" className="block-title">Busca el álbum en vez de escribirlo</h3>
            <p className="form-hint">Artista, título o ambos, unidos por « — ». Trae la portada y las canciones.</p>

            <div className="import-row">
              <div className="segmented" role="group" aria-label="Fuente de metadatos">
                {PROVIDERS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`provider-button chip${provider === value ? " active" : ""}`}
                    aria-pressed={provider === value}
                    onClick={() => {
                      setProvider(value);
                      // La fila elegida puede ser del proveedor que se acaba de
                      // apagar: el foco aterriza en la primera que sobreviva.
                      if (results.length) setResults(filteredMetadataResults(results, value));
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                id="mbSearchInput"
                className="field"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runSearch();
                    return;
                  }
                  // Abajo desde el campo entra en la lista en vez de mover el
                  // cursor.
                  if (event.key === "ArrowDown" && results.length) {
                    event.preventDefault();
                    resultsRef.current?.querySelector(".metadata-result")?.focus();
                  }
                }}
                placeholder="Blondie — Parallel Lines"
                autoComplete="off"
                aria-label="Buscar el álbum en MusicBrainz, Apple/iTunes y Spotify"
              />
              <button id="mbSearchButton" type="button" className="av-btn x-shrink-0" disabled={searching || importing} onClick={runSearch}>
                {searching ? "Buscando…" : "Buscar"}
              </button>
            </div>

            <div className="import-keys">
              <kbd className="av-kbd">Enter</kbd><span className="form-hint">busca</span>
              <kbd className="av-kbd">↑</kbd><kbd className="av-kbd">↓</kbd><span className="form-hint">recorre los resultados</span>
            </div>

            {/* Los colores del estado se quedan dentro de la paleta: hueso para
                una importación confirmada, lápiz para un fallo, muted mientras
                trabaja. Sin verde prestado: en esta app el color pertenece a las
                portadas y el glifo lleva el significado. */}
            <p id="mbSearchStatus" className="status x-mt-3" data-type={status?.type || "info"} role="status" hidden={!status}>
              {status?.message}
            </p>
            <p id="mbCount" className="import-count" hidden={!results.length}>
              {results.length ? (
                <>
                  <span className="num">{results.length}</span> {results.length === 1 ? "resultado" : "resultados"}
                  {merged ? (
                    <span className="src">
                      {merged} {merged === 1 ? "aparecía también" : "aparecían también"} en otra fuente
                    </span>
                  ) : null}
                </>
              ) : null}
            </p>
            <MetadataResults
              results={results}
              loading={searching}
              busy={importing}
              chosenKey={chosenKey}
              onChoose={choose}
              listRef={resultsRef}
            />
          </section>
        </form>

        <div className="modal-foot">
          <p className="foot-note">Se guarda en este navegador. Exporta una copia si te importa.</p>
          <div className="x-flex x-gap-2">
            <button id="cancelModal" type="button" className="av-btn" disabled={submitting} onClick={onClose}>Cancelar</button>
            {/* Fuera del <form>, así que necesita el atributo form= para enviarlo. */}
            <button id="saveButton" type="submit" form="albumForm" className="av-btn av-btn-primary" disabled={duplicate || submitting}>
              {submitting ? "Guardando…" : album ? "Guardar cambios" : "Guardar álbum"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
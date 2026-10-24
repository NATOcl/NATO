/* La app entera: el estado (catálogo, filtros, vista), el enrutado por el hash y
   el reparto entre las tres vistas.

   Dónde vive cada cosa, para no buscarla dos veces:
   - el catálogo y sus escrituras, en useCatalog (IndexedDB)
   - los filtros y la ruta, aquí: son estado de la URL, y la URL es su sitio
     natural. Los filtros se leen del hash en el estado inicial y la ruta se
     resuelve cuando la base está lista, porque una ruta puede apuntar a un
     álbum que todavía no se ha leído
   - el borrador de la ficha y el del modal, dentro de sus componentes: nadie más
     los toca y no sobreviven a cerrarse
   - el toast, aquí, porque lo usan todos los caminos de escritura */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import TopBar from "./components/TopBar.jsx";
import Toast from "./components/Toast.jsx";
import FiltersPanel from "./components/FiltersPanel.jsx";
import CatalogView from "./components/CatalogView.jsx";
import ArtistView from "./components/ArtistView.jsx";
import AlbumDetail from "./components/AlbumDetail.jsx";
import AlbumModal from "./components/AlbumModal.jsx";

import { ThemeContext } from "./context/ThemeContext.js";
import { useTheme } from "./lib/theme.js";
import { useCatalog } from "./hooks/useCatalog.js";
import { useCoverUrls } from "./hooks/useCoverUrls.js";
import { getAllAlbums } from "./lib/db.js";

import { activeFilterCount, artistAlbums, DEFAULT_FILTERS, getFiltered, pageSlice } from "./lib/filters.js";
import { buildHash, parseHash, writeHash } from "./lib/urlState.js";
import { normalize, scrollBehavior } from "./lib/format.js";
import { formatRating } from "./lib/rating.js";
import { buildBackup, downloadJson, replaceCatalogWithBackup } from "./lib/backup.js";

const CATALOG = { kind: "catalog", artist: null, albumId: null };

export default function App() {
  const { albums, status, put, remove, refresh } = useCatalog();
  const theme = useTheme();
  const coverUrl = useCoverUrls(albums);

  // Los filtros se leen del hash antes del primer render: no dependen del
  // catálogo y así una dirección profunda con filtros ya está puesta.
  const [filters, setFilters] = useState(() => parseHash(location.hash).filters);
  // La ruta se resuelve después: para saber si `#/album/{id}` existe hay que
  // tener los álbumes delante. `null` = todavía sin resolver.
  const [route, setRoute] = useState(null);
  const [entered, setEntered] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const searchRef = useRef(null);
  const returnFocus = useRef(null);

  const say = useCallback((title, text = "", type = "success") => {
    setToast({ id: `${Date.now()}-${Math.random()}`, title, text, type });
  }, []);

  const hashFor = useCallback(
    (view, nextFilters) => buildHash({
      view: view.kind,
      artist: view.artist,
      albumId: view.albumId,
      filters: nextFilters
    }),
    []
  );

  /* ---------- la URL es el estado ---------- */

  // Primera pasada: resolver la ruta contra el catálogo ya leído. Una ruta que
  // no existe cae al catálogo y reescribe la dirección, para que un marcador
  // viejo no deje la URL diciendo algo que la página no muestra.
  useEffect(() => {
    if (status !== "ready" || route) return;

    const { route: wanted, filters: wantedFilters } = parseHash(location.hash);
    let resolved = CATALOG;

    if (wanted.kind === "album" && albums.some((album) => album.id === wanted.albumId)) {
      resolved = wanted;
    } else if (wanted.kind === "artist" && albums.some((album) => album.artistKey === normalize(wanted.artist || ""))) {
      resolved = wanted;
    }

    setRoute(resolved);
    if (resolved !== wanted || wantedFilters !== filters) {
      writeHash(hashFor(resolved, filters), { replace: true });
    }
    // Solo en la primera pasada: después la ruta la mueve la navegación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // A partir de ahí, la URL sigue al estado. Filtrar REEMPLAZA la entrada del
  // historial para que Back no recorra veinte cambios de filtro; navegar la
  // EMPUJA, que es lo que hace que Back salga de un álbum en vez de del sitio.
  useEffect(() => {
    if (!route) return;
    const hash = hashFor(route, filters);
    if (location.hash === hash) return;
    writeHash(hash, { replace: true });
  }, [route, filters, hashFor]);

  // Botón atrás y adelante: la URL manda y el estado se limita a obedecerla.
  useEffect(() => {
    const onPopState = () => {
      const { route: nextRoute, filters: nextFilters } = parseHash(location.hash);
      setFilters(nextFilters);
      setRoute(nextRoute.kind === "catalog" ? CATALOG : nextRoute);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dense", filters.dense);
  }, [filters.dense]);

  /* ---------- navegación ---------- */

  const push = useCallback((nextRoute) => {
    setRoute(nextRoute);
    writeHash(hashFor(nextRoute, filters), { replace: false });
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }, [filters, hashFor]);

  const goCatalog = useCallback(() => push(CATALOG), [push]);
  const goAlbum = useCallback((albumId) => push({ kind: "album", artist: null, albumId }), [push]);
  const goArtist = useCallback((artist) => push({ kind: "artist", artist, albumId: null }), [push]);

  const setFilter = useCallback((name, value) => {
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => setFilters({ ...DEFAULT_FILTERS }), []);

  /* ---------- escritura ---------- */

  const openModal = useCallback((album) => {
    returnFocus.current = document.activeElement;
    setModal({ album: album || null });
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    // El foco vuelve a lo que abrió el diálogo, o el teclado no sabe dónde
    // seguir y Tab rehace la página desde arriba.
    const back = returnFocus.current;
    returnFocus.current = null;
    if (back && document.contains(back)) back.focus?.();
  }, []);

  const openAdd = useCallback(() => openModal(null), [openModal]);

  /* El modal entrega el álbum ya escrito. Aquí se relee la base antes de
     escribir —el segundo guardón, después del que vive en el modal mientras se
     escribe el título— y se actualiza la memoria solo cuando la transacción
     resuelve. */
  const saveFromModal = useCallback(async (draft) => {
    try {
      const latest = await getAllAlbums();
      const clash = latest.some((row) => normalize(row.title) === draft.titleKey && row.id !== draft.id);
      if (clash) {
        say("Ese título ya existe", "El catálogo solo admite un álbum por título.", "error");
        return false;
      }

      await put(draft);
      const existing = latest.some((row) => row.id === draft.id);
      setFilters((current) => ({ ...current, page: 1 }));
      say(
        existing ? "Cambios guardados" : "Álbum guardado",
        existing ? `«${draft.title}» está al día.` : `«${draft.title}» ya está en tu catálogo.`
      );
      return true;
    } catch (error) {
      console.error(error);
      if (error.name === "ConstraintError") {
        say("Ese título ya existe", "El catálogo solo admite un álbum por título.", "error");
        return false;
      }
      say("No se pudo guardar el álbum", "Comprueba el almacenamiento del navegador e inténtalo de nuevo.", "error");
      return false;
    }
  }, [put, say]);

  const saveDetail = useCallback(async (draft, { ratingChanged, songsChanged }) => {
    const album = albums.find((row) => row.id === route?.albumId);
    if (!album) return;

    const next = { ...album, rating: draft.rating, songs: draft.songs, updatedAt: Date.now() };

    try {
      await put(next);
      if (ratingChanged && !songsChanged) {
        say("Valoración guardada", `«${album.title}» ahora vale ${formatRating(draft.rating)}.`);
      } else if (songsChanged && !ratingChanged) {
        const count = draft.songs.length;
        say("Canciones guardadas", `Se guardaron ${count} ${count === 1 ? "canción" : "canciones"} de «${album.title}».`);
      } else {
        say("Cambios guardados", `«${album.title}» está al día.`);
      }
    } catch (error) {
      console.error(error);
      say("No se pudieron guardar los cambios", "Inténtalo de nuevo.", "error");
    }
  }, [albums, route, put, say]);

  const removeAlbum = useCallback(async (id) => {
    const album = albums.find((row) => row.id === id);
    if (!album) return;
    if (!confirm(`¿Eliminar "${album.title}" del catálogo?`)) return;

    try {
      await remove(id);
      if (route?.albumId === id) push(CATALOG);
      say("Álbum eliminado", `"${album.title}" se eliminó del catálogo.`);
    } catch (error) {
      console.error(error);
      say("No se pudo eliminar el álbum", "Inténtalo de nuevo.", "error");
    }
  }, [albums, route, push, remove, say]);

  const exportBackup = useCallback(async () => {
    try {
      const backup = await buildBackup();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`albumvault-backup-${stamp}.albumvault.json`, backup);
      say("Copia exportada", `Incluye ${backup.albumCount} álbumes con sus portadas y canciones.`);
    } catch (error) {
      console.error(error);
      say("No se pudo exportar la copia", "Inténtalo de nuevo.", "error");
    }
  }, [say]);

  const importBackup = useCallback(async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const count = Array.isArray(data.albums) ? data.albums.length : 0;

      if (!confirm(`Importar esta copia reemplazará el catálogo actual con ${count} álbum${count === 1 ? "" : "es"}. ¿Continuar?`)) {
        return;
      }

      await replaceCatalogWithBackup(data);
      await refresh();

      // La copia es un catálogo entero: búsqueda y filtros vuelven a su sitio, o
      // se estaría mirando la copia nueva con los criterios de la vieja.
      setFilters({ ...DEFAULT_FILTERS });
      setRoute(CATALOG);
      writeHash(buildHash({ view: "catalog", filters: DEFAULT_FILTERS }), { replace: true });

      say("Copia restaurada", `Se recuperaron ${count} álbumes con sus portadas y canciones.`);
    } catch (error) {
      console.error(error);
      const message = error.message === "DUPLICATE_BACKUP_TITLE"
        ? "La copia tiene dos álbumes con el mismo título."
        : "El archivo no es una copia de seguridad de AlbumVault.";
      say("No se pudo restaurar la copia", message, "error");
    }
  }, [refresh, say]);

  /* ---------- atajos ---------- */

  useEffect(() => {
    const onKeyDown = (event) => {
      // Escape cierra el modal; los menús se cierran ellos solos.
      if (event.key === "Escape" && modal) {
        closeModal();
        return;
      }

      // "/" lleva a la búsqueda desde cualquier sitio, como en todas partes.
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modal, closeModal]);

  /* ---------- datos derivados ---------- */

  const items = useMemo(() => getFiltered(albums, filters), [albums, filters]);
  const { pageItems, totalPages, page } = useMemo(() => pageSlice(items, filters.page), [items, filters.page]);
  const activeCount = useMemo(() => activeFilterCount(filters), [filters]);
  const artists = useMemo(
    () => new Set(albums.map((album) => album.artistKey).filter(Boolean)).size,
    [albums]
  );

  const artistAlbumsFor = useMemo(
    () => (route?.kind === "artist" ? artistAlbums(albums, normalize(route.artist || "")) : []),
    [albums, route]
  );

  const detailAlbum = useMemo(
    () => (route?.kind === "album" ? albums.find((album) => album.id === route.albumId) : null),
    [albums, route]
  );

  // La cascada de entrada de la rejilla es solo del primer pintado: quince
  // portadas re-animándose con cada tecla de la búsqueda serían ruido.
  useEffect(() => {
    if (!entered && albums.length) setEntered(true);
  }, [albums.length, entered]);

  useEffect(() => {
    if (status === "error") {
      say("No se pudo abrir el catálogo", "El almacenamiento del navegador está bloqueado o lleno.", "error");
    }
  }, [status, say]);

  const isNarrowed = items.length !== albums.length || Boolean(filters.search);

  return (
    <ThemeContext.Provider value={theme}>
      <div id="app" className="x-min-h-screen">
        <a className="skip-link" href="#main">Saltar al contenido</a>

        <TopBar
          search={filters.search}
          onSearch={(value) => setFilter("search", value)}
          onClearSearch={() => {
            setFilter("search", "");
            searchRef.current?.focus();
          }}
          onBrand={goCatalog}
          onAddAlbum={openAdd}
          filterCount={activeCount}
          onExport={exportBackup}
          onImport={importBackup}
          searchInputRef={searchRef}
          filtersPanel={
            <FiltersPanel
              albums={albums}
              filters={filters}
              activeCount={activeCount}
              onFilter={setFilter}
              onToggleDense={() => setFilter("dense", !filters.dense)}
              onReset={resetFilters}
            />
          }
        />

        <main id="main" tabIndex={-1} className="x-mx-auto x-max-w-page x-px-5 x-pb-20 sm:x-px-8">
          {route?.kind === "catalog" ? (
            <CatalogView
              albums={albums}
              items={pageItems}
              page={page}
              totalPages={totalPages}
              artists={artists}
              sort={filters.sort}
              entered={entered}
              isNarrowed={isNarrowed}
              coverUrl={coverUrl}
              onPage={(next) => setFilters((current) => ({ ...current, page: next }))}
              onOpen={goAlbum}
              onArtist={goArtist}
              onEdit={openModal}
              onDelete={removeAlbum}
              onAdd={openAdd}
              onResetFilters={resetFilters}
            />
          ) : null}

          {route?.kind === "artist" ? (
            <ArtistView
              artist={route.artist}
              albums={artistAlbumsFor}
              coverUrl={coverUrl}
              onOpen={goAlbum}
              onEdit={openModal}
              onDelete={removeAlbum}
              onCatalog={goCatalog}
            />
          ) : null}

          {route?.kind === "album" && detailAlbum ? (
            <AlbumDetail
              key={detailAlbum.id}
              album={detailAlbum}
              coverUrl={coverUrl(detailAlbum)}
              onCatalog={goCatalog}
              onArtist={goArtist}
              onEdit={openModal}
              onSave={saveDetail}
            />
          ) : null}
        </main>

        {modal ? (
          <AlbumModal
            album={modal.album}
            albums={albums}
            onClose={closeModal}
            onSave={saveFromModal}
            onToast={say}
          />
        ) : null}

        <Toast toast={toast} onExpire={() => setToast(null)} />
      </div>
    </ThemeContext.Provider>
  );
}
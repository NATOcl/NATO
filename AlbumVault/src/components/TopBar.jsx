/* La barra superior: identidad, el camino rápido (buscar) y las acciones globales.
   Los filtros se pliegan en un panel para que ningún control quede al lado de
   otro que importa menos. Añadir y copia viven aquí, no en la cabecera de la
   sección, porque tienen que estar al alcance desde cualquier vista.

   El toggle del tema nombra el modo actual con un glifo, y el menú debajo es la
   única vuelta a "según el sistema" una vez se ha salido de ahí. En un móvil la
   palabra se cae y el aria-label lleva el nombre. */

import { useRef } from "react";
import { useDropdown } from "../hooks/useDropdown.js";
import { walkOptions } from "../hooks/walkOptions.js";
import { useThemeContext } from "../context/ThemeContext.js";
import { THEME_GLYPHS, THEME_LABELS } from "../lib/theme.js";

const THEME_OPTIONS = [
  ["light", "Claro"],
  ["dark", "Oscuro"],
  ["system", "Según el sistema"]
];

/* The way back to the CV. In production AlbumVault lives under /albumvault/, so
   "/" is the portfolio; in dev it runs on its own port with the same base, where
   "/" would still be AlbumVault and the CV is on :5173. */
const CV_URL = import.meta.env.DEV ? "http://localhost:5173/" : "/";

function ThemeMenu() {
  const { mode, setTheme } = useThemeContext();
  const { panelRef, triggerRef, open, toggle, close } = useDropdown({ role: "menu" });
  const name = `Tema: ${THEME_LABELS[mode]}`;

  return (
    <div className="x-relative">
      <button
        ref={triggerRef}
        id="themeToggle"
        className="toggle"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="themeMenu"
        aria-label={name}
        title={name}
      >
        <span className="theme-glyph" aria-hidden="true">{THEME_GLYPHS[mode]}</span>
        <span className="x-hidden sm:x-d-inline">Tema</span>
        <span className="caret" aria-hidden="true">▼</span>
      </button>

      <div
        ref={panelRef}
        id="themeMenu"
        className={`av-dropdown${open ? "" : " x-hidden"}`}
        data-dropdown="theme"
        role="menu"
        aria-label="Tema de la interfaz"
        onKeyDown={walkOptions}
      >
        {THEME_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="menuitemradio"
            aria-checked={mode === value}
            onClick={(event) => {
              const fromKeyboard = event.detail === 0;
              setTheme(value);
              close();
              // Elegir cierra el menú y el foco vuelve al botón que lo abrió, o
              // cae en <body> y Tab rehace la página desde arriba.
              (fromKeyboard ? panelRef.current : triggerRef.current)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BackupMenu({ onExport, onImport }) {
  const fileRef = useRef(null);
  const { panelRef, triggerRef, open, toggle, close } = useDropdown({ role: "menu" });

  const pick = (action) => {
    close();
    if (action === "export") onExport();
    else fileRef.current?.click();
  };

  return (
    <div className="x-relative">
      <button
        ref={triggerRef}
        id="backupTop"
        className="toggle"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="backupMenu"
      >
        <span className="sm:x-d-none">Copia</span>
        <span className="x-hidden sm:x-d-inline">Copia de seguridad</span>
        <span className="caret" aria-hidden="true">▼</span>
      </button>

      <div
        ref={panelRef}
        id="backupMenu"
        className={`av-dropdown${open ? "" : " x-hidden"}`}
        data-dropdown="backup"
        role="menu"
        onKeyDown={walkOptions}
      >
        <p className="x-px-2 x-pb-2 x-pt-1 x-t-11-5 x-leading-15 text-muted">
          Tus álbumes se guardan solo en este navegador. Exporta una copia de vez en cuando.
        </p>
        <button type="button" role="menuitem" onClick={() => pick("export")}>Exportar copia completa</button>
        <button type="button" role="menuitem" onClick={() => pick("import")}>Restaurar desde una copia</button>
      </div>

      <input
        ref={fileRef}
        id="backupFile"
        type="file"
        accept="application/json,.json,.albumvault.json"
        className="x-hidden"
        onChange={(event) => {
          onImport(event.target.files?.[0] || null);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export default function TopBar({
  search,
  onSearch,
  onClearSearch,
  onBrand,
  onAddAlbum,
  filterCount,
  onExport,
  onImport,
  filtersPanel,
  searchInputRef
}) {
  return (
    <header className="topbar layer-bar">
      <div className="x-mx-auto x-flex x-max-w-page x-flex-wrap x-items-center x-gap-x-3 x-gap-y-2 x-px-4 x-py-2-5 sm:x-px-8 sm:x-py-3">
        <button id="brand" className="wordmark x-mr-auto x-shrink-0" onClick={onBrand}>AlbumVault</button>

        <label className="search" htmlFor="searchInput">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            id="searchInput"
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar álbumes o artistas"
            autoComplete="off"
          />
          <button
            id="searchClear"
            className="icon-btn x-t-15"
            type="button"
            aria-label="Borrar la búsqueda"
            hidden={!search}
            onClick={onClearSearch}
          >
            ×
          </button>
        </label>

        <div className="topbar__actions x-flex x-items-center x-gap-x-3">
          <a className="bar-link" href={CV_URL} aria-label="Volver al CV de Nicolás" title="Volver al CV de Nicolás">
            <span className="bar-link-arrow" aria-hidden="true">←</span>
            <span className="x-hidden sm:x-d-inline">Volver al CV</span>
            <span className="sm:x-d-none">CV</span>
          </a>
          <ThemeMenu />
          {filtersPanel}
          <BackupMenu onExport={onExport} onImport={onImport} />

          <button id="addButton" className="av-btn av-btn-primary x-shrink-0" onClick={onAddAlbum}>
            <span className="sm:x-d-none">Añadir</span>
            <span className="x-hidden sm:x-d-inline">Añadir álbum</span>
          </button>
        </div>
      </div>
    </header>
  );
}
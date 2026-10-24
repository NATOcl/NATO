/* Tres modos, no dos. "system" es lo que hay antes de tocar el switch, y tiene
   que seguir siendo alcanzable después: es lo único que un toggle binario no
   puede ofrecer. El script diminuto del <head> ya resolvió data-theme antes del
   primer pintado; aquí solo se mantiene enstep con la elección y se pinta el
   propio switch.

   La clave y los tres nombres de modo están repetidos en ese script a propósito:
   si tocas uno, toca el otro. */

import { useCallback, useEffect, useState } from "react";
import { THEME_KEY } from "./constants.js";

export const THEME_LABELS = { light: "claro", dark: "oscuro", system: "según el sistema" };
export const THEME_GLYPHS = { light: "☀", dark: "☾", system: "◐" };

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Sin almacenamiento, seguir al sistema sigue siendo una respuesta válida.
    return "system";
  }
}

export function resolvedTheme(mode) {
  if (mode !== "system") return mode;
  return darkQuery.matches ? "dark" : "light";
}

function paint(mode) {
  document.documentElement.dataset.theme = resolvedTheme(mode);
  document.documentElement.dataset.themeMode = mode;
  // El chrome de móvil toma su color de aquí, no del CSS.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--page").trim();
}

export function useTheme() {
  // El script del <head> ya puso el atributo; este estado solo describe el modo
  // elegido para pintar el switch. Sin persistir: el almacenamiento ya lo tiene.
  const [mode, setMode] = useState(readStoredTheme);

  const setTheme = useCallback((next, { persist = true } = {}) => {
    const wanted = next === "light" || next === "dark" ? next : "system";
    if (persist) {
      try {
        // "system" borra la clave en vez de guardarla: es la ausencia de
        // elección, no una tercera opción guardada.
        if (wanted === "system") localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, wanted);
      } catch {
        // Igual que al leer: sin almacenamiento la elección dura esta página.
      }
    }
    paint(wanted);
    setMode(wanted);
  }, []);

  useEffect(() => {
    paint(mode);
  }, [mode]);

  // La preferencia del sistema es una entrada viva: "sigue al sistema" tiene que
  // seguirla ahora y no solo al cargar.
  useEffect(() => {
    const onChange = () => {
      setMode((current) => {
        if (current === "system") paint("system");
        return current;
      });
    };
    if (typeof darkQuery.addEventListener === "function") darkQuery.addEventListener("change", onChange);
    else darkQuery.addListener(onChange);
    return () => {
      if (typeof darkQuery.removeEventListener === "function") darkQuery.removeEventListener("change", onChange);
      else darkQuery.removeListener(onChange);
    };
  }, []);

  return { mode, setTheme };
}
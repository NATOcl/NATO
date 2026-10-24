/* El tema vive en un contexto porque lo usan dos ramas del árbol — la barra
   superior y el menú que abre — y porque la preferencia tiene que ser una sola
   para las dos. `useTheme()` es el hook; este archivo solo guarda el contexto
   para no crear un ciclo entre lib/theme.js y los componentes. */

import { createContext, useContext } from "react";

export const ThemeContext = createContext({ mode: "system", setTheme: () => {} });

export function useThemeContext() {
  return useContext(ThemeContext);
}
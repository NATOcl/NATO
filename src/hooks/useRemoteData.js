import { useCallback, useEffect, useState } from "react";

const initialState = {
  data: null,
  loading: true,
  error: null,
  source: null,
};

/** Si la API no responde en este tiempo, se usa el JSON local. */
const API_TIMEOUT = 8000;

/**
 * Carga datos desde una API REST y, si no está disponible, usa un JSON
 * local como respaldo. Así el CV funciona igual en Render (con API) y en
 * GitHub Pages (estático), sin dejar la sección vacía.
 */
export default function useRemoteData(apiUrl, fallbackUrl) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState(initialState);

    const loadJson = async (url, timeout = 0) => {
      // Cada petición tiene su propio signal para poder abortar solo la API
      // por timeout sin cancelar la carga de respaldo.
      const requestController = new AbortController();
      const forwardAbort = () => requestController.abort();
      controller.signal.addEventListener("abort", forwardAbort);

      const timer = timeout
        ? setTimeout(() => requestController.abort(), timeout)
        : null;

      try {
        const response = await fetch(url, {
          signal: requestController.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`No se pudo cargar ${url} (HTTP ${response.status}).`);
        }

        return await response.json();
      } finally {
        if (timer) clearTimeout(timer);
        controller.signal.removeEventListener("abort", forwardAbort);
      }
    };

    const load = async () => {
      const staticOnly = import.meta.env?.VITE_STATIC_DATA === "true";

      if (!staticOnly) {
        try {
          const payload = await loadJson(apiUrl, API_TIMEOUT);
          if (active) {
            setState({ data: payload, loading: false, error: null, source: "api" });
          }
          return;
        } catch {
          if (!active) return;
        }
      }

      try {
        const payload = await loadJson(fallbackUrl);
        if (active) {
          setState({ data: payload, loading: false, error: null, source: "json" });
        }
      } catch (error) {
        if (!active) return;
        setState({ data: null, loading: false, error, source: null });
      }
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [apiUrl, fallbackUrl, attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  return { ...state, reload };
}

import { useCallback, useEffect, useState } from "react";

/**
 * Carga un archivo JSON con fetch y expone estado, error y una función
 * para reintentar. La URL es relativa a la página para que funcione tanto
 * en la raíz como en un despliegue bajo un subdirectorio.
 */
export default function useJsonData(url) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState({ data: null, loading: true, error: null });

    fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (response.ok === false) {
          throw new Error(`No se pudo cargar ${url} (HTTP ${response.status}).`);
        }
        return response.json();
      })
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!active || error.name === "AbortError") return;
        setState({ data: null, loading: false, error });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  return { ...state, reload };
}

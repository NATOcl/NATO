export default function DataStatus({ loading, error, empty, onRetry, label }) {
  if (loading) {
    return (
      <p className="data-status" role="status">
        cargando {label}…
      </p>
    );
  }

  if (error) {
    return (
      <div className="data-status data-status--error" role="alert">
        <p>No se pudieron cargar {label}. Revisa que el archivo JSON esté disponible.</p>
        {onRetry && (
          <button
            type="button"
            className="btn btn-sm btn-outline-signal"
            onClick={onRetry}
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <p className="data-status" role="status">
        Todavía no hay {label} para mostrar.
      </p>
    );
  }

  return null;
}

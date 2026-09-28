import { useEffect, useSyncExternalStore } from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus.js";
import { checkTmdbConnection, getTmdbStatus, subscribeTmdbStatus } from "../../services/tmdbClient.js";

const LABELS = {
  checking: "Conectando con TMDB…",
  connected: "TMDB conectado",
  local: "Modo catálogo local activo",
  saved: "Showing saved data",
  error: "Error conectando con TMDB",
};

/**
 * Indicador del origen de los datos. Refleja la última respuesta real de TMDB
 * (tmdbClient actualiza el estado en cada petición) y valida el token al montarse.
 */
export default function TmdbStatus({ className = "" }) {
  const status = useSyncExternalStore(subscribeTmdbStatus, getTmdbStatus);
  const online = useNetworkStatus();

  useEffect(() => {
    checkTmdbConnection(); // cacheada: solo una petición por sesión
  }, []);

  const detail = {
    local: "Sin VITE_TMDB_READ_TOKEN: se muestra el catálogo local de CINET, no datos de TMDB.",
    saved: `${status.message} Datos de TMDB guardados en este navegador; pueden estar desactualizados.`,
    error: `${status.message} Se muestra el catálogo local de CINET.`,
  }[status.state] ?? "";

  return (
    <p className={`tmdb-status ${className}`.trim()} data-state={status.state} role="status" title={detail || undefined}>
      <span className="tmdb-status-dot" aria-hidden="true" />
      {LABELS[status.state]}
      {detail && <span className="tmdb-status-detail"> — {detail}</span>}
      <span className="tmdb-status-network" data-online={online}>{online ? "En línea" : "Sin conexión"}</span>
    </p>
  );
}

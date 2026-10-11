import { Link } from "react-router-dom";
import { useDuoHistory } from "../../hooks/useDuoHistory.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useShare } from "../../hooks/useShare.js";
import { addToHistory, removeFromHistory } from "../../services/historyService.js";
import { appUrl } from "../../utils/share.js";

/** Disponibilidad y cartelera abren servicios externos; CINET no reproduce el título. */
export default function MovieActions({ movie, inCinemas = false, onOpenTrailer, onOpenWatch }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const share = useShare();
  const favorite = isFavorite(movie.id);
  // "Vistas" es el mismo historial que usa Duo (y el perfil cinéfilo).
  const { history, change } = useDuoHistory();
  const seen = history.seen.includes(movie.id);
  const toggleSeen = () => change((current) => (seen ? removeFromHistory(current, "seen", movie.id) : addToHistory(current, "seen", [movie])));

  const handleShare = () =>
    share({
      title: `${movie.title} — CINET`,
      text: `Descubre ${movie.title} y prepara un plan con CINET.`,
      url: appUrl(`movie/${movie.id}`),
    });

  return (
    <div className="movie-actions">
      <button
        id="trailer-button"
        type="button"
        className="trailer-btn"
        aria-label="Ver tráiler oficial"
        disabled={!movie.trailerKey}
        title={movie.trailerKey ? undefined : "Tráiler no disponible"}
        onClick={onOpenTrailer}
      >
        <span className="trailer-btn-icon" aria-hidden="true">▶</span>
        Ver tráiler
      </button>

      {inCinemas ? (
        <Link id="watch-button" className="watch-btn" to={`/cine/${movie.id}`} aria-label="Consultar cartelera en los sitios oficiales de los cines">
          <span aria-hidden="true">🎟️</span>
          Consultar cartelera
        </Link>
      ) : (
        <button
          id="watch-button"
          type="button"
          className="watch-btn"
          aria-label="Consultar dónde verla en plataformas de streaming"
          onClick={onOpenWatch}
        >
          <span aria-hidden="true">🎬</span>
          Dónde verla
        </button>
      )}

      {movie.type !== "tv" && <Link className="movie-action movie-action-primary" to={`/functions?movie=${movie.id}`}>
        🎟️ Organizar salida al cine
      </Link>}

      <button
        type="button"
        className={`movie-action movie-favorite${favorite ? " active" : ""}`}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(movie.id)}
      >
        {favorite ? "♥ En favoritos" : "♡ Añadir a favoritos"}
      </button>

      <button type="button" className={`movie-action${seen ? " active" : ""}`} aria-pressed={seen} onClick={toggleSeen}>
        {seen ? "👀 Ya la vi" : "👀 Marcar como vista"}
      </button>

      <Link className="movie-action" to={`/functions?movie=${movie.id}&mode=home`}>
        🏠 Plan en casa
      </Link>

      <button type="button" className="movie-action" onClick={handleShare}>
        ↗ Compartir
      </button>

      <Link className="movie-action" to={inCinemas ? "/cine" : "/movies"}>
        {inCinemas ? "← Volver a la cartelera" : "← Volver al catálogo"}
      </Link>
    </div>
  );
}

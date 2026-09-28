import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MoviePoster from "./MoviePoster.jsx";
import { titleMeta } from "../../services/recommender.js";

/**
 * Tarjeta del catálogo: toda la tarjeta abre el detalle (clic, Enter o Espacio).
 * Detalles, tráiler y favorito están siempre visibles (no dependen del hover en móvil).
 */
export default function MovieCard({ movie, index, favorite, onToggleFavorite, reason }) {
  const navigate = useNavigate();
  const [accent, setAccent] = useState(null);
  const detailPath = `/movie/${movie.id}`;

  const handleClick = (event) => {
    if (event.target.closest("a, button")) return; // los controles internos tienen su propia acción
    navigate(detailPath);
  };

  const handleKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(detailPath);
    }
  };

  return (
    <article
      className="movie-card movie-enter"
      data-movie-id={movie.id}
      tabIndex={0}
      role="link"
      style={{ "--delay": `${Math.min(index * 35, 700)}ms`, "--card-accent": accent ?? undefined }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <MoviePoster
        movie={movie}
        favorite={favorite}
        onToggleFavorite={onToggleFavorite}
        onAccent={setAccent}
      />

      <div className="movie-info">
        <h3>{movie.title}</h3>
        <p className="movie-meta">{titleMeta(movie)}</p>
        {movie.genre && <p className="movie-genres">{movie.genre}</p>}
        {movie.rating > 0 && <div className="movie-rating">★ {movie.rating}</div>}
        {reason && <p className="movie-reason">{reason}</p>}
        <p className="movie-description">{movie.description}</p>
        <div className="movie-card-links">
          <Link className="movie-card-button" to={detailPath}>
            Ver detalles →
          </Link>
          <Link className="movie-card-trailer" to={`${detailPath}?autotrailer=1`} aria-label={`Ver tráiler de ${movie.title}`}>
            ▶ Tráiler
          </Link>
        </div>
      </div>
    </article>
  );
}

import { useState } from "react";
import { extractPalette } from "../../utils/palette.js";
import { fallbackPoster } from "../../utils/poster.js";

/**
 * Póster de la tarjeta: estado y botón de favorito. Sin capa al pasar el mouse:
 * título, datos y acciones ya están debajo, así la portada siempre se ve completa.
 * Sin póster (o si no carga) muestra uno generado con el título.
 */
export default function MoviePoster({ movie, favorite, onToggleFavorite, onAccent }) {
  const [src, setSrc] = useState(movie.poster || fallbackPoster(movie));

  const handleLoad = () => extractPalette(src).then((palette) => onAccent(palette.primary));

  const handleFavorite = (event) => {
    event.stopPropagation();
    onToggleFavorite(movie.id);
  };

  return (
    <div className="movie-poster-wrapper">
      <img
        src={src}
        alt={`Portada de ${movie.title}`}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={() => setSrc(fallbackPoster(movie))}
      />

      {movie.status && (
        <span className="movie-status" data-status={movie.status}>
          {movie.status}
        </span>
      )}

      <button
        type="button"
        className={`favorite-btn${favorite ? " is-favorite" : ""}`}
        aria-label={`${favorite ? "Quitar" : "Añadir"} ${movie.title} ${favorite ? "de" : "a"} favoritos`}
        aria-pressed={favorite}
        onClick={handleFavorite}
      >
        {favorite ? "♥" : "♡"}
      </button>
    </div>
  );
}

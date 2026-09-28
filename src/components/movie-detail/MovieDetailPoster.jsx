import { useState } from "react";
import { fallbackPoster } from "../../utils/poster.js";

export default function MovieDetailPoster({ movie }) {
  const [src, setSrc] = useState(movie.poster);

  return (
    <div className="movie-poster-wrapper">
      <div className="movie-poster-glow"></div>
      <span className="movie-status">{movie.status || "CINEHUB"}</span>
      <img
        className="movie-poster"
        src={src}
        alt={`Portada de ${movie.title}`}
        onError={() => setSrc(fallbackPoster(movie))}
      />
    </div>
  );
}

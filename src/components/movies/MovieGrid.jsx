import MovieCard from "./MovieCard.jsx";
import { useFavorites } from "../../hooks/useFavorites.js";

/** Rejilla del catálogo o, con layout="row", carrusel horizontal (inicio). */
export default function MovieGrid({ movies, layout = "grid", rowRef, reason }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const cards = movies.map((movie, index) => (
    <MovieCard
      key={movie.id}
      movie={movie}
      index={index}
      favorite={isFavorite(movie.id)}
      onToggleFavorite={toggleFavorite}
      reason={reason}
    />
  ));

  if (layout === "row") {
    return (
      <div ref={rowRef} className="movie-row">
        {cards}
      </div>
    );
  }
  return <div id="movie-grid">{cards}</div>;
}

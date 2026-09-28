import PosterImage from "../common/PosterImage.jsx";

export default function SelectedMovie({ movie }) {
  return (
    <section className="selected-movie" id="selected-movie">
      <div className="selected-movie-poster" id="selected-movie-poster">
        <PosterImage src={movie.poster} alt={`Póster de ${movie.title}`} />
      </div>

      <div className="selected-movie-info">
        <span className="section-kicker">PELÍCULA SELECCIONADA</span>
        <h1 id="movie-title">{movie.title}</h1>
        <div className="selected-movie-meta" id="movie-meta">
          ⭐ {movie.rating} · {movie.year} · {movie.duration}
        </div>
        <div className="movie-tags" id="movie-tags">
          {movie.genre.split(" / ").map((genre) => (
            <span key={genre}>{genre}</span>
          ))}
        </div>
        <p id="movie-description">{movie.description}</p>
      </div>
    </section>
  );
}

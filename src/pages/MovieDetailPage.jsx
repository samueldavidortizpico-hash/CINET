import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import Loading from "../components/common/Loading.jsx";
import MovieActions from "../components/movie-detail/MovieActions.jsx";
import MovieBackdrop from "../components/movie-detail/MovieBackdrop.jsx";
import MovieDetailPoster from "../components/movie-detail/MovieDetailPoster.jsx";
import MovieExtras from "../components/movie-detail/MovieExtras.jsx";
import MovieInfo from "../components/movie-detail/MovieInfo.jsx";
import TrailerModal from "../components/movie-detail/TrailerModal.jsx";
import WatchModal from "../components/movie-detail/WatchModal.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useMovie } from "../hooks/useMovie.js";
import { getTitleExtras } from "../services/movieService.js";
import { isTmdbEnabled } from "../services/tmdbClient.js";

/** Ruta dinámica /movie/:id — el id llega por useParams(). */
export default function MovieDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { movie: baseMovie, loading, notFound } = useMovie(id);
  const { data: extras } = useAsync(
    baseMovie?.tmdbId && isTmdbEnabled() ? `extras-${baseMovie.id}` : null,
    () => getTitleExtras(baseMovie)
  );
  // Tráiler de TMDB cuando trailerKeys.json no tiene uno guardado.
  const movie =
    baseMovie && !baseMovie.trailerKey && extras?.trailerKey ? { ...baseMovie, trailerKey: extras.trailerKey } : baseMovie;
  const [modal, setModal] = useState(null); // "trailer" | "watch" | null
  const closeModal = useCallback(() => setModal(null), []);
  const autoTrailer = searchParams.get("autotrailer") === "1" && Boolean(movie?.trailerKey);
  useDocumentTitle(movie?.title ?? (notFound ? "Película no encontrada" : ""));

  // Desde "▶ Tráiler" del catálogo: abre el tráiler tras la animación de entrada.
  useEffect(() => {
    if (!autoTrailer) return undefined;
    const timer = setTimeout(() => setModal("trailer"), 600);
    return () => clearTimeout(timer);
  }, [autoTrailer]);

  return (
    <div className={`movie-page${movie ? " loaded" : ""}`}>
      <Loading done={!loading} label="Cargando película" />

      {notFound && (
        <div className="movie-error">
          <div className="movie-error-box">
            <div className="movie-error-icon">🎬</div>
            <h1>Película no encontrada</h1>
            <p>No encontramos esta película en el catálogo de CINET.</p>
            <Button to="/movies">← Volver al catálogo</Button>
          </div>
        </div>
      )}

      {movie && (
        <>
          <MovieBackdrop key={movie.id} movie={movie} />
          <section className="movie-detail" aria-labelledby="movie-title">
            <div className="movie-detail-inner">
              <MovieDetailPoster key={movie.id} movie={movie} />
              <MovieInfo movie={movie} extras={extras}>
                <MovieActions
                  movie={movie}
                  inCinemas={searchParams.get("cine") === "1"}
                  onOpenTrailer={() => setModal("trailer")}
                  onOpenWatch={() => setModal("watch")}
                />
              </MovieInfo>
            </div>
          </section>
          <MovieExtras extras={extras} />
          <TrailerModal open={modal === "trailer"} onClose={closeModal} movie={movie} />
          <WatchModal open={modal === "watch"} onClose={closeModal} movie={movie} watch={extras?.watch} />
        </>
      )}
    </div>
  );
}

import { Link } from "react-router-dom";
import { useAsync } from "../hooks/useAsync.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { getCollection } from "../services/movieService.js";
import { titleMeta } from "../services/recommender.js";
import { getTmdbStatus, isTmdbEnabled } from "../services/tmdbClient.js";
import { fallbackPoster } from "../utils/poster.js";

const LIMIT = 24;

function CinemaCard({ movie, priority }) {
  return (
    <li>
      <Link className="cine-card" to={`/movie/${movie.id}?cine=1`}>
        <span className="cine-card-poster">
          <img
            src={movie.poster || fallbackPoster(movie)}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = fallbackPoster(movie);
            }}
          />
          <span className="cine-badge">En cines</span>
        </span>
        <span className="cine-card-body">
          <strong className="cine-card-title">{movie.title}</strong>
          <span className="cine-card-meta">{titleMeta(movie)}</span>
          {movie.genre && <span className="cine-card-genre">{movie.genre}</span>}
          {movie.rating > 0 && <span className="cine-card-rating">★ {movie.rating}</span>}
        </span>
      </Link>
    </li>
  );
}

/** /cine — solo películas que TMDB registra hoy en cines de Colombia. Tocar una abre su ficha en modo cine. */
export default function CinemaPage() {
  useDocumentTitle("Cartelera");
  const { data, error } = useAsync("now-playing", () => getCollection("now-playing", LIMIT));
  const movies = data?.titles ?? [];
  // getCollection no rechaza: el estado de tmdbClient dice si falló la conexión (se lee tras la carga).
  const tmdbState = getTmdbStatus().state;

  return (
    <div className="cine-page">
      <header className="cine-hero">
        <p className="cine-kicker">Cartelera · Colombia</p>
        <h1>En cines hoy</h1>
        <p>
          Películas que se proyectan ahora en salas de Colombia. Elige una para ver su tráiler y, con «Ver película», escoger el cine donde
          comprar tus boletas.
        </p>
      </header>

      {!data && !error && (
        <ul className="cine-grid" aria-busy="true" aria-label="Cargando cartelera">
          {Array.from({ length: 8 }, (_, index) => (
            <li key={index} className="cine-skeleton" aria-hidden="true" />
          ))}
        </ul>
      )}

      {(error || (data && movies.length === 0)) && (
        <div className="cine-empty" role="status">
          <h2>{!isTmdbEnabled() ? "Cartelera no disponible sin TMDB" : tmdbState === "error" || error ? "Error al cargar la cartelera" : "Sin películas en cartelera"}</h2>
          <p>
            {!isTmdbEnabled()
              ? "Falta VITE_TMDB_READ_TOKEN. El resto de CINET usa el catálogo local, pero la cartelera real necesita TMDB: sin ella no mostramos películas que quizá ya no están en salas."
              : tmdbState === "error" || error
                ? "No hay conexión con TMDB y este navegador no tiene una cartelera guardada. Inténtalo de nuevo cuando vuelva la conexión."
                : "TMDB no respondió con películas en cines de Colombia. Inténtalo de nuevo en unos minutos."}
          </p>
        </div>
      )}

      {movies.length > 0 && (
        <>
          <p className="cine-count" aria-live="polite">
            {movies.length} películas en cartelera
          </p>
          <ul className="cine-grid">
            {movies.map((movie, index) => (
              <CinemaCard key={movie.id} movie={movie} priority={index < 4} />
            ))}
          </ul>
          {tmdbState === "saved" && (
            <p className="cine-source" role="status">
              Showing saved data — cartelera guardada de TMDB; puede no estar actualizada.
            </p>
          )}
          <p className="cine-source">Cartelera de TMDB para Colombia. Horarios y salas se confirman en la página de cada cadena.</p>
        </>
      )}
    </div>
  );
}

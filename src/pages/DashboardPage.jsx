import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import MovieGrid from "../components/movies/MovieGrid.jsx";
import PlanCard from "../components/plans/PlanCard.jsx";
import PlanStats from "../components/plans/PlanStats.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { usePlans } from "../hooks/usePlans.js";
import { getMovies, getMoviesByIds } from "../services/movieService.js";
import { HERO_PREFERENCES_KEY } from "../services/heroPreferences.js";
import { useState } from "react";

/** Ruta protegida: solo accesible con sesión iniciada (ver ProtectedRoute). */
export default function DashboardPage() {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const { plans } = usePlans();
  const { data: allMovies = [] } = useAsync("dashboard-movies", getMovies);
  const [heroPreferences, setHeroPreferences] = useLocalStorage(HERO_PREFERENCES_KEY, { featuredIds: [] });
  const [selectedMovieId, setSelectedMovieId] = useState("");
  useDocumentTitle("Dashboard");

  // Favoritas locales y de TMDB (guardadas desde Duo o la búsqueda global).
  const { data: favoriteMovies = [] } = useAsync(favorites.join(","), () => getMoviesByIds(favorites));
  const ownPlans = plans.filter((plan) => plan.ownerEmail === user.email).reverse();
  const featuredIds = Array.isArray(heroPreferences?.featuredIds) ? heroPreferences.featuredIds : [];
  const featuredMovies = featuredIds.map((id) => allMovies.find((movie) => movie.id === id)).filter(Boolean);
  const availableMovies = allMovies.filter((movie) => !featuredIds.includes(movie.id));
  const addFeatured = () => { if (selectedMovieId) { setHeroPreferences({ featuredIds: [...featuredIds, selectedMovieId] }); setSelectedMovieId(""); } };
  const removeFeatured = (id) => setHeroPreferences({ featuredIds: featuredIds.filter((movieId) => movieId !== id) });
  const makePrimary = (id) => setHeroPreferences({ featuredIds: [id, ...featuredIds.filter((movieId) => movieId !== id)] });
  const explore = <Button variant="primary" to="/movies">Explorar películas</Button>;

  return (
    <section className="catalog-section dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">TU ESPACIO</p>
          <h2>Hola, {user.name.split(" ")[0]} 👋</h2>
        </div>
        <p>Tus películas favoritas y los planes que organizas, en un solo lugar.</p>
      </div>

      <PlanStats plans={ownPlans} />

      {user.role === "admin" && (
        <section className="hero-editor" aria-labelledby="hero-editor-title">
          <div className="hero-editor-heading">
            <div><p className="eyebrow">EDITORIAL CINEHUB</p><h3 id="hero-editor-title">Controla el carrusel principal</h3><p>Elige qué película aparece primero en Inicio. Tus cambios quedan guardados en este navegador.</p></div>
            <span className="hero-editor-badge">{featuredMovies.length ? `${featuredMovies.length} fijadas` : "Automático"}</span>
          </div>
          <div className="hero-editor-controls"><label htmlFor="hero-movie">Añadir una película a tendencias</label><div className="hero-editor-row"><select id="hero-movie" value={selectedMovieId} onChange={(event) => setSelectedMovieId(event.target.value)}><option value="">Selecciona una película…</option>{availableMovies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select><button type="button" className="btn btn-primary" onClick={addFeatured} disabled={!selectedMovieId}>Añadir</button>{featuredIds.length > 0 && <button type="button" className="btn" onClick={() => setHeroPreferences({ featuredIds: [] })}>Volver a automático</button>}</div></div>
          {featuredMovies.length > 0 ? <ol className="hero-editor-list">{featuredMovies.map((movie, index) => <li key={movie.id} className={index === 0 ? "is-primary" : ""}><span className="hero-editor-number">{index + 1}</span><img src={movie.poster} alt="" /><span className="hero-editor-title">{movie.title}<small>{index === 0 ? "Aparece primero" : "En el carrusel"}</small></span>{index > 0 && <button type="button" className="hero-editor-action" onClick={() => makePrimary(movie.id)}>Hacer principal</button>}<button type="button" className="hero-editor-remove" onClick={() => removeFeatured(movie.id)} aria-label={`Quitar ${movie.title}`}>×</button></li>)}</ol> : <p className="hero-editor-empty">El carrusel usa automáticamente las tendencias más populares.</p>}
        </section>
      )}

      <h3 className="dashboard-title">❤️ Tus favoritas ({favoriteMovies.length})</h3>
      {favoriteMovies.length > 0 ? (
        <MovieGrid movies={favoriteMovies} />
      ) : (
        <EmptyState icon="💔" title="Aún no tienes favoritas" action={explore}>
          Marca películas con ♥ desde el catálogo.
        </EmptyState>
      )}

      <h3 className="dashboard-title">🍿 Planes que organizas ({ownPlans.length})</h3>
      {ownPlans.length > 0 ? (
        <div className="plans-list">
          {ownPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <EmptyState icon="🎟️" title="Aún no organizas planes" action={explore}>
          Elige una película y una función para invitar a tus amigos.
        </EmptyState>
      )}
    </section>
  );
}

import { useState } from "react";
import EmptyState from "../components/common/EmptyState.jsx";
import SkeletonRow from "../components/common/SkeletonRow.jsx";
import TmdbStatus from "../components/common/TmdbStatus.jsx";
import AdvancedFilters from "../components/movies/AdvancedFilters.jsx";
import MovieFilters from "../components/movies/MovieFilters.jsx";
import MovieGrid from "../components/movies/MovieGrid.jsx";
import MovieSearch from "../components/movies/MovieSearch.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useMovies } from "../hooks/useMovies.js";
import { useTitleSearch } from "../hooks/useTitleSearch.js";
import { EMPTY_ADVANCED } from "../services/movieService.js";
import { isTmdbEnabled } from "../services/tmdbClient.js";

const PEOPLE_PREVIEW = 6; // en "Todos" las personas acompañan; los títulos van primero
const DEPARTMENTS = { Acting: "Actuación", Directing: "Dirección", Writing: "Guion", Production: "Producción" };

function PeopleResults({ people, limit, onPick }) {
  if (!people.length) return null;
  return (
    <div className="people-results">
      <h3>Personas</h3>
      <ul>
        {people.slice(0, limit).map((person) => (
          <li key={person.id}>
            <button type="button" className="person-chip" onClick={() => onPick(person)}>
              {person.photo ? <img src={person.photo} alt="" loading="lazy" /> : <span aria-hidden="true">👤</span>}
              <span>
                <strong>{person.name}</strong>
                <small>
                  {DEPARTMENTS[person.department] ?? person.department}
                  {person.knownFor.length > 0 && ` · ${person.knownFor.map((title) => title.title).join(", ")}`}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Catálogo: buscador global, filtros laterales y resultados por categoría (TMDB o catálogo local). */
export default function MoviesPage() {
  const { results: localResults, loading: localLoading, filters, setFilter, setQuery } = useMovies();
  const search = useTitleSearch(filters);
  const [tab, setTab] = useState("all");
  useDocumentTitle("Películas");

  // Si TMDB falla se muestra el catálogo local con un aviso.
  const useRemote = search.remote && !search.error;
  const results = useRemote ? search.titles : localResults;
  const loading = useRemote ? search.loading : localLoading;
  const people = useRemote ? search.people : [];

  const tabs = [
    ["all", "Todos", results.length + people.length],
    ["movie", "Películas", results.filter((title) => title.type !== "tv").length],
    ["tv", "Series", results.filter((title) => title.type === "tv").length],
    ["person", "Personas", people.length],
  ];
  const showTabs = useRemote && (people.length > 0 || results.some((title) => title.type === "tv"));
  const current = showTabs ? tab : "all";
  const visible = current === "all" ? results : results.filter((title) => (title.type === "tv" ? "tv" : "movie") === current);
  const s = visible.length === 1 ? "" : "s";
  const found = useRemote ? `título${s} encontrado${s}` : `película${s} encontrada${s}`;

  const pickPerson = (person) => {
    setQuery("");
    setFilter("advanced", { ...EMPTY_ADVANCED, person: { id: person.id, name: person.name } });
    setTab("all");
  };

  return (
    <section id="peliculas" className="catalog-section catalog-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">EXPLORAR</p>
          <h2>Películas y series</h2>
        </div>
        <p>
          {isTmdbEnabled()
            ? "Busca películas, series, actores y directores en TMDB, o explora el catálogo de CINET."
            : "Explora películas de Marvel, DC, ciencia ficción, acción, aventura y animación."}
        </p>
      </div>

      <TmdbStatus />
      <MovieSearch className="catalog-search" count={useRemote ? results.length : undefined} />

      <div className="catalog-layout">
        <AdvancedFilters />

        <div className="catalog-main">
          <MovieFilters />

          {search.error && (
            <p className="catalog-notice" role="status">
              {search.error.message} Mostrando el catálogo local de CINET.
            </p>
          )}

          {showTabs && (
            <div className="result-tabs" role="tablist" aria-label="Categorías de resultados">
              {tabs.filter(([value, , total]) => value === "all" || total > 0).map(([value, label, total]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={current === value}
                  className={`result-tab${current === value ? " is-active" : ""}`}
                  onClick={() => setTab(value)}
                >
                  {label} <span>{total}</span>
                </button>
              ))}
            </div>
          )}

          <p id="results-count" aria-live="polite">
            {loading ? (
              useRemote ? "Buscando en TMDB..." : "Cargando películas..."
            ) : current === "person" ? (
              <>
                <strong>{people.length}</strong> persona{people.length === 1 ? "" : "s"}
              </>
            ) : (
              <>
                <strong>{visible.length}</strong> {found}
              </>
            )}
          </p>

          {loading && <SkeletonRow variant="grid" count={10} label="Buscando títulos…" />}
          {!loading && current !== "person" && visible.length > 0 && <MovieGrid movies={visible} />}
          {!loading && (current === "all" || current === "person") && (
            <PeopleResults people={people} limit={current === "person" ? people.length : PEOPLE_PREVIEW} onPick={pickPerson} />
          )}
          {!loading && visible.length === 0 && current !== "person" && (
            <EmptyState id="no-results" title={useRemote ? "No encontramos resultados" : "No encontramos esa película"}>
              Prueba con otro nombre o quita algún filtro.
            </EmptyState>
          )}

          {!loading && useRemote && search.hasMore && (
            <div className="section-cta">
              <button type="button" className="btn btn-primary" disabled={search.loadingMore} onClick={search.loadMore}>
                {search.loadingMore ? "Cargando..." : "Cargar más"}
              </button>
            </div>
          )}

          {useRemote && <p className="tmdb-attribution">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>}
        </div>
      </div>
    </section>
  );
}

import { useMovies } from "../../hooks/useMovies.js";
import { GENRE_FILTERS, SORT_OPTIONS } from "../../services/movieService.js";

/** Barra de filtros por género y orden del catálogo. */
export default function MovieFilters() {
  const { filters, setGenre, setSort } = useMovies();

  return (
    <div className="catalog-toolbar">
      <div className="filter-group" role="group" aria-label="Filtros de películas">
        {GENRE_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`filter-btn${filters.genre === value ? " active" : ""}`}
            aria-pressed={filters.genre === value}
            onClick={() => setGenre(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <select
        id="sort-movies"
        aria-label="Ordenar películas"
        value={filters.sort}
        onChange={(event) => setSort(event.target.value)}
      >
        {SORT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

import { useContext, useMemo } from "react";
import { MovieContext } from "../context/MovieContext.jsx";
import { queryMovies } from "../services/movieService.js";

/** Catálogo cargado + búsqueda, filtro por género y orden. */
export function useMovies() {
  const context = useContext(MovieContext);
  if (!context) throw new Error("useMovies debe usarse dentro de <MovieProvider>.");

  const { movies, filters, setFilter } = context;
  const results = useMemo(() => queryMovies(movies, filters), [movies, filters]);

  return {
    ...context,
    results,
    setQuery: (query) => setFilter("query", query),
    setGenre: (genre) => setFilter("genre", genre),
    setSort: (sort) => setFilter("sort", sort),
  };
}

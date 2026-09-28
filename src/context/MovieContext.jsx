import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { EMPTY_ADVANCED, getMovies } from "../services/movieService.js";

export const MovieContext = createContext(null);

const INITIAL_FILTERS = { query: "", genre: "todas", sort: "default", advanced: EMPTY_ADVANCED };

/**
 * Catálogo y filtros compartidos: lo que se escribe en el buscador del
 * inicio sigue aplicado al llegar a /movies, sin pasar props.
 */
export function MovieProvider({ children }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  useEffect(() => {
    let active = true;
    getMovies().then((list) => {
      if (!active) return;
      setMovies(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const setFilter = useCallback((name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
  }, []);

  const value = useMemo(
    () => ({ movies, loading, filters, setFilter }),
    [movies, loading, filters, setFilter]
  );

  return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>;
}

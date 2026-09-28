import { useEffect, useState } from "react";
import { isAdvancedActive, searchCatalog } from "../services/movieService.js";
import { isTmdbEnabled } from "../services/tmdbClient.js";

const DEBOUNCE_MS = 400;
const EMPTY = { key: null, titles: [], people: [], page: 0, totalPages: 0, error: null, loadingMore: false };

/** Valor que solo cambia tras `delay` ms sin cambios (búsqueda mientras se escribe). */
export function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const unique = (list) => list.filter((item, index) => list.findIndex((other) => other.id === item.id) === index);

/**
 * Búsqueda remota del catálogo (TMDB) con debounce y "Cargar más".
 * Solo se activa con token y cuando hay texto o filtros avanzados;
 * si no, la página sigue usando el catálogo local de siempre.
 */
export function useTitleSearch(filters) {
  const remote = isTmdbEnabled() && (filters.query.trim() !== "" || isAdvancedActive(filters.advanced));
  const key = useDebounced(remote ? JSON.stringify(filters) : null, DEBOUNCE_MS);
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    searchCatalog(JSON.parse(key), 1).then(
      (result) => active && setState({ ...EMPTY, key, ...result }),
      (error) => active && setState({ ...EMPTY, key, error })
    );
    return () => {
      active = false;
    };
  }, [key]);

  const loadMore = () => {
    setState((current) => ({ ...current, loadingMore: true }));
    searchCatalog(JSON.parse(key), state.page + 1).then(
      (result) =>
        setState((current) =>
          current.key !== key
            ? current
            : {
                ...current,
                titles: unique([...current.titles, ...result.titles]),
                people: unique([...current.people, ...result.people]),
                page: result.page,
                totalPages: result.totalPages,
                loadingMore: false,
              }
        ),
      (error) => setState((current) => ({ ...current, error, loadingMore: false }))
    );
  };

  const current = remote && state.key === key && key !== null;
  return {
    remote,
    loading: remote && !current,
    titles: current ? state.titles : [],
    people: current ? state.people : [],
    error: current ? state.error : null,
    hasMore: current && state.page < state.totalPages,
    loadingMore: current && state.loadingMore,
    loadMore,
  };
}

import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PosterImage from "../common/PosterImage.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useLocalStorage } from "../../hooks/useLocalStorage.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useMovies } from "../../hooks/useMovies.js";
import { useTheme } from "../../hooks/useTheme.js";
import { useDebounced } from "../../hooks/useTitleSearch.js";
import { isCommandInput, resolveCommand } from "../../services/commands.js";
import { EMPTY_ADVANCED, queryMovies, searchCatalog } from "../../services/movieService.js";
import { isTmdbEnabled } from "../../services/tmdbClient.js";
import { activeSuggestionIndex } from "../../utils/searchSuggestions.js";

const HISTORY_KEY = "cinehub-search-history";
const HISTORY_LIMIT = 8;
const PER_GROUP = 4;
const DEPARTMENTS = { Acting: "Actuación", Directing: "Dirección", Writing: "Guion", Production: "Producción" };

// Miniaturas: la versión w92 del póster pesa ~10 veces menos que la w500.
const thumb = (url) => url?.replace("/t/p/w500/", "/t/p/w92/");

/**
 * Buscador global con autocompletado (películas, series y personas),
 * búsquedas recientes y navegación por teclado. Ctrl + K lo enfoca.
 * El texto vive en MovieContext: /movies muestra los resultados completos.
 */
export default function MovieSearch({ onSubmit, className = "", label, count: remoteCount }) {
  const { filters, results, movies, setQuery, setFilter } = useMovies();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const inputRef = useRef(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [storedHistory, setHistory] = useLocalStorage(HISTORY_KEY, []);
  const history = Array.isArray(storedHistory) ? storedHistory : [];
  const tmdb = isTmdbEnabled();

  useEffect(() => {
    const onKeyDown = (event) => {
      const input = inputRef.current;
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.focus();
        input.select();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const query = filters.query.trim();
  // "/" abre el modo comandos: atajos a partes de la app según el rol (ver services/commands.js).
  const commandMode = isCommandInput(filters.query);
  const commands = commandMode ? resolveCommand(filters.query, user) : null;
  const debounced = useDebounced(query, 250);
  const { data: remote } = useAsync(open && tmdb && !commandMode && debounced.length >= 2 ? `suggest-${debounced}` : null, () =>
    searchCatalog({ query: debounced, genre: "todas", sort: "default", advanced: EMPTY_ADVANCED }, 1)
  );

  const titles = tmdb ? (remote?.titles ?? []) : query.length >= 2 ? queryMovies(movies, { query }) : [];
  const groups = commandMode
    ? commands.options.length
      ? [["Comandos", commands.options.map(({ command, action }) => ({ kind: "command", item: { id: command.name, command, action } }))]]
      : []
    : query.length >= 2
      ? [
          ["Películas", titles.filter((title) => title.type !== "tv").map((item) => ({ kind: "title", item }))],
          ["Series", titles.filter((title) => title.type === "tv").map((item) => ({ kind: "title", item }))],
          ["Personas", (remote?.people ?? []).map((item) => ({ kind: "person", item }))],
        ]
          .map(([heading, items]) => [heading, items.slice(0, PER_GROUP)])
          .filter(([, items]) => items.length)
      : history.length
        ? [["Búsquedas recientes", history.map((item) => ({ kind: "recent", item }))]]
        : [];
  const options = groups.flatMap(([, items]) => items);
  const selectedIndex = activeSuggestionIndex(active, options.length);
  const searching = tmdb && !commandMode && query.length >= 2 && (!remote || debounced !== query);
  const expanded = open && (groups.length > 0 || searching || Boolean(commands?.message));

  const count = remoteCount ?? results.length;
  const noun = remoteCount == null ? "película" : "resultado";
  const status = commandMode ? (commands.message ?? `${commands.options.length} comandos disponibles`) : query ? `${count} ${noun}${count === 1 ? " coincide" : "s coinciden"} con "${query}"` : "";

  const remember = (text) =>
    text && setHistory((list) => [text, ...(Array.isArray(list) ? list : []).filter((item) => item.toLowerCase() !== text.toLowerCase())].slice(0, HISTORY_LIMIT));

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const runCommand = ({ command, action }) => {
    if (!action) {
      // /sala necesita su código: se deja escrito para completarlo.
      setQuery(`/${command.name} `);
      inputRef.current.focus();
      return;
    }
    setQuery("");
    close();
    inputRef.current.blur();
    if (action.type === "navigate") navigate(action.to);
    else if (action.type === "theme") toggleTheme();
    else if (action.type === "logout") logout().finally(() => navigate("/home"));
  };

  const choose = ({ kind, item }) => {
    if (kind === "command") {
      runCommand(item);
      return;
    }
    if (kind === "recent") {
      setQuery(item);
      setActive(-1);
      inputRef.current.focus();
      return;
    }
    remember(query);
    close();
    if (kind === "title") {
      navigate(`/movie/${item.id}`);
    } else {
      // Actor o director: explorar sus títulos en el catálogo.
      setQuery("");
      setFilter("advanced", { ...EMPTY_ADVANCED, person: { id: item.id, name: item.name } });
      navigate("/movies");
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(activeSuggestionIndex(index, options.length) + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(activeSuggestionIndex(index, options.length) - 1, -1));
    } else if (event.key === "Enter" && expanded && selectedIndex >= 0) {
      event.preventDefault();
      choose(options[selectedIndex]);
    } else if (event.key === "Escape") {
      if (expanded) close();
      else inputRef.current.blur();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (commandMode) {
      // Enter sin elegir: ejecuta el comando si es uno solo y está completo.
      if (commands.options.length === 1 && commands.options[0].action) runCommand(commands.options[0]);
      return;
    }
    remember(query);
    close();
    onSubmit?.();
  };

  return (
    <form
      className={`search-form ${className}`.trim()}
      role="search"
      onSubmit={handleSubmit}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && close()}
    >
      <label htmlFor="search">{label ?? (tmdb ? "Buscar películas, series o personas" : "Buscar película")}</label>
      <div className="search-row">
        <div className="search-box">
          <input
            ref={inputRef}
            id="search"
            type="search"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={selectedIndex >= 0 ? `${listId}-${selectedIndex}` : undefined}
            placeholder={tmdb ? "🔎 Películas, series, actores, directores…" : "🔎 Avengers, Batman, Interstellar..."}
            autoComplete="off"
            value={filters.query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={handleKeyDown}
          />

          {expanded && (
            <div className="search-suggest">
              <div id={listId} role="listbox" aria-label="Sugerencias de búsqueda">
                {groups.map(([heading, items]) => (
                  <div key={heading} role="group" aria-label={heading}>
                    <p className="suggest-heading" aria-hidden="true">
                      {heading}
                    </p>
                    {items.map((option) => {
                      const index = options.indexOf(option);
                      const { kind, item } = option;
                      return (
                        <button
                          key={`${kind}-${item.id ?? item}`}
                          id={`${listId}-${index}`}
                          type="button"
                          role="option"
                          aria-selected={index === selectedIndex}
                          className={`suggest-item${index === selectedIndex ? " is-active" : ""}`}
                          onClick={() => choose(option)}
                        >
                          {kind === "recent" ? (
                            <span className="suggest-icon" aria-hidden="true">🕘</span>
                          ) : kind === "command" ? (
                            <span className="suggest-icon suggest-command" aria-hidden="true">/</span>
                          ) : (
                            <span className={`suggest-thumb${kind === "person" ? " is-person" : ""}`}>
                              <PosterImage src={thumb(kind === "person" ? item.photo : item.poster)} alt="" fallback={kind === "person" ? "👤" : "🎬"} />
                            </span>
                          )}
                          <span className="suggest-text">
                            <strong>{kind === "recent" ? item : kind === "person" ? item.name : kind === "command" ? `/${item.command.name}` : item.title}</strong>
                            {kind === "command" && <small>{item.command.label}</small>}
                            {kind === "title" && <small>{[item.year, `★ ${item.rating}`].filter(Boolean).join(" · ")}</small>}
                            {kind === "person" && <small>{DEPARTMENTS[item.department] ?? item.department} · ver sus títulos</small>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              {searching && <p className="suggest-status">Buscando en TMDB…</p>}
              {commands?.message && <p className="suggest-status">{commands.message}</p>}
              {!query && history.length > 0 && (
                <button type="button" className="suggest-clear" onClick={() => setHistory([])}>
                  Borrar búsquedas recientes
                </button>
              )}
            </div>
          )}
        </div>
        <button className="btn" type="submit">
          Buscar
        </button>
      </div>
      <p className="search-hint">
        Presiona <strong>Ctrl + K</strong> para buscar · <strong>/</strong> para comandos · <strong>↑ ↓</strong> para moverte por las sugerencias.
      </p>
      <p id="search-status" className="search-status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}

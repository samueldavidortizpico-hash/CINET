import { useState } from "react";
import Button from "../common/Button.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useDebounced } from "../../hooks/useTitleSearch.js";
import { addToHistory, removeFromHistory } from "../../services/historyService.js";
import { EMPTY_ADVANCED, getCollection, getMovies, getTrendingMovies, queryMovies, searchCatalog } from "../../services/movieService.js";
import { isTmdbEnabled } from "../../services/tmdbClient.js";

const QUICK_LIMIT = 12;

/** Búsqueda de un solo tipo: TMDB si hay token; si no, el catálogo local (solo películas). */
async function findTitles(type, query) {
  if (isTmdbEnabled()) {
    const { titles } = await searchCatalog({ query, genre: "todas", sort: "default", advanced: { ...EMPTY_ADVANCED, type } });
    return titles.filter((title) => title.type === type).slice(0, 8);
  }
  return type === "movie" ? queryMovies(await getMovies(), { query }).slice(0, 8) : [];
}

async function popularTitles(type) {
  const { titles } = await getCollection(type === "tv" ? "popular-tv" : "popular-movies", QUICK_LIMIT);
  if (titles.length || type === "tv") return titles;
  return getTrendingMovies(await getMovies(), QUICK_LIMIT);
}

function SeenToggle({ title, seen, onToggle }) {
  return (
    <button type="button" className="duo-seen-toggle" aria-pressed={seen} onClick={() => onToggle(title)}>
      <span className="duo-seen-poster">
        <PosterImage src={title.poster} alt="" />
        {seen && (
          <span className="duo-seen-check" aria-hidden="true">
            ✓
          </span>
        )}
      </span>
      <span className="duo-seen-name">
        {title.title} {title.year && <small>({title.year})</small>}
      </span>
      <span className="visually-hidden">{seen ? "— marcada como vista" : "— marcar como vista"}</span>
    </button>
  );
}

/** Paso 4: lo que ya vieron no se recomienda (se guarda en el historial y se puede recuperar). */
export default function DuoSeenStep({ type, history, onHistory, onOpenHistory, onBack, onNext }) {
  const [text, setText] = useState("");
  const query = useDebounced(text.trim(), 350);
  const { data: found = [], loading, error } = useAsync(query.length >= 2 ? `seen-${type}-${query}` : null, () => findTitles(type, query));
  const { data: popular } = useAsync(`seen-popular-${type}`, () => popularTitles(type));
  const noun = type === "tv" ? "series" : "películas";
  const seenOfType = history.seen.filter((id) => (history.titles[id]?.type ?? (id.startsWith("tmdb-tv-") ? "tv" : "movie")) === type);

  const toggle = (title) =>
    onHistory((current) => (current.seen.includes(title.id) ? removeFromHistory(current, "seen", title.id) : addToHistory(current, "seen", [title])));

  return (
    <section className="duo-step" aria-labelledby="duo-seen-title">
      <h2 id="duo-seen-title">¿Qué {noun} ya vieron?</h2>
      <p className="duo-lead">No se las volveremos a recomendar. Si cambian de opinión, las recuperan desde «Ver títulos excluidos».</p>

      <label className="duo-field">
        <span>Buscar {noun}</span>
        <input type="search" autoComplete="off" placeholder={type === "tv" ? "Ej. Breaking Bad" : "Ej. Interstellar"} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div aria-live="polite">
        {loading && <p className="duo-fineprint">Buscando…</p>}
        {error && <p className="duo-fineprint">No pudimos buscar ahora mismo ({error.message}).</p>}
        {query.length >= 2 && !loading && !error && found.length === 0 && (
          <p className="duo-fineprint">
            {type === "tv" && !isTmdbEnabled() ? "Buscar series necesita conexión con TMDB." : `No encontramos ${noun} con «${query}».`}
          </p>
        )}
      </div>
      {found.length > 0 && (
        <div className="duo-seen-grid">
          {found.map((title) => (
            <SeenToggle key={title.id} title={title} seen={history.seen.includes(title.id)} onToggle={toggle} />
          ))}
        </div>
      )}

      <h3 className="duo-subtitle">Populares ahora</h3>
      {!popular && <p className="duo-fineprint">Cargando…</p>}
      {popular?.length === 0 && <p className="duo-fineprint">Sin conexión con TMDB no hay {noun} populares para marcar.</p>}
      {popular?.length > 0 && (
        <div className="duo-seen-grid">
          {popular
            .filter((title) => title.type === type)
            .map((title) => (
              <SeenToggle key={title.id} title={title} seen={history.seen.includes(title.id)} onToggle={toggle} />
            ))}
        </div>
      )}

      <p className="duo-fineprint">
        {seenOfType.length ? `${seenOfType.length} ${noun} marcadas como vistas.` : `Ninguna de sus ${noun} está marcada como vista.`}{" "}
        <button type="button" className="duo-link" onClick={onOpenHistory}>
          Ver títulos excluidos
        </button>
      </p>

      <div className="duo-actions">
        <Button variant="secondary" onClick={onBack}>
          ← Atrás
        </Button>
        <Button variant="primary" className="duo-cta" onClick={onNext}>
          Ver lo que tienen en común →
        </Button>
      </div>
    </section>
  );
}

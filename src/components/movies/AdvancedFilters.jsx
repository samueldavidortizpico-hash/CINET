import { useState } from "react";
import { PLATFORMS } from "../../data/platforms.js";
import { GENRES, LANGUAGES, REGIONS } from "../../data/tmdb.js";
import { useMovies } from "../../hooks/useMovies.js";
import { EMPTY_ADVANCED, isAdvancedActive } from "../../services/movieService.js";
import { isTmdbEnabled } from "../../services/tmdbClient.js";

const RUNTIMES = [90, 120, 150];
const RATINGS = [6, 7, 8];

function Select({ label, name, value, onChange, children }) {
  return (
    <label className="advanced-field">
      <span>{label}</span>
      <select name={name} value={value} onChange={onChange}>
        {children}
      </select>
    </label>
  );
}

/**
 * Panel de filtros: lateral en escritorio, desplegable en móvil.
 * Con TMDB se combinan con la búsqueda (/search + filtros) o usan /discover;
 * sin TMDB filtran el catálogo local.
 */
export default function AdvancedFilters() {
  const { filters, setFilter } = useMovies();
  const [open, setOpen] = useState(false);
  const advanced = filters.advanced;
  const active = isAdvancedActive(advanced);
  const change = (event) => setFilter("advanced", { ...advanced, [event.target.name]: event.target.value });

  return (
    <aside className={`advanced-filters${open ? " is-open" : ""}`} aria-label="Filtros">
      <button type="button" className="advanced-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        ⚙️ Filtros{active && <span className="advanced-dot" aria-label="(activos)" />}
      </button>

      <div className="advanced-panel">
        <h2 className="advanced-title">Filtros</h2>

        {advanced.person && (
          <p className="advanced-person">
            🎭 Con <strong>{advanced.person.name}</strong>
            <button type="button" aria-label={`Quitar ${advanced.person.name}`} onClick={() => setFilter("advanced", { ...advanced, person: null })}>
              ✕
            </button>
          </p>
        )}

        <div className="advanced-grid">
          <Select label="Tipo" name="type" value={advanced.type} onChange={change}>
            <option value="movie">Películas</option>
            <option value="tv">Series</option>
          </Select>
          <Select label="Género" name="genre" value={advanced.genre} onChange={change}>
            <option value="">Todos</option>
            {GENRES.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
          <label className="advanced-field">
            <span>Año</span>
            <input name="year" type="number" min="1900" max="2100" inputMode="numeric" placeholder="2024" value={advanced.year} onChange={change} />
          </label>
          <Select label="Puntuación mínima" name="ratingMin" value={advanced.ratingMin} onChange={change}>
            <option value="">Cualquiera</option>
            {RATINGS.map((rating) => (
              <option key={rating} value={rating}>★ {rating}+</option>
            ))}
          </Select>
          <Select label="Duración máxima" name="runtimeMax" value={advanced.runtimeMax} onChange={change}>
            <option value="">Cualquiera</option>
            {RUNTIMES.map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} min</option>
            ))}
          </Select>
          <Select label="Idioma original" name="language" value={advanced.language} onChange={change}>
            <option value="">Cualquiera</option>
            {LANGUAGES.map(({ code, name }) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </Select>
          <Select label="Plataforma" name="provider" value={advanced.provider} onChange={change}>
            <option value="">Todas</option>
            {PLATFORMS.map(({ id, name }) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </Select>
          <Select label="Región" name="region" value={advanced.region} onChange={change}>
            {REGIONS.map(({ code, name }) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </Select>
          <label className="advanced-field">
            <span>Estreno desde</span>
            <input name="releaseFrom" type="date" value={advanced.releaseFrom} onChange={change} />
          </label>
          <label className="advanced-field">
            <span>Estreno hasta</span>
            <input name="releaseTo" type="date" value={advanced.releaseTo} onChange={change} />
          </label>
        </div>

        {!isTmdbEnabled() && (
          <p className="advanced-note">Sin conexión a TMDB: series, idioma, región y plataforma no se aplican al catálogo local.</p>
        )}
        <button type="button" className="filter-btn advanced-clear" disabled={!active} onClick={() => setFilter("advanced", EMPTY_ADVANCED)}>
          Limpiar filtros
        </button>
      </div>
    </aside>
  );
}

import Button from "../common/Button.jsx";
import Icon from "../common/Icon.jsx";
import PlatformLogo from "../movie-detail/PlatformLogo.jsx";
import { ChoiceChips, Question } from "./DuoFields.jsx";
import { MARATHON_SCOPES, MARATHON_STYLES, MODES, SESSION_LENGTHS } from "../../data/duo.js";
import { PLATFORMS } from "../../data/platforms.js";
import { REGIONS, regionName } from "../../data/tmdb.js";
import { useAsync } from "../../hooks/useAsync.js";
import { getWatchProviders, isTmdbEnabled } from "../../services/tmdbClient.js";

const COUNTS = { movie: [2, 3, 4, 5, 6], tv: [2, 4, 6, 8, 10, 12] };
const MARATHON_TYPES = [
  { value: "movie", label: "Películas" },
  { value: "tv", label: "Episodios de series" },
];

/** Paso 1: modo (película, serie o maratón), ajustes de la maratón, región y plataformas. */
export default function DuoModeStep({ session, onChange, onNext }) {
  const { marathon } = session;
  const setMarathon = (patch) => onChange({ marathon: { ...marathon, ...patch } });
  // Con TMDB se avisa qué plataformas no figuran en la región elegida.
  const { data: available } = useAsync(isTmdbEnabled() ? `providers-${session.region}` : null, () =>
    getWatchProviders("movie", session.region)
  );
  const availableIds = available?.map((provider) => provider.id);
  const toggleProvider = (id) =>
    onChange({
      providers: session.providers.includes(id) ? session.providers.filter((item) => item !== id) : [...session.providers, id],
    });

  return (
    <section className="duo-step" aria-labelledby="duo-mode-title">
      <p className="duo-overline">PRIMERO, EL PLAN</p>
      <h2 id="duo-mode-title">¿Cómo se ve su noche ideal?</h2>
      <p className="duo-lead">Elijan un formato. Después llega el turno de los gustos de cada uno.</p>

      <fieldset className="duo-fieldset">
        <legend className="visually-hidden">Modo de Duo</legend>
        <div className="duo-modes">
          {MODES.map((mode) => (
            <label key={mode.key} className={`duo-mode-card duo-format-${mode.key}`}>
              <input type="radio" name="duo-mode" checked={session.mode === mode.key} onChange={() => onChange({ mode: mode.key })} />
              <span className="duo-mode-art" aria-hidden="true"><span /><span /><Icon name={mode.key === "movie" ? "film" : mode.key === "tv" ? "screen" : "layers"} /></span>
              <span className="duo-mode-selected" aria-hidden="true"><Icon name="check" /></span>
              <strong>{mode.label}</strong>
              <small>{mode.text}</small>
            </label>
          ))}
        </div>
      </fieldset>

      {session.mode === "marathon" && (
        <div className="duo-marathon-settings">
          <Question title="¿Películas o episodios?">
            <ChoiceChips
              name="duo-marathon-type"
              options={MARATHON_TYPES}
              value={marathon.type}
              onChange={(type) => setMarathon({ type, count: type === "tv" ? 6 : 3 })}
            />
          </Question>

          <div className="duo-row">
            <label className="duo-field">
              <span>Duración máxima de la sesión</span>
              <select value={marathon.maxMinutes} onChange={(event) => setMarathon({ maxMinutes: Number(event.target.value) })}>
                {SESSION_LENGTHS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="duo-field">
              <span>{marathon.type === "tv" ? "Episodios (aprox.)" : "Películas (aprox.)"}</span>
              <select value={marathon.count} onChange={(event) => setMarathon({ count: Number(event.target.value) })}>
                {COUNTS[marathon.type].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Question title="Estilo de la maratón">
            <div className="duo-styles">
              {MARATHON_STYLES.map((style) => (
                <label key={style.key} className="duo-mode-card duo-style-card">
                  <input type="radio" name="duo-marathon-style" checked={marathon.style === style.key} onChange={() => setMarathon({ style: style.key })} />
                  <span className="duo-mode-icon" aria-hidden="true">
                    {style.icon}
                  </span>
                  <strong>{style.label}</strong>
                  <small>{style.text}</small>
                </label>
              ))}
            </div>
          </Question>

          <Question
            title="¿Saga o mezcla?"
            hint={marathon.type === "tv" ? "Con series, «saga» significa episodios seguidos de una sola serie." : "Una saga o universo se ve en orden de estreno."}
          >
            <ChoiceChips
              name="duo-marathon-scope"
              options={MARATHON_SCOPES.map(({ key, label }) => ({ value: key, label }))}
              value={marathon.scope}
              onChange={(scope) => setMarathon({ scope })}
            />
          </Question>
          <p className="duo-fineprint">Los géneros y el tono los elige cada persona en los pasos siguientes.</p>
        </div>
      )}

      <Question title="¿Dónde lo verán?" hint="Opcional: si marcan plataformas, solo recomendamos lo que está en ellas.">
        <label className="duo-field duo-field-inline">
          <span>Región</span>
          <select value={session.region} onChange={(event) => onChange({ region: event.target.value })}>
            {REGIONS.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="duo-platforms">
          {PLATFORMS.map((platform) => {
            const inRegion = !availableIds || platform.tmdbIds.some((id) => availableIds.includes(id));
            return (
              <button
                key={platform.id}
                type="button"
                className="duo-platform"
                style={{ "--brand": platform.brand }}
                aria-pressed={session.providers.includes(platform.id)}
                onClick={() => toggleProvider(platform.id)}
              >
                <span className="duo-platform-logo" aria-hidden="true">
                  <PlatformLogo id={platform.id} />
                </span>
                <span className="duo-platform-name">{platform.name}</span>
                {!inRegion && <small>No figura en {regionName(session.region)}</small>}
              </button>
            );
          })}
        </div>
        <p className="duo-fineprint">🔒 Solo guardamos en este navegador qué plataformas marcaron; nunca usuarios ni contraseñas.</p>
      </Question>

      <div className="duo-actions">
        <Button variant="primary" className="duo-cta" onClick={onNext}>
          Ahora, nuestros gustos <Icon name="arrow" />
        </Button>
      </div>
    </section>
  );
}

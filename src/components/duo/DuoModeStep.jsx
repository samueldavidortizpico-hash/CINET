import { useState } from "react";
import Button from "../common/Button.jsx";
import Icon from "../common/Icon.jsx";
import PlatformLogo from "../movie-detail/PlatformLogo.jsx";
import { ChoiceChips, Question } from "./DuoFields.jsx";
import { SeatAvatar } from "./DuoSeats.jsx";
import { FAMILY_LEVELS, familyFilter, GROUPS, groupOf, MARATHON_SCOPES, MARATHON_STYLES, MAX_PEOPLE, MODES, personName, SESSION_LENGTHS, TONES } from "../../data/duo.js";
import { PLATFORMS } from "../../data/platforms.js";
import { REGIONS, regionName } from "../../data/tmdb.js";
import { useAsync } from "../../hooks/useAsync.js";
import { moodLabel } from "../../services/duoExperience.js";
import { getWatchProviders, isTmdbEnabled } from "../../services/tmdbClient.js";

const COUNTS = { movie: [2, 3, 4, 5, 6], tv: [2, 4, 6, 8, 10, 12] };
const MARATHON_TYPES = [
  { value: "movie", label: "Películas" },
  { value: "tv", label: "Episodios de series" },
];
const MIN_GROUP = 3;

/** Pósteres del escenario según la ocasión (catálogo local: decorativos, nunca una recomendación). */
const FANS = {
  date: ["forrest-gump", "interstellar", "coco"],
  friends: ["the-hangove", "guardians-of-the-galaxy", "john-wick"],
  solo: ["dune", "the-godfather", "inception"],
  marathon: ["lord-of-the-rings-fellowship", "harry-potter-philosophers-stone", "the-matrix"],
  family: ["toy-story", "coco", "spider-man-into-the-spider-verse"],
  default: ["dune-part-two", "interstellar", "spider-man-into-the-spider-verse"],
};
const poster = (file) => `${import.meta.env.BASE_URL}images/${file}.jpg`;

/** Entrada digital de la sesión: ocasión, formato y butacas reales (sumar una butaca la anima). */
function SessionTicket({ session, occasion }) {
  const mode = MODES.find((item) => item.key === session.mode);
  const size = session.people.length;
  return (
    <div className="duo-entry">
      <div className="duo-fan" aria-hidden="true">
        {(FANS[session.occasion] ?? FANS.default).map((file, index) => (
          <img key={file} src={poster(file)} alt="" style={{ "--n": index }} loading="lazy" decoding="async" onError={(event) => event.currentTarget.remove()} />
        ))}
      </div>
      <div className="duo-entry-ticket">
        <div className="duo-entry-main">
          <span className="duo-overline">ENTRADA DE LA SESIÓN</span>
          <strong>{occasion?.title ?? "Su noche de cine"}</strong>
          <span className="duo-entry-meta">
            <Icon name={session.mode === "movie" ? "film" : session.mode === "tv" ? "screen" : "layers"} /> {mode.label}
            {session.mood && ` · algo ${moodLabel(session.mood)}`}
          </span>
          <ul className="duo-seat-row" aria-label="Butacas de la sesión">
            {session.people.map((person, index) => (
              <li key={index} style={{ "--n": index }}>
                <SeatAvatar index={index} name={personName(person, index)} />
                <span>{personName(person, index)}</span>
              </li>
            ))}
          </ul>
        </div>
        <span className="duo-entry-stub" aria-hidden="true">
          <small>ADMITE</small>
          <strong>{size}</strong>
        </span>
      </div>
    </div>
  );
}

/** Pestañas de radio compactas (accesibles: radio nativo dentro de la etiqueta). */
function Segmented({ name, legend, options, value, onChange }) {
  return (
    <fieldset className="duo-fieldset duo-segmented-field">
      <legend>{legend}</legend>
      <div className="duo-segmented">
        {options.map((option) => (
          <label key={option.key} className="duo-segment">
            <input type="radio" name={name} checked={value === option.key} onChange={() => onChange(option.key)} />
            <span>
              {option.art}
              <strong>{option.label}</strong>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const seatsArt = (count) => (
  <span className="duo-segment-seats" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <span key={index} />
    ))}
  </span>
);

/** Escena 1 · Preparar la noche: quiénes, qué formato y, si quieren, ánimo, plataformas y familia. */
export default function DuoModeStep({ session, occasion, onChange, onGroupSize, onNext, onQuick, turnsEnabled = false, onTurns, onTurnsReset }) {
  const { marathon } = session;
  const size = session.people.length;
  const solo = size === 1;
  const family = familyFilter(session.family, session.region);
  const custom = Boolean(session.mood || session.providers.length || session.family !== "off" || turnsEnabled);
  const [moreOpen, setMoreOpen] = useState(custom);
  const setMarathon = (patch) => onChange({ marathon: { ...marathon, ...patch } });
  // Con TMDB se avisa qué plataformas no figuran en la región elegida.
  const { data: available } = useAsync(isTmdbEnabled() ? `providers-${session.region}` : null, () => getWatchProviders("movie", session.region));
  const availableIds = available?.map((provider) => provider.id);
  const toggleProvider = (id) => onChange({ providers: session.providers.includes(id) ? session.providers.filter((item) => item !== id) : [...session.providers, id] });
  const platforms = PLATFORMS.filter((platform) => session.providers.includes(platform.id)).map((platform) => platform.name);
  const settings = [
    session.mood ? `Ánimo: ${moodLabel(session.mood)}` : "Ánimo libre",
    `${regionName(session.region)} · ${platforms.length ? platforms.join(", ") : "cualquier plataforma"}`,
    session.family !== "off" && `Familia: ${FAMILY_LEVELS.find((level) => level.key === session.family)?.label}`,
    !solo && turnsEnabled && "Turnos justos",
  ].filter(Boolean);

  return (
    <section className="duo-step duo-scene duo-scene-setup" aria-labelledby="duo-mode-title">
      <SessionTicket session={session} occasion={occasion} />

      <div className="duo-setup-body">
        <p className="duo-overline">ESCENA 1 · PREPARAR LA NOCHE</p>
        <h2 id="duo-mode-title">{solo ? "¿Cómo se ve tu noche?" : "¿Cómo se ve su noche?"}</h2>

        <Segmented
          name="duo-group"
          legend="¿Quiénes ven hoy?"
          value={groupOf(size)}
          options={GROUPS.map((group) => ({ key: group.key, label: group.label, art: seatsArt(Math.min(group.count, 4)) }))}
          onChange={(key) => onGroupSize(key === "group" ? Math.max(MIN_GROUP, size > 2 ? size : 4) : GROUPS.find((group) => group.key === key).count)}
        />
        {groupOf(size) === "group" && (
          <div className="duo-stepper" role="group" aria-label="Personas en el grupo">
            <button type="button" aria-label="Una persona menos" disabled={size <= MIN_GROUP} onClick={() => onGroupSize(size - 1)}>
              −
            </button>
            <output aria-live="polite">
              <strong>{size}</strong> personas
            </output>
            <button type="button" aria-label="Una persona más" disabled={size >= MAX_PEOPLE} onClick={() => onGroupSize(size + 1)}>
              +
            </button>
          </div>
        )}

        <Segmented
          name="duo-mode"
          legend="¿Qué plan?"
          value={session.mode}
          options={MODES.map((mode) => ({ key: mode.key, label: mode.label, art: <Icon name={mode.key === "movie" ? "film" : mode.key === "tv" ? "screen" : "layers"} /> }))}
          onChange={(mode) => onChange({ mode })}
        />

        {session.mode === "marathon" && (
          <div className="duo-marathon-settings">
            <Question title="¿Películas o episodios?">
              <ChoiceChips name="duo-marathon-type" options={MARATHON_TYPES} value={marathon.type} onChange={(type) => setMarathon({ type, count: type === "tv" ? 6 : 3 })} />
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
              <ChoiceChips name="duo-marathon-style" options={MARATHON_STYLES.map(({ key, label }) => ({ value: key, label }))} value={marathon.style} onChange={(style) => setMarathon({ style })} />
            </Question>
            <Question title="¿Saga o mezcla?" hint={marathon.type === "tv" ? "Con series, «saga» significa episodios seguidos de una sola serie." : "Una saga o universo se ve en orden de estreno."}>
              <ChoiceChips name="duo-marathon-scope" options={MARATHON_SCOPES.map(({ key, label }) => ({ value: key, label }))} value={marathon.scope} onChange={(scope) => setMarathon({ scope })} />
            </Question>
          </div>
        )}

        <details className="duo-settings" open={moreOpen} onToggle={(event) => setMoreOpen(event.currentTarget.open)}>
          <summary>
            <span>
              <strong>Ajustes de la noche</strong>
              <small>{settings.join(" · ")}</small>
            </span>
            <span className="duo-settings-mark" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="duo-settings-body">
            <Question title="¿Qué les apetece hoy?" hint="Opcional. Orienta el ranking de esta sesión; no cambia los gustos ni los límites de nadie.">
              <div className="duo-mood-picker" role="group" aria-label="Ánimo de la sesión">
                {TONES.map((tone) => (
                  <button key={tone.key} type="button" aria-pressed={session.mood === tone.key} onClick={() => onChange({ mood: session.mood === tone.key ? null : tone.key })}>
                    <span aria-hidden="true">{tone.icon}</span>
                    <span>{tone.label}</span>
                  </button>
                ))}
              </div>
            </Question>

            <Question title="¿Dónde lo verán?" hint="Si marcan plataformas es un límite: solo títulos con disponibilidad comprobada en ellas.">
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
                    <button key={platform.id} type="button" className="duo-platform" style={{ "--brand": platform.brand }} aria-pressed={session.providers.includes(platform.id)} onClick={() => toggleProvider(platform.id)}>
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

            <Question title="Modo familia" hint="Opcional. Solo títulos con clasificación por edad comprobada; uno sin clasificar no se muestra.">
              <ChoiceChips name="duo-family" options={FAMILY_LEVELS.map(({ key, label }) => ({ value: key, label }))} value={session.family} onChange={(value) => onChange({ family: value })} />
              {family && (
                <p className="duo-fineprint">
                  {session.mode === "tv" || (session.mode === "marathon" && marathon.type === "tv")
                    ? "TMDB no permite filtrar series por edad: con el modo familia solo verán películas."
                    : `Clasificación de referencia: ${family.system}${family.fallback ? " (TMDB no tiene clasificación para tu región)" : ""}. Es orientativa: revisen la ficha antes de ver.`}
                </p>
              )}
            </Question>

            {!solo && onTurns && (
              <Question title="Turnos justos" hint="Opcional. Al final les preguntamos si alguien cedió; la próxima vez sus gustos pesan un poco más. Nunca lo deducimos de los votos.">
                <label className="duo-chip">
                  <input type="checkbox" checked={turnsEnabled} onChange={(event) => onTurns(event.target.checked)} />
                  <span>{turnsEnabled ? "Activados" : "Desactivados"}</span>
                </label>
                {turnsEnabled && (
                  <p className="duo-fineprint">
                    Cuenta por nombre, en este navegador; se olvida a la mitad cada 30 días. No salta lo que alguien rechaza.{" "}
                    <button type="button" className="duo-link" onClick={onTurnsReset}>
                      Reiniciar turnos
                    </button>
                  </p>
                )}
              </Question>
            )}
          </div>
        </details>

        <div className="duo-actions duo-scene-cta">
          <Button variant="primary" className="duo-cta" onClick={onNext}>
            {solo ? "Mostrar mis gustos" : "Mostrar nuestros gustos"} <Icon name="arrow" />
          </Button>
          {session.mode !== "marathon" && (
            <Button variant="secondary" className="duo-cta" onClick={onQuick}>
              Ir directo a finalistas
            </Button>
          )}
        </div>
        {session.mode !== "marathon" && <p className="duo-fineprint">Sin gustos personales no asumimos afinidad: verán lo mejor valorado que cumple sus límites.</p>}
      </div>
    </section>
  );
}

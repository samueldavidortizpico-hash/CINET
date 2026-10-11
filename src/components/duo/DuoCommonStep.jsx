import Button from "../common/Button.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { SeatAvatar } from "./DuoSeats.jsx";
import { FAMILY_LEVELS, MARATHON_STYLES, seatColor, SERIES_STATUS_OPTIONS, SESSION_LENGTHS, TONES } from "../../data/duo.js";
import { PLATFORMS } from "../../data/platforms.js";
import { regionName } from "../../data/tmdb.js";
import { moodLabel } from "../../services/duoExperience.js";
import { EXCLUDING } from "../../services/historyService.js";
import { findConflicts, formatMinutes, genreName, listEs, quorum } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

const names = (keys) => listEs(keys.map(genreName));
const toneNames = (keys) => listEs(keys.map((key) => TONES.find((tone) => tone.key === key)?.label ?? key));
const valueLabel = (list, value) => list.find((item) => item.value === value)?.label ?? value;

/** Límites efectivos (los mismos que aplica checkTitle): se cumplen siempre. */
function limitsOf(profile, session) {
  const status = SERIES_STATUS_OPTIONS.find((option) => option.value === profile.seriesStatus)?.label;
  const platforms = PLATFORMS.filter((platform) => profile.providers.includes(platform.id)).map((platform) => platform.name);
  const many = profile.people.length > 1;
  return [
    profile.must.length > 0 && { label: "Imprescindible", value: `todos: ${names(profile.must)}` },
    profile.rejected.length > 0 && { label: "Nunca", value: names(profile.rejected) },
    profile.type === "tv"
      ? {
          label: "Episodios",
          value: [profile.maxRuntime ? `hasta ${profile.maxRuntime} min` : "cualquier duración", profile.seasonsMax ? `hasta ${profile.seasonsMax} temp.` : null, profile.seriesStatus !== "any" && profile.seriesStatus !== "conflict" ? status?.toLowerCase() : null]
            .filter(Boolean)
            .join(" · "),
        }
      : { label: "Duración", value: profile.maxRuntime ? `hasta ${formatMinutes(profile.maxRuntime)}${many ? " (el límite más corto)" : ""}` : "sin límite" },
    { label: "Dónde", value: `${regionName(profile.region)} · ${platforms.length ? `${platforms.join(", ")} (comprobado)` : "cualquier plataforma"}` },
    profile.family && { label: "Familia", value: `${FAMILY_LEVELS.find((level) => level.key === profile.family.level)?.label} · ${profile.family.system}` },
    session.mode === "marathon" && {
      label: "Maratón",
      value: `${valueLabel(SESSION_LENGTHS, session.marathon.maxMinutes)} · unos ${session.marathon.count} ${session.marathon.type === "tv" ? "episodios" : "títulos"} · ${MARATHON_STYLES.find((style) => style.key === session.marathon.style)?.label}`,
    },
  ].filter(Boolean);
}

/** Escena 3 · Encontrar coincidencias: acuerdos declarados, aportes de cada butaca, límites y conflictos. */
export default function DuoCommonStep({ session, profile, history, ranked, onEdit, onNext }) {
  const { people } = profile;
  const size = people.length;
  const conflicts = findConflicts(profile);
  const blocking = conflicts.some((conflict) => conflict.blocking);
  const commonTones = size > 1 ? people.map((person) => person.tone).reduce((a, b) => a.filter((key) => b.includes(key))) : [];
  const excluded = EXCLUDING.reduce((total, list) => total + history[list].length, 0);
  const isMarathon = session.mode === "marathon";
  const noun = profile.type === "tv" ? "series" : "películas";
  const expressed = people.filter((person) => person.genres.length + person.tone.length + person.actors.length > 0).length;
  const center =
    size === 1
      ? [people[0].genres.length && names(people[0].genres), people[0].tone.length && `tono ${toneNames(people[0].tone)}`].filter(Boolean).join(" · ")
      : [profile.shared.length && names(profile.shared), commonTones.length && `tono ${toneNames(commonTones)}`].filter(Boolean).join(" · ");

  return (
    <section className="duo-step duo-scene duo-scene-match" aria-labelledby="duo-common-title">
      <p className="duo-overline">ESCENA 3 · {size > 1 ? "EL PUNTO DE ENCUENTRO" : "TU BÚSQUEDA"}</p>
      <h2 id="duo-common-title">{size > 1 ? "Esto es lo que los une" : "Tu noche, en resumen"}</h2>
      <p className="duo-lead">Solo lo que cada persona declaró o respondió. Los límites se cumplen siempre; los gustos ordenan.</p>

      {conflicts.length > 0 && (
        <div className={`duo-conflicts${blocking ? " is-blocking" : ""}`} role={blocking ? "alert" : "status"}>
          <strong>{blocking ? "Así no hay ningún título posible:" : "Ojo:"}</strong>
          <ul>
            {conflicts.map((conflict) => (
              <li key={conflict.text}>{conflict.text}</li>
            ))}
          </ul>
          <div className="duo-actions">
            {people.map((person, index) => (
              <Button key={index} variant="secondary" onClick={() => onEdit(`person-${index}`)}>
                <SeatAvatar index={index} name={person.name} /> Resolverlo con {person.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className={`duo-map${size === 1 ? " is-solo" : ""}`}>
        <div className="duo-map-center">
          <span className="duo-overline">{size === 1 ? "TE GUSTA" : size === 2 ? "A LOS DOS" : "A TODOS"}</span>
          <strong>{center || (size === 1 ? "Sin gustos marcados" : "Aún nada en común")}</strong>
          <small>
            {center ? "Va primero lo que toca esto." : size === 1 ? "Ordenamos por valoración y por las películas que respondiste." : "Buscaremos títulos que tengan algo de cada persona."}
          </small>
          {profile.majority.length > 0 && <small>A la mayoría: {names(profile.majority)}</small>}
          {session.mood && <small>Ánimo de hoy: algo {moodLabel(session.mood)} (orienta, no obliga)</small>}
        </div>
        <ul className="duo-map-people">
          {people.map((person, index) => {
            const own = person.genres.filter((key) => !profile.shared.includes(key) && !profile.rejected.includes(key));
            return (
              <li key={index} style={{ "--seat": seatColor(index), "--n": index }}>
                <div className="duo-map-who">
                  <SeatAvatar index={index} name={person.name} />
                  <strong>{person.name}</strong>
                  <button type="button" className="duo-link" aria-label={`Editar gustos de ${person.name}`} onClick={() => onEdit(`person-${index}`)}>
                    Editar
                  </button>
                </div>
                <p>
                  {own.length ? `Aporta ${names(own)}` : person.genres.length ? "Comparte los gustos comunes" : person.loved.length ? "Respondió con películas" : "Sin gustos: le vale casi todo"}
                  {person.rejected.length > 0 && <span className="duo-map-no"> · evita {names(person.rejected)}</span>}
                </p>
                {person.loved.length > 0 && (
                  <ul className="duo-map-loves" aria-label={`Películas que le encantan a ${person.name}`}>
                    {person.loved.slice(0, 4).map((item) => (
                      <li key={item.id} title={item.title}>
                        <PosterImage src={item.poster} alt={item.title} fallback={<img src={fallbackPoster(item)} alt={item.title} />} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {size > 2 && expressed > 2 && (
        <p className="duo-fineprint">
          Cómo decidimos: una opción cumple si encaja con al menos {quorum(expressed)} de {expressed} personas con gustos; las que encajan con todos van primero y nadie se queda sin algo suyo.
        </p>
      )}

      <div className="duo-limits-band" role="group" aria-label="Límites que se cumplen siempre">
        <p className="duo-limits-title">
          <span aria-hidden="true">⛨</span> Límites que se cumplen siempre
        </p>
        <dl>
          {limitsOf(profile, session).map((limit) => (
            <div key={limit.label}>
              <dt>{limit.label}</dt>
              <dd>{limit.value}</dd>
            </div>
          ))}
          <div>
            <dt>Fuera</dt>
            <dd>{excluded ? `${excluded} título${excluded === 1 ? "" : "s"} ya visto${excluded === 1 ? "" : "s"} o descartado${excluded === 1 ? "" : "s"}` : "nada excluido"}</dd>
          </div>
        </dl>
        <p className="duo-fineprint">Un dato que no podemos comprobar (duración, plataforma, temporadas) no cuenta como cumplido.</p>
      </div>

      <p className="duo-map-count" aria-live="polite">
        {ranked
          ? ranked.items.length
            ? `${ranked.strict} ${noun} cumplen todo${ranked.items.length > ranked.strict ? ` · ${ranked.items.length - ranked.strict} alternativas que solo fallan el gusto de alguien` : ""}.`
            : `Con estos límites no hay ${noun}; en el siguiente paso les decimos qué cambiar.`
          : `Buscando ${noun}…`}
      </p>

      <div className="duo-actions duo-scene-cta">
        <Button variant="secondary" onClick={() => onEdit("seen")}>
          ← Atrás
        </Button>
        <Button variant="primary" className="duo-cta" onClick={onNext}>
          {isMarathon ? "Armar la maratón →" : "Ver finalistas →"}
        </Button>
      </div>
    </section>
  );
}

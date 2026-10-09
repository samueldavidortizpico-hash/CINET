import Button from "../common/Button.jsx";
import { SeatAvatar } from "./DuoSeats.jsx";
import { MARATHON_STYLES, SERIES_STATUS_OPTIONS, SESSION_LENGTHS, TONES } from "../../data/duo.js";
import { PLATFORMS } from "../../data/platforms.js";
import { regionName } from "../../data/tmdb.js";
import { EXCLUDING } from "../../services/historyService.js";
import { findConflicts, formatMinutes, genreName, listEs, quorum } from "../../services/recommender.js";

const names = (keys) => listEs(keys.map(genreName));
const toneNames = (keys) => listEs(keys.map((key) => TONES.find((tone) => tone.key === key)?.label ?? key));
const valueLabel = (list, value) => list.find((item) => item.value === value)?.label ?? value;

function Row({ label, children }) {
  return (
    <div className="duo-common-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Lo que tienen en común, lo que aporta cada persona, los límites efectivos y los conflictos. */
export default function DuoCommonStep({ session, profile, history, ranked, onEdit, onNext }) {
  const { people } = profile;
  const size = people.length;
  const conflicts = findConflicts(profile);
  const blocking = conflicts.some((conflict) => conflict.blocking);
  const commonTones = size > 1 ? people.map((person) => person.tone).reduce((a, b) => a.filter((key) => b.includes(key))) : [];
  const own = people
    .map((person, index) => ({ index, name: person.name, genres: person.genres.filter((key) => !profile.shared.includes(key) && !profile.rejected.includes(key)) }))
    .filter((person) => person.genres.length);
  const excluded = EXCLUDING.reduce((total, list) => total + history[list].length, 0);
  const platforms = PLATFORMS.filter((platform) => profile.providers.includes(platform.id)).map((platform) => platform.name);
  const isMarathon = session.mode === "marathon";
  const noun = profile.type === "tv" ? "series" : "películas";
  const status = SERIES_STATUS_OPTIONS.find((option) => option.value === profile.seriesStatus)?.label;
  const expressed = people.filter((person) => person.genres.length + person.tone.length + person.actors.length > 0).length;

  return (
    <section className="duo-step" aria-labelledby="duo-common-title">
      <p className="duo-overline">{size > 1 ? "LA MEZCLA" : "TU BÚSQUEDA"}</p>
      <h2 id="duo-common-title">{size > 1 ? "Lo que tienen en común" : "Tu plan, en resumen"}</h2>
      <p className="duo-lead">
        {size > 1 ? "Así combinamos sus respuestas." : "Así quedó tu búsqueda."} Lo imprescindible, lo rechazado y los límites se cumplen siempre.
      </p>

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
                <SeatAvatar index={index} name={person.name} /> Editar a {person.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <dl className="duo-common">
        {size > 1 ? (
          <Row label={size === 2 ? "Les gusta a los dos" : "Les gusta a todos"}>
            {profile.shared.length || commonTones.length
              ? [profile.shared.length && names(profile.shared), commonTones.length && `tono ${toneNames(commonTones)}`].filter(Boolean).join(" · ")
              : "Nada en común todavía: buscaremos títulos que tengan algo de cada uno."}
          </Row>
        ) : (
          <Row label="Te gusta">
            {[people[0].genres.length && names(people[0].genres), people[0].tone.length && `tono ${toneNames(people[0].tone)}`].filter(Boolean).join(" · ") ||
              "Sin gustos marcados: te mostramos lo mejor valorado que cumpla tus filtros."}
          </Row>
        )}
        {profile.majority.length > 0 && <Row label="A la mayoría">{names(profile.majority)}</Row>}
        {size > 1 && own.length > 0 && (
          <Row label="Aporta cada uno">
            <ul className="duo-common-people">
              {own.map((person) => (
                <li key={person.index}>
                  <SeatAvatar index={person.index} name={person.name} />
                  <span>
                    <strong>{person.name}</strong> {names(person.genres)}
                  </span>
                </li>
              ))}
            </ul>
          </Row>
        )}
        {size > 2 && expressed > 2 && (
          <Row label="Cómo decidimos">
            Una opción cumple si encaja con al menos {quorum(expressed)} de {expressed}; las que encajan con todos van primero y nadie se queda
            sin algo suyo.
          </Row>
        )}
        <Row label="Imprescindible">{profile.must.length ? names(profile.must) : "Nada"}</Row>
        <Row label="Nunca">{profile.rejected.length ? names(profile.rejected) : "Nada rechazado"}</Row>
        <Row label="Duración">
          {profile.type === "tv"
            ? [
                profile.maxRuntime ? `episodios de hasta ${profile.maxRuntime} min` : "episodios de cualquier duración",
                profile.seasonsMax ? `hasta ${profile.seasonsMax} temporada${profile.seasonsMax === 1 ? "" : "s"}` : null,
                profile.seriesStatus !== "any" && profile.seriesStatus !== "conflict" ? status?.toLowerCase() : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : profile.maxRuntime
              ? `Películas de hasta ${formatMinutes(profile.maxRuntime)}${size > 1 ? " (el límite más corto del grupo)" : ""}`
              : "Sin límite"}
        </Row>
        {isMarathon && (
          <Row label="Maratón">
            {valueLabel(SESSION_LENGTHS, session.marathon.maxMinutes)} · unos {session.marathon.count}{" "}
            {session.marathon.type === "tv" ? "episodios" : "títulos"} · {MARATHON_STYLES.find((style) => style.key === session.marathon.style)?.label}
            {session.marathon.scope === "saga" ? " · saga o universo" : ""}
          </Row>
        )}
        <Row label="Dónde">
          {regionName(profile.region)} · {platforms.length ? platforms.join(", ") : "cualquier plataforma"}
        </Row>
        <Row label="Historial">
          {excluded ? `No recomendaremos ${excluded} título${excluded === 1 ? "" : "s"} ya visto${excluded === 1 ? "" : "s"} o descartado${excluded === 1 ? "" : "s"}.` : "Nada excluido."}
        </Row>
      </dl>

      <p className="duo-fineprint" aria-live="polite">
        {ranked
          ? ranked.items.length
            ? `Hay ${ranked.strict} ${noun} que cumplen todo${ranked.items.length > ranked.strict ? ` y ${ranked.items.length - ranked.strict} alternativas cercanas` : ""}.`
            : `Con estos filtros no encontramos ${noun}; en el siguiente paso les decimos qué ampliar.`
          : `Buscando ${noun}…`}
      </p>

      <div className="duo-actions">
        <Button variant="secondary" onClick={() => onEdit("seen")}>
          ← Atrás
        </Button>
        <Button variant="primary" className="duo-cta" onClick={onNext}>
          {isMarathon ? "Armar la maratón →" : "Ver recomendaciones →"}
        </Button>
      </div>
    </section>
  );
}

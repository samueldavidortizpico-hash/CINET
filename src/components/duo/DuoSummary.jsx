import { MARATHON_SCOPES, MARATHON_STYLES, MODES, SERIES_STATUS_OPTIONS, SESSION_LENGTHS, TONES, personName } from "../../data/duo.js";
import { PLATFORMS } from "../../data/platforms.js";
import { GENRES, regionName } from "../../data/tmdb.js";
import { EXCLUDING } from "../../services/historyService.js";
import { formatMinutes } from "../../services/recommender.js";
import Icon from "../common/Icon.jsx";

const label = (list, key, field = "key") => list.find((item) => item[field] === key)?.label ?? key;
const genre = (key) => label(GENRES, key);

function Section({ title, onEdit, editLabel, children }) {
  return (
    <div className="duo-summary-section">
      <div className="duo-summary-head">
        <h3>{title}</h3>
        {onEdit && (
          <button type="button" className="duo-link" aria-label={editLabel} onClick={onEdit}>
            Editar
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function PersonChips({ person, type }) {
  const chips = [
    ...person.mustGenres.map((key) => ["must", `★ ${genre(key)}`]),
    ...person.genres.map((key) => ["like", `♥ ${genre(key)}`]),
    ...person.rejectedGenres.map((key) => ["reject", `✕ ${genre(key)}`]),
    ...person.tone.map((key) => ["tone", `${TONES.find((tone) => tone.key === key)?.icon ?? ""} ${label(TONES, key)}`]),
    ...person.actors.map((actor) => ["actor", `🎭 ${actor.name}`]),
  ];
  const limit =
    type === "tv"
      ? [person.episodeMax && `Episodios ≤ ${person.episodeMax} min`, person.seasonsMax && `≤ ${person.seasonsMax} temp.`, person.seriesStatus !== "any" && label(SERIES_STATUS_OPTIONS, person.seriesStatus, "value")]
      : [person.maxRuntime ? `Hasta ${formatMinutes(person.maxRuntime)}` : "Sin límite de duración"];
  return (
    <>
      {chips.length ? (
        <ul className="duo-summary-chips">
          {chips.map(([kind, text]) => (
            <li key={text} data-kind={kind}>
              {text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="duo-fineprint">Sin gustos marcados: le vale casi todo.</p>
      )}
      <p className="duo-fineprint">{limit.filter(Boolean).join(" · ") || "Sin límites"}</p>
    </>
  );
}

/** Resumen siempre visible de la sesión, con acceso directo para editar cada paso. */
export default function DuoSummary({ session, profile, history, onEdit, onOpenHistory }) {
  const mode = MODES.find((item) => item.key === session.mode);
  const { marathon } = session;
  const excluded = EXCLUDING.reduce((total, list) => total + history[list].length, 0);
  const platforms = PLATFORMS.filter((platform) => session.providers.includes(platform.id)).map((platform) => platform.name);

  return (
    <aside className="duo-summary" aria-labelledby="duo-summary-title">
      <div className="duo-pass-heading"><Icon name="ticket" /><span>FUNCIÓN PARA DOS</span></div>
      <h2 id="duo-summary-title">Su pase de cine</h2>
      <p className="duo-fineprint">El plan toma forma con cada elección.</p>

      <Section title="Modo" onEdit={() => onEdit("mode")} editLabel="Editar modo y plataformas">
        <p>
          <span aria-hidden="true">{mode.icon}</span> {mode.label}
        </p>
        {session.mode === "marathon" && (
          <p className="duo-fineprint">
            {marathon.type === "tv" ? `${marathon.count} episodios` : `${marathon.count} películas`} ·{" "}
            {label(SESSION_LENGTHS, marathon.maxMinutes, "value")} · {label(MARATHON_STYLES, marathon.style)} ·{" "}
            {label(MARATHON_SCOPES, marathon.scope)}
          </p>
        )}
        <p className="duo-fineprint">
          {regionName(session.region)} · {platforms.length ? platforms.join(", ") : "cualquier plataforma"}
        </p>
      </Section>

      {session.people.map((person, index) => (
        <Section
          key={index}
          title={personName(person, index)}
          onEdit={() => onEdit(`person-${index}`)}
          editLabel={`Editar gustos de ${personName(person, index)}`}
        >
          <PersonChips person={person} type={profile.type} />
        </Section>
      ))}

      <Section title="Lo que dejamos fuera" onEdit={() => onEdit("seen")} editLabel="Editar títulos ya vistos">
        <p className="duo-fineprint">
          {excluded ? `${excluded} título${excluded === 1 ? "" : "s"} que no volveremos a recomendar.` : "Todavía ninguno."}
        </p>
        <button type="button" className="duo-link" onClick={onOpenHistory}>
          Ver títulos excluidos
        </button>
      </Section>
    </aside>
  );
}

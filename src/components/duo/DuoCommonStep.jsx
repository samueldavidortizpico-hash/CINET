import Button from "../common/Button.jsx";
import { MARATHON_STYLES, SERIES_STATUS_OPTIONS, SESSION_LENGTHS, TONES } from "../../data/duo.js";
import { PLATFORMS } from "../../data/platforms.js";
import { regionName } from "../../data/tmdb.js";
import { EXCLUDING } from "../../services/historyService.js";
import { findConflicts, formatMinutes, genreName, listEs } from "../../services/recommender.js";

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

/** Paso 5: lo que tienen en común, lo que se suma, los límites efectivos y los conflictos. */
export default function DuoCommonStep({ session, profile, history, ranked, onEdit, onNext }) {
  const [a, b] = profile.people;
  const conflicts = findConflicts(profile);
  const blocking = conflicts.some((conflict) => conflict.blocking);
  const commonTones = a.tone.filter((key) => b.tone.includes(key));
  const onlyA = a.genres.filter((key) => !b.genres.includes(key) && !profile.rejected.includes(key));
  const onlyB = b.genres.filter((key) => !a.genres.includes(key) && !profile.rejected.includes(key));
  const excluded = EXCLUDING.reduce((total, list) => total + history[list].length, 0);
  const platforms = PLATFORMS.filter((platform) => profile.providers.includes(platform.id)).map((platform) => platform.name);
  const isMarathon = session.mode === "marathon";
  const noun = profile.type === "tv" ? "series" : "películas";
  const status = SERIES_STATUS_OPTIONS.find((option) => option.value === profile.seriesStatus)?.label;

  return (
    <section className="duo-step" aria-labelledby="duo-common-title">
      <h2 id="duo-common-title">Lo que tienen en común</h2>
      <p className="duo-lead">Así combinamos sus respuestas. Lo imprescindible, lo rechazado y los límites se cumplen siempre.</p>

      {conflicts.length > 0 && (
        <div className={`duo-conflicts${blocking ? " is-blocking" : ""}`} role={blocking ? "alert" : "status"}>
          <strong>{blocking ? "Así no hay ningún título posible:" : "Ojo:"}</strong>
          <ul>
            {conflicts.map((conflict) => (
              <li key={conflict.text}>{conflict.text}</li>
            ))}
          </ul>
          <div className="duo-actions">
            <Button variant="secondary" onClick={() => onEdit("person-0")}>
              Editar a {a.name}
            </Button>
            <Button variant="secondary" onClick={() => onEdit("person-1")}>
              Editar a {b.name}
            </Button>
          </div>
        </div>
      )}

      <dl className="duo-common">
        <Row label="Les gusta a los dos">
          {profile.shared.length || commonTones.length
            ? [profile.shared.length && names(profile.shared), commonTones.length && `tono ${toneNames(commonTones)}`].filter(Boolean).join(" · ")
            : "Nada en común todavía: buscaremos títulos que tengan algo de cada uno."}
        </Row>
        {(onlyA.length > 0 || onlyB.length > 0) && (
          <Row label="Aporta cada uno">
            {[onlyA.length && `${a.name}: ${names(onlyA)}`, onlyB.length && `${b.name}: ${names(onlyB)}`].filter(Boolean).join(" · ")}
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
              ? `Películas de hasta ${formatMinutes(profile.maxRuntime)} (el menor de los dos límites)`
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
        <Row label="Historial">{excluded ? `No recomendaremos ${excluded} título${excluded === 1 ? "" : "s"} que ya vieron o descartaron.` : "Nada excluido."}</Row>
      </dl>

      <p className="duo-fineprint" aria-live="polite">
        {ranked
          ? ranked.items.length
            ? `Hay ${ranked.items.length} ${noun} que cumplen todo.`
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

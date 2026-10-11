import { useState } from "react";
import Button from "../common/Button.jsx";
import Icon from "../common/Icon.jsx";
import PosterImage from "../common/PosterImage.jsx";
import SkeletonRow from "../common/SkeletonRow.jsx";
import { SeatAvatar } from "./DuoSeats.jsx";
import { VOTES } from "../../data/duo.js";
import { useInstallPrompt } from "../../hooks/useInstallPrompt.js";
import { useShare } from "../../hooks/useShare.js";
import { formatMinutes, listEs, titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";
import { appUrl } from "../../utils/share.js";

const voteOf = (key) => VOTES.find((vote) => vote.key === key);

/** "20:30" + 142 min → "22:52" (solo un estimado: sin pausas ni créditos). */
function endTime(start, minutes) {
  const [hours, mins] = start.split(":").map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Turnos justos: el grupo declara si alguien cedió (nunca se deduce de los votos). */
function YieldQuestion({ names, onYield }) {
  const [chosen, setChosen] = useState([]);
  const [saved, setSaved] = useState(false);
  const named = names.filter((name) => !/^Persona \d+$/.test(name));
  if (named.length < 2) return <p className="duo-fineprint">Para llevar turnos, escriban sus nombres en la próxima sesión.</p>;
  if (saved) return <p className="duo-fineprint" role="status">Anotado. La próxima vez lo tendremos en cuenta.</p>;
  return (
    <fieldset className="duo-fieldset duo-yield">
      <legend>¿Alguien cedió esta vez?</legend>
      <div className="duo-chips">
        {named.map((name) => (
          <label key={name} className="duo-chip">
            <input type="checkbox" checked={chosen.includes(name)} onChange={() => setChosen((list) => (list.includes(name) ? list.filter((item) => item !== name) : [...list, name]))} />
            <span>{name}</span>
          </label>
        ))}
      </div>
      <Button
        variant="secondary"
        onClick={() => {
          onYield(chosen);
          setSaved(true);
        }}
      >
        {chosen.length ? "Anotar" : "Nadie cedió"}
      </Button>
    </fieldset>
  );
}

/** Escena 6 · Organizar: la elección se vuelve una tarjeta de plan (casa o cine) y un recuerdo que se revisa antes de compartir. */
export default function DuoFinal({ item, loading, names, votes = [], onSeen, onBack, onNew, turnsEnabled = false, onYield }) {
  const share = useShare();
  const install = useInstallPrompt(); // instalar es una opción después de elegir, nunca un requisito
  const [start, setStart] = useState("");
  const [withNames, setWithNames] = useState(false);
  if (loading) return <SkeletonRow variant="grid" count={1} label="Cargando su elección…" />;
  if (!item) {
    return (
      <section className="duo-step duo-final" aria-labelledby="duo-final-title">
        <h2 id="duo-final-title">Aún no hay elección</h2>
        <p className="duo-lead">Esa elección ya no está disponible (quizá la marcaron como vista o cambiaron sus preferencias).</p>
        <div className="duo-actions">
          <Button variant="primary" className="duo-cta" onClick={onBack}>
            Volver a las finalistas
          </Button>
        </div>
      </section>
    );
  }

  const { title, reasons } = item;
  const size = names.length;
  const movie = title.type !== "tv";
  const query = (mode) => `/functions?movie=${encodeURIComponent(title.id)}${mode === "home" ? "&mode=home" : ""}${start ? `&time=${start}` : ""}`;
  const memory = `${withNames && size > 1 ? `${listEs(names)} vamos a ver` : "Esta noche vemos"} «${title.title}»${title.year ? ` (${title.year})` : ""}. Elegida con CINET Duo.`;

  return (
    <section className="duo-step duo-final duo-scene duo-scene-plan" aria-labelledby="duo-final-title">
      {title.backdrop && <img className="duo-final-backdrop" src={title.backdrop} alt="" onError={(event) => event.currentTarget.remove()} />}
      <div className="duo-final-card">
        <div className="duo-final-poster">
          <PosterImage src={title.poster} alt={`Póster de ${title.title}`} fallback={<img src={fallbackPoster(title)} alt="" />} />
        </div>
        <div className="duo-final-body">
          <p className="duo-overline">ESCENA 6 · ORGANIZAR</p>
          <span className="duo-badge">LA ELEGIDA · AÚN NO ES UN PLAN</span>
          <h2 id="duo-final-title">{title.title}</h2>
          <p className="duo-card-meta">
            {titleMeta(title)}
            {title.rating > 0 && ` · ★ ${title.rating}`}
          </p>

          <div className="duo-ticket">
            <ul className="duo-ticket-seats" aria-label={size === 1 ? "Entrada para una persona" : `Entrada para ${size} personas`}>
              {names.map((name, index) => (
                <li key={index}>
                  <SeatAvatar index={index} name={name} />
                  <span>{name}</span>
                  {voteOf(votes[index]) && (
                    <small>
                      <span aria-hidden="true">{voteOf(votes[index]).icon}</span>
                      <span className="visually-hidden">votó {voteOf(votes[index]).label}</span>
                    </small>
                  )}
                </li>
              ))}
            </ul>
            <span className="duo-ticket-stub" aria-hidden="true">
              <small>ADMITE</small>
              <strong>{size}</strong>
            </span>
          </div>

          <details className="duo-pick-details">
            <summary>
              Por qué encaja <span aria-hidden="true">+</span>
            </summary>
            <ul className="duo-reasons">
              {reasons.slice(0, 6).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </details>

          <div className="duo-next-plan">
            <p className="duo-overline">DE LA ELECCIÓN AL ENCUENTRO</p>
            <h3>Ahora, hagan que pase.</h3>
            <label className="duo-field duo-start-field">
              <span>¿A qué hora empiezan? (opcional)</span>
              <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            {start && (
              <p className="duo-fineprint" role="status">
                {movie && title.runtime
                  ? `Terminarían hacia las ${endTime(start, title.runtime)}: estimado con ${formatMinutes(title.runtime)} de película, sin pausas.`
                  : movie
                    ? "No sabemos su duración exacta: no estimamos a qué hora terminan."
                    : `Cada episodio dura${title.runtime ? ` unos ${title.runtime} min` : " un tiempo que TMDB no confirma"}; no estimamos el final de una serie.`}{" "}
                Es una hora propuesta, no una función confirmada.
              </p>
            )}
            <div className="duo-destinations">
              <Button variant="primary" className="duo-destination" to={query("home")}>
                <Icon name="screen" />
                <strong>Una noche en casa</strong>
                <span>Plataforma, fecha, ambiente y algo para compartir.</span>
                <small>
                  Preparar el plan <Icon name="arrow" />
                </small>
              </Button>
              {movie && (
                <Button variant="secondary" className="duo-destination" to={query("cinema")}>
                  <Icon name="ticket" />
                  <strong>Una salida al cine</strong>
                  <span>Propongan dónde y cuándo; consulten la cartelera oficial.</span>
                  <small>
                    Organizar la salida <Icon name="arrow" />
                  </small>
                </Button>
              )}
            </div>
            <p className="duo-fineprint">El plan existe cuando se guarda en el siguiente paso; si falla, la propuesta se conserva para reintentar. CINET no reserva ni vende: eso se hace en el servicio o cine oficial.</p>
          </div>

          {turnsEnabled && onYield && <YieldQuestion names={names} onYield={onYield} />}

          <figure className="duo-memory">
            <figcaption>Recuerdo para compartir · revísalo antes</figcaption>
            <blockquote>{memory}</blockquote>
            {size > 1 && (
              <label className="duo-chip">
                <input type="checkbox" checked={withNames} onChange={(event) => setWithNames(event.target.checked)} />
                <span>Incluir nuestros nombres</span>
              </label>
            )}
            <p className="duo-fineprint">No incluye votos, gustos ni el código de ninguna sala.</p>
            <Button variant="secondary" onClick={() => share({ title: `CINET Duo: ${title.title}`, text: memory, url: appUrl(`movie/${title.id}`) })}>
              ↗ Compartir este recuerdo
            </Button>
          </figure>

          {install && (
            <p className="duo-install">
              <Button variant="secondary" onClick={install}>
                📲 Instalar CINET en este dispositivo
              </Button>
              <span className="duo-fineprint">Opcional: funciona igual en el navegador.</span>
            </p>
          )}

          <div className="duo-actions">
            <Button variant="secondary" to={`/movie/${title.id}`}>
              Detalles, tráiler y dónde verla
            </Button>
            <Button variant="secondary" onClick={() => onSeen(title)}>
              👀 Ya la vimos
            </Button>
          </div>
          <div className="duo-actions">
            <button type="button" className="duo-link" onClick={onBack}>
              ← Cambiar la elección
            </button>
            <button type="button" className="duo-link" onClick={() => onNew()}>
              Empezar una sesión nueva
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

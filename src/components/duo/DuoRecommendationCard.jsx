import { Link } from "react-router-dom";
import Button from "../common/Button.jsx";
import DiceButton from "../common/DiceButton.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { SeatFit, VoteGrid, VoteSeats } from "./DuoSeats.jsx";
import { regionName } from "../../data/tmdb.js";
import { titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

const CRITERIA = {
  genre: "Género",
  subgenre: "Combina géneros elegidos",
  tone: "Tono",
  cast: "Reparto",
  group: "Encaja con el grupo",
  runtime: "Duración",
  quality: "Valoración",
  popularity: "Popularidad",
  fresh: "Estreno reciente",
  feedback: "Parecida a lo que votaron",
  favorite: "En favoritos",
  recent: "Recomendada hace poco",
};

function Availability({ title }) {
  if (!Array.isArray(title.providers)) return <p className="duo-card-note">Disponibilidad por confirmar.</p>;
  if (!title.providers.length) return <p className="duo-card-note">Sin streaming por suscripción en {regionName(title.region)}.</p>;
  return (
    <p className="duo-card-note">
      <span aria-hidden="true">📺</span> {title.providers.map((provider) => provider.name).join(", ")}
    </p>
  );
}

/** Acciones de baja frecuencia en un menú plegable (<details>: teclado y lector de pantalla nativos). */
function MoreActions({ title, actions }) {
  const run = (event, action) => {
    event.currentTarget.closest("details").open = false;
    action();
  };
  return (
    <details className="duo-more">
      <summary aria-label={`Más acciones para ${title.title}`}>
        <span aria-hidden="true">•••</span>
      </summary>
      <div className="duo-more-menu">
        <button type="button" onClick={(event) => run(event, actions.similar)}>
          🔁 Ver otra parecida
        </button>
        <button type="button" onClick={(event) => run(event, actions.seen)}>
          👀 Ya la vimos
        </button>
        <button type="button" onClick={(event) => run(event, actions.notInterested)}>
          🚫 No nos interesa
        </button>
        <button type="button" onClick={(event) => run(event, actions.remove)}>
          ✕ Quitar de esta sesión
        </button>
      </div>
    </details>
  );
}

/**
 * Recomendación de Duo. featured: la principal (cartelera grande, motivos, votos explícitos y cálculo);
 * el resto, tarjeta compacta con butacas, votos de un toque y lo esencial a la vista.
 */
export default function DuoRecommendationCard({ item, featured = false, names, votes = [], favorite, note, actions, style }) {
  const { title, reasons, breakdown, relaxed, allPleased, seats, score } = item;
  const detailPath = `/movie/${title.id}`;
  const [headline, ...more] = reasons;
  const headingId = `duo-card-${title.id}`;
  const solo = names.length === 1;

  const badges = (
    <div className="duo-card-badges">
      {featured && <span className="duo-pill is-main">{solo ? "Para ti" : "Recomendación principal"}</span>}
      {allPleased && <span className="duo-pill is-all">{names.length === 2 ? "Para los dos" : "Para todos"}</span>}
      {relaxed.length > 0 && <span className="duo-pill is-alt">Alternativa</span>}
      {favorite && <span className="duo-pill">Guardada</span>}
    </div>
  );

  if (!featured) {
    return (
      <article className="duo-card" aria-labelledby={headingId} style={style}>
        <Link to={detailPath} className="duo-card-poster" tabIndex={-1} aria-hidden="true">
          <PosterImage src={title.poster} alt="" fallback={<img src={fallbackPoster(title)} alt="" />} />
          {title.rating > 0 && <span className="duo-card-rating">★ {title.rating}</span>}
        </Link>
        <div className="duo-card-body">
          {badges}
          <h3 id={headingId}>
            <Link to={detailPath}>{title.title}</Link>
          </h3>
          <p className="duo-card-meta">{titleMeta(title)}</p>
          {note && <p className="duo-dice-note">{note}</p>}
          <p className="duo-why">{headline}</p>
          <div className="duo-card-foot">
            <VoteSeats names={names} votes={votes} seats={seats} onVote={actions.vote} />
            <div className="duo-card-tools">
              <button
                type="button"
                className="duo-icon-btn"
                aria-pressed={favorite}
                aria-label={favorite ? `Quitar ${title.title} de favoritos` : `Guardar ${title.title}`}
                onClick={actions.save}
              >
                <span aria-hidden="true">{favorite ? "♥" : "♡"}</span>
              </button>
              <DiceButton compact ariaLabel={`Cambiar ${title.title} por otra al azar`} onRoll={actions.reroll} />
              <MoreActions title={title} actions={actions} />
              <button type="button" className="duo-choose" onClick={actions.choose} aria-label={`Elegir ${title.title}`}>
                Elegir
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="duo-card duo-card-featured" aria-labelledby={headingId}>
      {title.backdrop && <img className="duo-recommendation-backdrop" src={title.backdrop} alt="" aria-hidden="true" />}
      <Link to={detailPath} className="duo-card-poster" tabIndex={-1} aria-hidden="true">
        <PosterImage src={title.poster} alt="" fallback={<img src={fallbackPoster(title)} alt="" />} />
      </Link>

      <div className="duo-card-body">
        {badges}
        <h3 id={headingId}>
          <Link to={detailPath}>{title.title}</Link>
        </h3>
        <p className="duo-card-meta">
          {titleMeta(title)}
          {title.rating > 0 && <span className="duo-rating"> ★ {title.rating}</span>}
          {title.genre && <span> · {title.genre}</span>}
        </p>

        {note && <p className="duo-dice-note">{note}</p>}
        <p className="duo-why">{headline}</p>
        {more.length > 0 && (
          <ul className="duo-reasons">
            {more.slice(0, 4).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        {names.length > 1 && <SeatFit seats={seats} detailed />}
        <Availability title={title} />

        <VoteGrid names={names} votes={votes} onVote={actions.vote} />

        <div className="duo-card-primary">
          <Button variant="primary" className="duo-cta" onClick={actions.choose}>
            {solo ? "Elegir esta" : `Elegir ${title.type === "tv" ? "esta serie" : "esta"}`}
          </Button>
          <button type="button" className="duo-action" aria-pressed={favorite} onClick={actions.save}>
            {favorite ? "♥ Guardada" : "♡ Guardar"}
          </button>
          <DiceButton compact ariaLabel={`Cambiar ${title.title} por otra recomendación al azar`} onRoll={actions.reroll} />
          <MoreActions title={title} actions={actions} />
        </div>

        <details className="duo-breakdown">
          <summary>Cómo se calculó ({score} puntos)</summary>
          <ul>
            {breakdown.map(({ key, points }) => (
              <li key={key} className={points < 0 ? "is-negative" : undefined}>
                <span>{CRITERIA[key]}</span>
                <span>
                  {points > 0 ? "+" : ""}
                  {points}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}

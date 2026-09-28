import { Link } from "react-router-dom";
import Button from "../common/Button.jsx";
import DiceButton from "../common/DiceButton.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { VOTES } from "../../data/duo.js";
import { regionName } from "../../data/tmdb.js";
import { titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

const CRITERIA = {
  genre: "Género",
  subgenre: "Combina géneros elegidos",
  tone: "Tono",
  cast: "Reparto",
  compat: "Encaja con ambos",
  runtime: "Duración",
  quality: "Valoración",
  popularity: "Popularidad",
  favorite: "En favoritos",
  recent: "Recomendada hace poco",
};

function Availability({ title }) {
  if (!Array.isArray(title.providers)) return <p className="duo-card-note">Disponibilidad en plataformas por confirmar.</p>;
  if (!title.providers.length) return <p className="duo-card-note">Sin streaming por suscripción en {regionName(title.region)}.</p>;
  return (
    <p className="duo-card-note">
      📺 En {regionName(title.region)}: {title.providers.map((provider) => provider.name).join(", ")}
    </p>
  );
}

function Votes({ title, names, votes, onVote }) {
  const bothYes = votes[0] === "yes" && votes[1] === "yes";
  return (
    <div className="duo-votes">
      {names.map((name, person) => (
        <div key={person} className="duo-vote-row" role="group" aria-label={`Voto de ${name}`}>
          <span className="duo-vote-name">{name}</span>
          {VOTES.map((vote) => (
            <button
              key={vote.key}
              type="button"
              className="duo-vote"
              aria-pressed={votes[person] === vote.key}
              aria-label={`${name}: ${vote.label}`}
              title={vote.label}
              onClick={() => onVote(person, vote.key)}
            >
              {vote.icon}
            </button>
          ))}
        </div>
      ))}
      {bothYes && <p className="duo-both">💞 A los dos les gusta {title.type === "tv" ? "esta serie" : "esta película"}</p>}
    </div>
  );
}

/**
 * Recomendación de Duo. Todas las acciones están siempre visibles (también en móvil).
 * featured: la recomendación principal, con más motivos.
 */
export default function DuoRecommendationCard({ item, featured = false, names, votes = [], favorite, note, actions }) {
  const { title, reasons, breakdown, relaxed, bothPleased, score } = item;
  const detailPath = `/movie/${title.id}`;
  const [headline, ...more] = reasons;
  const headingId = `duo-card-${title.id}`;

  return (
    <article className={`duo-card${featured ? " duo-card-featured" : ""}`} aria-labelledby={headingId}>
      <Link to={detailPath} className="duo-card-poster" tabIndex={-1} aria-hidden="true">
        <PosterImage src={title.poster} alt="" fallback={<img src={fallbackPoster(title)} alt="" />} />
      </Link>

      <div className="duo-card-body">
        <div className="duo-card-badges">
          {featured && <span className="duo-pill is-main">Recomendación principal</span>}
          {bothPleased && <span className="duo-pill">Para los dos</span>}
          {relaxed.length > 0 && <span className="duo-pill is-alt">Alternativa</span>}
          {favorite && <span className="duo-pill">Guardada</span>}
        </div>
        <h3 id={headingId}>
          <Link to={detailPath}>{title.title}</Link>
        </h3>
        <p className="duo-card-meta">
          {titleMeta(title)}
          {title.rating > 0 && <span className="duo-rating"> ★ {title.rating}</span>}
        </p>
        {title.genre && <p className="duo-card-genres">{title.genre}</p>}

        {note && <p className="duo-dice-note">{note}</p>}
        <p className="duo-why">{headline}</p>
        {more.length > 0 && (
          <ul className="duo-reasons">
            {more.slice(0, featured ? 5 : 1).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
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

        <Availability title={title} />
        <Votes title={title} names={names} votes={votes} onVote={actions.vote} />

        <div className="duo-card-primary">
          <Button variant="primary" className="duo-cta" onClick={actions.choose}>
            Elegir {title.type === "tv" ? "esta serie" : "esta"}
          </Button>
          <button type="button" className="duo-action" aria-pressed={favorite} onClick={actions.save}>
            {favorite ? "♥ Guardada" : "♡ Guardar"}
          </button>
          <DiceButton compact ariaLabel={`Cambiar ${title.title} por otra recomendación al azar`} onRoll={actions.reroll} />
        </div>
        <div className="duo-card-secondary">
          <button type="button" onClick={actions.seen}>
            👀 Ya la vimos
          </button>
          <button type="button" onClick={actions.notInterested}>
            🚫 No me interesa
          </button>
          <button type="button" onClick={actions.similar}>
            🔁 Ver otra parecida
          </button>
          <button type="button" onClick={actions.remove}>
            ✕ Quitar de esta sesión
          </button>
        </div>
      </div>
    </article>
  );
}

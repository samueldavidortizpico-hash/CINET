import { Link } from "react-router-dom";
import Button from "../common/Button.jsx";
import Icon from "../common/Icon.jsx";
import PosterImage from "../common/PosterImage.jsx";
import { SeatFit, VoteSeats } from "./DuoSeats.jsx";
import { FINALIST_ROLES, formatMinutes, genreName, listEs, titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

const COUNT = ["", "Una finalista", "Dos finalistas", "Tres finalistas"];

/** Duración tal como la sabemos: exacta, como cota de TMDB o sin confirmar. */
function runtimeText(title) {
  if (title.type === "tv") return title.runtime ? `episodios de ~${title.runtime} min${title.seasons ? ` · ${title.seasons} temp.` : ""}` : "duración de episodio sin confirmar";
  if (title.runtime) return formatMinutes(title.runtime);
  return title.runtimeCap ? `menos de ${formatMinutes(title.runtimeCap)} (según TMDB)` : "sin confirmar";
}

/** Disponibilidad: comprobada, comprobada por el filtro de TMDB, sin suscripción o desconocida (nunca se presume). */
function availabilityText(title) {
  if (Array.isArray(title.providers)) return title.providers.length ? title.providers.map((provider) => provider.name).join(" · ") : "Sin suscripción registrada en esta región";
  return title.filtered?.providers ? "En sus plataformas, según el filtro de TMDB" : "Disponibilidad por confirmar";
}

/** Escena 4 · Comparar: hasta tres finalistas con papeles y diferencias reales. Los votos de aquí viven en este dispositivo. */
export default function DuoShortlist({ finalists, names, votes, favorites, onVote, onChoose }) {
  const count = finalists.length;
  return (
    <section className="duo-finalists" aria-label={COUNT[count]}>
      <p className="duo-finalists-note">
        {count < 3 && `Solo ${count === 1 ? "hay una que cumple" : "hay dos que cumplen"} sus límites y aporta${count === 1 ? "" : "n"} algo distinto: no rellenamos. `}
        Cada papel se explica con datos; la afinidad es una recomendación y sus votos deciden.
      </p>
      <ol className="duo-finalist-row" data-count={count}>
        {finalists.map(({ item, role, why }, index) => {
          const { title, reasons, seats, relaxed } = item;
          const saved = favorites.isFavorite(title.id);
          const touches = seats.filter((seat) => seat.expressed && seat.pleased).map((seat) => seat.name);
          return (
            <li key={title.id} style={{ "--n": index }}>
              <article className="duo-finalist" data-role={role} aria-labelledby={`duo-finalist-${title.id}`}>
                <div className="duo-finalist-top">
                  <div className="duo-finalist-art">
                    <PosterImage src={title.poster} alt={`Póster de ${title.title}`} fallback={<img src={fallbackPoster(title)} alt="" />} />
                    <span className="duo-role">{FINALIST_ROLES[role]}</span>
                    <button type="button" className="duo-pick-save" aria-pressed={saved} aria-label={`${saved ? "Quitar" : "Guardar"} ${title.title}${saved ? " de favoritos" : " en favoritos"}`} onClick={() => favorites.toggleFavorite(title.id)}>
                      <Icon name="heart" />
                    </button>
                  </div>
                  <div className="duo-finalist-title">
                    <h4 id={`duo-finalist-${title.id}`}>
                      <Link to={`/movie/${title.id}`}>{title.title}</Link>
                    </h4>
                    <p className="duo-card-meta">
                      {titleMeta(title)}
                      {title.rating > 0 && ` · ★ ${title.rating}`}
                    </p>
                    <ul className="duo-finalist-why">
                      {why.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="duo-finalist-body">
                  <dl className="duo-diff">
                    <div>
                      <dt>Género</dt>
                      <dd>{listEs((title.genreKeys ?? []).slice(0, 3).map(genreName)) || "sin dato"}</dd>
                    </div>
                    <div>
                      <dt>Duración</dt>
                      <dd>{runtimeText(title)}</dd>
                    </div>
                    <div>
                      <dt>{names.length > 1 ? "Gustos que toca" : "Tus gustos"}</dt>
                      <dd>{touches.length ? listEs(touches) : seats.some((seat) => seat.expressed) ? "ninguno declarado" : "sin gustos marcados"}</dd>
                    </div>
                    <div>
                      <dt>Dónde</dt>
                      <dd>{availabilityText(title)}</dd>
                    </div>
                  </dl>
                  {relaxed.length > 0 && <p className="duo-flag">{reasons[0]}</p>}
                  <details className="duo-pick-details">
                    <summary>
                      Por qué está aquí <span aria-hidden="true">+</span>
                    </summary>
                    <ul className="duo-reasons">
                      {reasons.slice(0, 5).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <SeatFit seats={seats} detailed />
                  </details>
                  <div className="duo-pick-votes">
                    <span>{names.length === 1 ? "Tu voto" : "Votos en este dispositivo"}</span>
                    <VoteSeats names={names} votes={votes[title.id]} seats={seats} onVote={(person, choice) => onVote(title, person, choice)} />
                  </div>
                  <Button variant="primary" className="duo-cta" onClick={() => onChoose(title.id)}>
                    Elegir esta <Icon name="arrow" />
                  </Button>
                  <Link className="duo-pick-detail-link" to={`/movie/${title.id}`}>
                    Detalles, tráiler y dónde verla
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

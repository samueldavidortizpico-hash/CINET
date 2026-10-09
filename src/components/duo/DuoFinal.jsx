import Button from "../common/Button.jsx";
import PosterImage from "../common/PosterImage.jsx";
import SkeletonRow from "../common/SkeletonRow.jsx";
import { SeatAvatar } from "./DuoSeats.jsx";
import { VOTES } from "../../data/duo.js";
import { useShare } from "../../hooks/useShare.js";
import { listEs, titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";
import { appUrl } from "../../utils/share.js";

const voteOf = (key) => VOTES.find((vote) => vote.key === key);

/** Paso final: la elección como una entrada de cine, con sus motivos y qué hacer ahora. */
export default function DuoFinal({ item, loading, names, votes = [], onSeen, onBack, onNew }) {
  const share = useShare();
  if (loading) return <SkeletonRow variant="grid" count={1} label="Cargando su elección…" />;
  if (!item) {
    return (
      <section className="duo-step duo-final" aria-labelledby="duo-final-title">
        <h2 id="duo-final-title">Aún no hay elección</h2>
        <p className="duo-lead">Esa elección ya no está disponible (quizá la marcaron como vista o cambiaron sus preferencias).</p>
        <div className="duo-actions">
          <Button variant="primary" className="duo-cta" onClick={onBack}>
            Volver a las recomendaciones
          </Button>
        </div>
      </section>
    );
  }

  const { title, reasons } = item;
  const size = names.length;
  const shareChoice = () =>
    share({
      title: `CINET Duo: ${title.title}`,
      text: `${size === 1 ? "Hoy veo" : `${listEs(names)} vamos a ver`} «${title.title}»${title.year ? ` (${title.year})` : ""}. ${reasons[0]}`,
      url: appUrl(`movie/${title.id}`),
    });

  return (
    <section className="duo-step duo-final" aria-labelledby="duo-final-title">
      {title.backdrop && <img className="duo-final-backdrop" src={title.backdrop} alt="" onError={(event) => event.currentTarget.remove()} />}
      <div className="duo-final-card">
        <div className="duo-final-poster">
          <PosterImage src={title.poster} alt={`Póster de ${title.title}`} fallback={<img src={fallbackPoster(title)} alt="" />} />
        </div>
        <div className="duo-final-body">
          <span className="duo-badge">ELECCIÓN FINAL</span>
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

          <p className="duo-lead">{size === 1 ? "Ya tienes qué ver. Por qué encaja:" : `${listEs(names)} ya tienen qué ver. Por qué encaja:`}</p>
          <ul className="duo-reasons">
            {reasons.slice(0, 6).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="duo-actions">
            <Button variant="primary" className="duo-cta" to={`/functions?movie=${title.id}&mode=home`}>
              🏠 Crear plan en casa
            </Button>
            <Button variant="secondary" to={`/movie/${title.id}`}>
              Ver detalles y tráiler
            </Button>
            <Button variant="secondary" onClick={shareChoice}>
              ↗ Compartir
            </Button>
            <Button variant="secondary" onClick={() => onSeen(title)}>
              👀 Ya la vimos
            </Button>
          </div>
          <div className="duo-actions">
            <button type="button" className="duo-link" onClick={onBack}>
              ← Cambiar la elección
            </button>
            <button type="button" className="duo-link" onClick={onNew}>
              Empezar una sesión nueva
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

import Button from "../common/Button.jsx";
import PosterImage from "../common/PosterImage.jsx";
import SkeletonRow from "../common/SkeletonRow.jsx";
import { listEs, titleMeta } from "../../services/recommender.js";
import { fallbackPoster } from "../../utils/poster.js";

/** Paso 7: la elección final, con sus motivos y qué hacer ahora. */
export default function DuoFinal({ item, loading, names, onSeen, onBack, onNew }) {
  if (loading) return <SkeletonRow variant="grid" count={1} label="Cargando su elección…" />;
  if (!item) {
    return (
      <section className="duo-step duo-final" aria-labelledby="duo-final-title">
        <h2 id="duo-final-title">Aún no eligieron</h2>
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
  return (
    <section className="duo-step duo-final" aria-labelledby="duo-final-title">
      {title.backdrop && <img className="duo-final-backdrop" src={title.backdrop} alt="" onError={(event) => event.currentTarget.remove()} />}
      <div className="duo-final-card">
        <div className="duo-final-poster">
          <PosterImage src={title.poster} alt={`Póster de ${title.title}`} fallback={<img src={fallbackPoster(title)} alt="" />} />
        </div>
        <div>
          <span className="duo-badge">Elección final</span>
          <h2 id="duo-final-title">{title.title}</h2>
          <p className="duo-card-meta">
            {titleMeta(title)}
            {title.rating > 0 && ` · ★ ${title.rating}`}
          </p>
          <p className="duo-lead">{listEs(names)} ya tienen qué ver. Por qué encaja:</p>
          <ul className="duo-reasons">
            {reasons.map((reason) => (
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

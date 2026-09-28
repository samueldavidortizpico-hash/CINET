import Button from "../common/Button.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { getCollection } from "../../services/movieService.js";

/** Entrada de Duo: pósters desenfocados en movimiento y una tarjeta central. */
export default function DuoIntro({ hasSession, onStart, onResume }) {
  const { data } = useAsync("duo-intro-posters", () => getCollection("trending", 12));
  const posters = (data?.titles ?? [])
    .map((title) => title.poster?.replace("/t/p/w500/", "/t/p/w185/"))
    .filter(Boolean);

  return (
    <section className="duo-intro" aria-labelledby="duo-intro-title">
      <div className="duo-intro-posters" aria-hidden="true">
        {posters.map((src, index) => (
          <img key={src} src={src} alt="" loading="lazy" style={{ "--i": index }} />
        ))}
      </div>

      <div className="duo-intro-card">
        <span className="duo-badge">CINET Duo</span>
        <h1 id="duo-intro-title">Encuentren algo que ambos quieran ver</h1>
        <p className="duo-lead">
          Elijan película, serie o maratón; cada uno cuenta sus gustos y lo que no quiere ver. Les proponemos solo títulos que
          cumplen los filtros de los dos, con el motivo de cada recomendación.
        </p>

        <ol className="duo-how">
          <li>
            <span aria-hidden="true">🎬</span> Película, serie o maratón
          </li>
          <li>
            <span aria-hidden="true">🎯</span> Cada uno cuenta sus gustos
          </li>
          <li>
            <span aria-hidden="true">🎲</span> Elijan, voten o tiren el dado
          </li>
        </ol>

        <div className="duo-actions duo-actions-center">
          <Button variant="primary" className="duo-cta" onClick={onStart}>
            Crear sesión Duo
          </Button>
          {hasSession && (
            <Button variant="secondary" onClick={onResume}>
              Continuar sesión
            </Button>
          )}
        </div>

        <p className="duo-fineprint">Recomendaciones por puntos, no por IA: siempre verán el motivo y nunca un porcentaje inventado.</p>
      </div>
    </section>
  );
}

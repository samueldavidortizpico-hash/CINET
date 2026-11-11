import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import { MONTHS } from "../data/showtimes.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useDuoHistory } from "../hooks/useDuoHistory.js";
import { usePlans } from "../hooks/usePlans.js";
import { useShare } from "../hooks/useShare.js";
import { buildRecap, recapShareText } from "../services/recap.js";
import { appUrl } from "../utils/share.js";

/** /resumen — tu año en CINET. Se ve solo aquí; compartir es una decisión tuya y solo lleva cifras. */
export default function RecapPage() {
  const { plans, loading } = usePlans();
  const { history } = useDuoHistory();
  const share = useShare();
  const current = new Date().getFullYear();
  const [year, setYear] = useState(current);
  const recap = buildRecap({ plans, history, year });
  const peak = Math.max(1, ...recap.byMonth);
  useDocumentTitle(`Tu ${year} en CINET`);

  return (
    <div className="duo-page room-page recap-page">
      <div className="duo-container">
        <Link to="/my-plans" className="back-link">← Mis planes</Link>
        <header className="room-intro">
          <span className="duo-badge">CINET · RESUMEN</span>
          <h1>Tu {year} en CINET</h1>
          <p className="duo-fineprint">🔒 Solo lo ves tú. Si lo compartes, va solo con tus cifras: sin nombres de otras personas, votos ni gustos.</p>
          <div className="duo-chips" role="radiogroup" aria-label="Año">
            {[current, current - 1].map((value) => (
              <label key={value} className="duo-chip">
                <input type="radio" name="recap-year" checked={year === value} onChange={() => setYear(value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </header>

        {loading ? (
          <p className="plan-note">Cargando tus planes…</p>
        ) : recap.plans === 0 ? (
          <section className="room-card">
            <h2>Aún no hay planes en {year}</h2>
            <p>Cuando organices o confirmes planes, aquí verás tu año.</p>
            <div className="plan-actions"><Button variant="primary" to="/duo">Elegir qué ver</Button></div>
          </section>
        ) : (
          <>
            <section className="recap-stats" aria-label="Cifras del año">
              <div className="room-card"><strong>{recap.plans}</strong><span>{recap.plans === 1 ? "plan" : "planes"}</span></div>
              <div className="room-card"><strong>{recap.cinema}</strong><span>en cine</span></div>
              <div className="room-card"><strong>{recap.home}</strong><span>en casa</span></div>
              <div className="room-card"><strong>{recap.titles}</strong><span>{recap.titles === 1 ? "título distinto" : "títulos distintos"}</span></div>
            </section>

            <section className="room-card">
              <h2>Mes a mes</h2>
              <ol className="recap-months">
                {recap.byMonth.map((count, index) => (
                  <li key={MONTHS[index]} aria-label={`${MONTHS[index]}: ${count} ${count === 1 ? "plan" : "planes"}`}>
                    <span className="recap-bar" style={{ "--h": `${(count / peak) * 100}%` }} />
                    <small>{MONTHS[index].slice(0, 3)}</small>
                  </li>
                ))}
              </ol>
              <p>
                {recap.bestMonth && <>Tu mes más movido fue <strong>{recap.bestMonth}</strong>. </>}
                {recap.topGenre && <>Lo que más planeaste: <strong>{recap.topGenre.toLowerCase()}</strong>.</>}
              </p>
              <p className="plan-note">«Ya vistas» en este navegador, en total: {recap.seenTotal}.</p>
            </section>

            <section className="room-card">
              <h2>¿Lo compartes?</h2>
              <p className="recap-preview">{recapShareText(recap)}</p>
              <Button variant="primary" onClick={() => share({ title: `Mi ${year} en CINET`, text: recapShareText(recap), url: appUrl("") })}>Compartir mi resumen</Button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

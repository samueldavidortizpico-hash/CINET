import PosterImage from "../common/PosterImage.jsx";
import { CINEMA_CHAINS } from "../../data/showtimes.js";
import { formatBudget, getPlanPoster, marathonTitles } from "../../services/planService.js";
import { officialChainFor, safeHostname, safeHttpsUrl } from "../../utils/url.js";

/** Cabecera del plan. `children` recibe acciones extra (p. ej. editar). */
export default function PlanHero({ plan, children }) {
  // place.url lo escribe quien organiza y lo leen los invitados: solo https sin credenciales, y solo se
  // llama «sitio oficial» si el dominio es exactamente el de una cadena conocida (si no, se ve el dominio real).
  const placeHref = safeHttpsUrl(plan.cinema.url);
  const officialChain = officialChainFor(placeHref, CINEMA_CHAINS);
  const details = [
    plan.marathon ? ["🍿 Maratón", marathonTitles(plan)] : ["🎬 Película", plan.movie.title],
    [plan.mode === "home" ? "📺 Dónde" : "📍 Cine", [plan.cinema.name, plan.cinema.location].filter(Boolean).join(" · ")],
    ["📅 Fecha", plan.date],
    // La hora la propone quien organiza; solo una función confirmada por el cine se muestra como "Función".
    [plan.timeSource === "showtime" ? "🕐 Función" : "🕐 Hora propuesta", plan.time || "Por definir"],
    ["👤 Organizador", plan.organizer],
    ...(plan.mode === "home"
      ? [
          ["⏱️ Duración", plan.duration],
          ["🎭 Ambiente", plan.ambience],
          ["🍕 Comida", plan.food],
        ].filter(([, value]) => value)
      : []),
    ...(plan.budget ? [["💰 Presupuesto aprox.", `${formatBudget(plan.budget)} por persona · estimado`]] : []),
  ];

  return (
    <section className="plan-hero-card">
      <div className="plan-poster" id="plan-poster">
        <PosterImage src={getPlanPoster(plan)} alt={`Póster de ${plan.movie.title}`} />
      </div>

      <div>
        <span className="plan-status">{plan.mode === "home" ? "🏠 PLAN EN CASA" : "🍿 PLAN DE CINE"}</span>
        <h1 id="plan-title">{plan.name}</h1>
        <p id="plan-message" className="plan-message">
          {plan.message || "¡Nos vemos en el cine! 🍿"}
        </p>

        <div className="plan-details">
          {details.map(([label, value]) => (
            <div key={label} className="detail-box">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        {plan.mode === "cinema" && placeHref && (
          <p className="plan-note">
            <a href={placeHref} target="_blank" rel="noopener noreferrer">
              {officialChain
                ? `Consultar funciones en ${officialChain.name} (sitio oficial) ↗`
                : `Enlace que añadió quien organiza: ${safeHostname(placeHref)} ↗`}
            </a>
          </p>
        )}

        {children}
      </div>
    </section>
  );
}

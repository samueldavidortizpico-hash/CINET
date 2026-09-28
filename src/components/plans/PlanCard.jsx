import Button from "../common/Button.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { usePlans } from "../../hooks/usePlans.js";
import { useReveal } from "../../hooks/useReveal.js";
import { useShare } from "../../hooks/useShare.js";
import { useToast } from "../../hooks/useToast.js";
import { canManagePlan, getPlanStats, getShareText, isUpcoming, marathonTitles } from "../../services/planService.js";
import { appUrl } from "../../utils/share.js";

export default function PlanCard({ plan }) {
  const { user } = useAuth();
  const { deletePlan } = usePlans();
  const { showToast } = useToast();
  const share = useShare();
  const [ref, revealClass] = useReveal();
  const { yes, maybe, no } = getPlanStats([plan]);

  const handleShare = () =>
    share({ title: `CINET - ${plan.name}`, text: getShareText(plan), url: appUrl(`plan/${plan.id}`) });

  const handleDelete = () => {
    if (!window.confirm(`¿Seguro que quieres eliminar "${plan.name}"?`)) return;
    deletePlan(plan.id);
    showToast("🗑️ Plan eliminado");
  };

  return (
    <article ref={ref} className={`plan-card ${revealClass}`}>
      <span className="status">{isUpcoming(plan) ? "🟢 PRÓXIMO" : "⚪ ANTERIOR"}</span>
      <h3>{plan.name || "Plan de cine"}</h3>
      <p>{plan.marathon ? `🍿 Maratón: ${marathonTitles(plan)}` : `🎬 ${plan.movie?.title ?? "Película"}`}</p>
      <p>
        📍 {plan.cinema?.name} · {plan.cinema?.location}
      </p>
      <p>
        📅 {plan.date} · 🕐 {plan.time}
      </p>
      <p className="plan-card-message">{plan.message || "¡Nos vemos en el cine! 🍿"}</p>

      <div className="plan-card-rsvp" aria-label="Respuestas">
        <span>✅ {yes} Sí</span>
        <span>🤔 {maybe} Tal vez</span>
        <span>❌ {no} No</span>
      </div>

      <div className="plan-card-actions">
        <Button variant="primary" to={`/plan/${plan.id}`}>
          👀 Ver plan
        </Button>
        <Button variant="secondary" onClick={handleShare}>
          📤 Compartir
        </Button>
        {canManagePlan(plan, user) && (
          <button type="button" className="delete-plan" onClick={handleDelete}>
            🗑️ Eliminar
          </button>
        )}
      </div>
    </article>
  );
}

import Button from "../common/Button.jsx";
import EmptyState from "../common/EmptyState.jsx";
import PlanCard from "../plans/PlanCard.jsx";
import { usePlans } from "../../hooks/usePlans.js";
import { useReveal } from "../../hooks/useReveal.js";
import { filterPlans } from "../../services/planService.js";

export default function PlansPreview() {
  const { plans, loading, error, refresh } = usePlans();
  const [ref, revealClass] = useReveal();
  const latest = filterPlans(plans).slice(0, 3);

  return (
    <section ref={ref} id="mis-planes" className={`plans-section ${revealClass}`}>
      <div className="section-inner">
        <p className="eyebrow">ORGANIZA TU SALIDA</p>
        <h2>Mis planes</h2>
        <p>Guarda y organiza tus próximos planes de cine.</p>

        {loading && <p className="plan-mode-notice" role="status">Cargando tus planes…</p>}
        {error && (
          <div className="plan-mode-notice">
            <p role="alert">No pudimos actualizar tus planes.</p>
            <Button variant="secondary" onClick={refresh}>Reintentar</Button>
          </div>
        )}
        {!loading && latest.length > 0 && (
          <>
            <div id="plans-list" className="plans-list">
              {latest.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
            <div className="section-cta">
              <Button variant="secondary" to="/my-plans">Ver todos mis planes →</Button>
            </div>
          </>
        )}
        {!loading && !error && latest.length === 0 && (
          <EmptyState id="empty-plans" icon="🎟️" title="Todavía no tienes planes" action={<div className="section-cta"><Button variant="primary" to="/movies">Encontrar una película →</Button></div>}>
            Selecciona una película para comenzar a crear tu próximo plan.
          </EmptyState>
        )}
      </div>
    </section>
  );
}

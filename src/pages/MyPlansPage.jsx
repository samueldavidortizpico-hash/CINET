import { useState } from "react";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import PlanCard from "../components/plans/PlanCard.jsx";
import PlanStats from "../components/plans/PlanStats.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { usePlans } from "../hooks/usePlans.js";
import { filterPlans } from "../services/planService.js";

export default function MyPlansPage() {
  const { plans } = usePlans();
  const [filter, setFilter] = useState("all");
  const visiblePlans = filterPlans(plans, filter);
  useDocumentTitle("Mis planes");

  return (
    <section className="plans-section my-plans">
      <div className="section-inner">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CINEHUB · ORGANIZACIÓN</p>
            <h2>Mis planes 🍿</h2>
          </div>
          <p>Organiza tus salidas, revisa quién confirmó y comparte tus planes con tus amigos.</p>
        </div>

        <PlanStats plans={plans} />

        <div className="plans-heading">
          <Button variant="primary" to="/movies">+ Crear nuevo plan</Button>
          <select id="plans-filter" className="plans-filter" aria-label="Filtrar planes" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Todos los planes</option>
            <option value="upcoming">Próximos</option>
            <option value="past">Anteriores</option>
          </select>
        </div>

        {visiblePlans.length > 0 ? (
          <div id="plans-list" className="plans-list">
            {visiblePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        ) : (
          <EmptyState
            id="empty-plans"
            title={plans.length ? "No hay planes en esta categoría" : "Todavía no tienes planes"}
            action={<Button variant="primary" to="/movies">Explorar películas</Button>}
          >
            Elige una película y crea tu primera salida al cine con tus amigos.
          </EmptyState>
        )}
      </div>
    </section>
  );
}

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import PlanForm from "../components/plans/PlanForm.jsx";
import PlanHero from "../components/plans/PlanHero.jsx";
import RsvpPanel from "../components/plans/RsvpPanel.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { usePlans } from "../hooks/usePlans.js";
import { useToast } from "../hooks/useToast.js";
import { canManagePlan } from "../services/planService.js";

/** Ruta dinámica /plan/:id — ver, responder y (si eres el organizador) editar el plan. */
export default function PlanPage() {
  const { id } = useParams();
  const { getPlan, updatePlan } = usePlans();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const plan = getPlan(id);
  useDocumentTitle(plan?.name ?? "Plan no encontrado");

  if (!plan) {
    return (
      <div className="plan-page">
        <div className="plan-container">
          <EmptyState icon="🍿" title="Plan no encontrado" action={<Button variant="primary" to="/my-plans">Ver mis planes</Button>}>
            Los planes se guardan en el navegador de quien los crea.
          </EmptyState>
        </div>
      </div>
    );
  }

  const saveChanges = ({ name, message }) => {
    updatePlan(plan.id, { name: name.trim(), message: message.trim() });
    setEditing(false);
    showToast("✏️ Plan actualizado");
  };

  return (
    <div className="plan-page">
      <div className="plan-container">
        <Link to="/my-plans" className="back-link">← Volver a mis planes</Link>

        <PlanHero plan={plan}>
          {canManagePlan(plan, user) && !editing && (
            <Button variant="secondary" className="plan-edit-button" onClick={() => setEditing(true)}>
              ✏️ Editar plan
            </Button>
          )}
        </PlanHero>

        {editing && (
          <section className="rsvp-section">
            <span className="section-kicker">ORGANIZADOR</span>
            <h2>Editar plan</h2>
            <PlanForm
              initialValues={{ name: plan.name, organizer: plan.organizer, message: plan.message }}
              submitLabel="💾 Guardar cambios"
              organizerReadOnly
              onCancel={() => setEditing(false)}
              onSubmit={saveChanges}
            />
          </section>
        )}

        <RsvpPanel plan={plan} voter={user?.name ?? plan.organizer} />
      </div>
    </div>
  );
}

import { Link, useNavigate } from "react-router-dom";
import PlanForm from "../components/plans/PlanForm.jsx";
import PlanSummary from "../components/plans/PlanSummary.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { usePlans } from "../hooks/usePlans.js";

/** Paso 2 del flujo de plan: nombre, organizador y mensaje. */
export default function CreatePlanPage() {
  const { selection, createPlan } = usePlans();
  const { user } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle("Crear plan");

  const handleSubmit = (values) => {
    const plan = createPlan(values, user);
    navigate(`/plan/${plan.id}`);
  };

  return (
    <div className="create-plan-page">
      <div className="create-plan-container">
        <Link to={selection?.marathon ? "/duo" : selection ? `/functions?movie=${selection.movie.id}` : "/movies"} className="back-link">
          ← Volver
        </Link>

        <div className="section-heading">
          <span className="section-kicker">CINEHUB</span>
          <h1>Crear un plan 🍿</h1>
          <p>Invita a tus amigos y pónganse de acuerdo para la próxima salida al cine.</p>
        </div>

        <section className="plan-form-card">
          <PlanSummary selection={selection} />
          <PlanForm
            initialValues={{ organizer: user?.name ?? "" }}
            onSubmit={handleSubmit}
            disabled={!selection}
            notice={selection ? null : "Debes seleccionar una función antes de crear un plan."}
          />
        </section>
      </div>
    </div>
  );
}

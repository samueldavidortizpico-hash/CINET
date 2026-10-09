import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PlanForm from "../components/plans/PlanForm.jsx";
import PlanSummary from "../components/plans/PlanSummary.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { usePlans } from "../hooks/usePlans.js";
import { track } from "../services/analytics.js";

/** Paso 2 del flujo de plan: nombre, organizador y mensaje. */
export default function CreatePlanPage() {
  const { selection, createPlan, mode, accountsAvailable } = usePlans();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Un id por intento: si la red falla y se reenvía, el servidor devuelve el mismo plan (no duplica).
  const [clientRef] = useState(() => crypto.randomUUID());
  const [state, setState] = useState({ saving: false, error: "" });
  useDocumentTitle("Crear plan");

  const handleSubmit = async (values) => {
    setState({ saving: true, error: "" });
    try {
      const id = await createPlan(values, { clientRef });
      track("plan_created", { mode: selection?.mode === "home" ? "home" : "cinema", shared: mode === "remote" });
      navigate(`/plan/${id}`);
    } catch (error) {
      setState({ saving: false, error: error.message });
    }
  };

  return (
    <div className="create-plan-page">
      <div className="create-plan-container">
        <Link to={selection?.marathon ? "/duo" : selection ? `/functions?movie=${selection.movie.id}` : "/movies"} className="back-link">
          ← Volver
        </Link>

        <div className="section-heading">
          <span className="section-kicker">CINET</span>
          <h1>Crear un plan 🍿</h1>
          <p>Invita a tus amigos y pónganse de acuerdo para la próxima salida.</p>
        </div>

        {mode === "local" && (
          <p className="plan-mode-notice" role="status">
            {accountsAvailable ? (
              <>
                Sin sesión, el plan se guarda <strong>solo en este navegador</strong> y tus amigos no podrán abrirlo.{" "}
                <Link to="/login" state={{ from: "/create-plan" }}>Inicia sesión</Link> para compartirlo de verdad.
              </>
            ) : (
              <>Las cuentas no están disponibles ahora mismo: el plan se guardará solo en este navegador.</>
            )}
          </p>
        )}

        <section className="plan-form-card">
          <PlanSummary selection={selection} />
          <PlanForm
            initialValues={{ organizer: user?.name ?? "" }}
            onSubmit={handleSubmit}
            disabled={!selection || state.saving}
            submitLabel={state.saving ? "Creando…" : undefined}
            notice={state.error || (selection ? null : "Debes elegir una película, el lugar y la fecha antes de crear un plan.")}
          />
        </section>
      </div>
    </div>
  );
}

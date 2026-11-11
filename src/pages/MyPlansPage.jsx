import { useState } from "react";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import Loading from "../components/common/Loading.jsx";
import PlanCard from "../components/plans/PlanCard.jsx";
import PlanStats from "../components/plans/PlanStats.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { usePlans } from "../hooks/usePlans.js";
import { useToast } from "../hooks/useToast.js";
import { filterPlans } from "../services/planService.js";

/** Planes guardados en este navegador antes de iniciar sesión: se pueden pasar a la cuenta para compartirlos. */
function ImportNotice({ list, onImport }) {
  const [skipped, setSkipped] = useState([]);
  const [saving, setSaving] = useState(false);
  const chosen = list.filter((plan) => !skipped.includes(plan.id));
  const toggle = (id) => setSkipped((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    await onImport(chosen);
    setSaving(false);
  };

  return (
    <form className="plan-mode-notice plan-import" onSubmit={submit}>
      <strong>Tienes {list.length === 1 ? "un plan guardado" : `${list.length} planes guardados`} solo en este navegador</strong>
      <p>Pásalos a tu cuenta para invitar con enlace y que cada persona confirme con la suya. Las respuestas antiguas por nombre no se copian.</p>
      <ul>
        {list.map((plan) => (
          <li key={plan.id}>
            <label>
              <input type="checkbox" checked={!skipped.includes(plan.id)} onChange={() => toggle(plan.id)} />
              {plan.name} · {plan.movie?.title}
            </label>
          </li>
        ))}
      </ul>
      <Button variant="primary" type="submit" disabled={saving || chosen.length === 0}>
        {saving ? "Pasando…" : `Pasar ${chosen.length === 1 ? "1 plan" : `${chosen.length} planes`} a mi cuenta`}
      </Button>
    </form>
  );
}

export default function MyPlansPage() {
  const { user } = useAuth();
  const { plans, mode, loading, error, refresh, pendingImports, importLocalPlans } = usePlans();
  const { showToast } = useToast();
  const [filter, setFilter] = useState("all");
  const visiblePlans = filterPlans(plans, filter);
  useDocumentTitle("Mis planes");

  const importPlans = async (list) => {
    try {
      const count = await importLocalPlans(list, user?.name);
      showToast(count === 1 ? "Plan pasado a tu cuenta" : `${count} planes pasados a tu cuenta`);
    } catch (importError) {
      showToast(importError.message);
    }
  };

  return (
    <section className="plans-section my-plans">
      <div className="section-inner">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CINET · ORGANIZACIÓN</p>
            <h2>Mis planes 🍿</h2>
          </div>
          <p>Organiza tus salidas, revisa quién confirmó y comparte tus planes con tus amigos.</p>
        </div>

        {mode === "local" && (
          <p className="plan-mode-notice">
            Estos planes viven solo en este navegador. <Button variant="secondary" to="/login" state={{ from: "/my-plans" }}>Inicia sesión</Button> para compartirlos con enlace.
          </p>
        )}
        {pendingImports.length > 0 && <ImportNotice list={pendingImports} onImport={importPlans} />}

        <PlanStats plans={plans} />

        <div className="plans-heading">
          <Button variant="primary" to="/movies">+ Crear nuevo plan</Button>
          <Button variant="secondary" to="/resumen">Tu año en CINET</Button>
          <select id="plans-filter" className="plans-filter" aria-label="Filtrar planes" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Todos los planes</option>
            <option value="upcoming">Próximos</option>
            <option value="past">Anteriores</option>
          </select>
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error.message} <Button variant="secondary" onClick={refresh}>Reintentar</Button>
          </p>
        )}

        {loading ? (
          <Loading label="Cargando tus planes" />
        ) : visiblePlans.length > 0 ? (
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

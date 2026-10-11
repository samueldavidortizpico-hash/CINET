import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import Loading from "../components/common/Loading.jsx";
import PosterImage from "../components/common/PosterImage.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { usePlans } from "../hooks/usePlans.js";
import { track } from "../services/analytics.js";
import * as repo from "../services/planRepository.js";

/**
 * /invite/:token — unirse a un plan compartido con la propia cuenta.
 * El token nunca se envía a analítica; tras unirse se reemplaza en el historial por /plan/:id.
 */
export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { refresh, accountsAvailable } = usePlans();
  const [state, setState] = useState({ key: null, preview: null, error: null });
  const [name, setName] = useState(null);
  const [joining, setJoining] = useState({ busy: false, error: "" });
  const key = user ? `${token}:${user.id}` : null;
  useDocumentTitle("Invitación a un plan");

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    repo.previewInvite(token).then(
      (preview) => active && setState({ key, preview, error: null }),
      (error) => active && setState({ key, preview: null, error })
    );
    return () => {
      active = false;
    };
  }, [key, token]);

  if (!accountsAvailable) {
    return (
      <div className="plan-page">
        <div className="plan-container">
          <EmptyState heading="h1" icon="🍿" title="Invitación a un plan">Las cuentas no están disponibles ahora mismo. Inténtalo más tarde.</EmptyState>
        </div>
      </div>
    );
  }
  if (loading || (key && state.key !== key)) return <Loading label="Abriendo la invitación" />;

  if (!user) {
    const from = { from: `/invite/${token}` };
    return (
      <div className="plan-page">
        <div className="plan-container">
          <EmptyState
            heading="h1"
            icon="🎟️"
            title="Te invitaron a un plan"
            action={
              <div className="plan-actions">
                <Button variant="primary" to="/login" state={from}>Iniciar sesión</Button>
                <Button variant="secondary" to="/register" state={from}>Crear cuenta</Button>
              </div>
            }
          >
            Inicia sesión o crea una cuenta para ver el plan y confirmar. Tu respuesta queda a tu nombre: nadie puede responder por ti.
          </EmptyState>
        </div>
      </div>
    );
  }

  if (state.error) {
    const gone = state.error.code === "CN410";
    return (
      <div className="plan-page">
        <div className="plan-container">
          <EmptyState heading="h1" icon="⌛" title={gone ? "Esta invitación ya no sirve" : "No encontramos la invitación"} action={<Button variant="primary" to="/my-plans">Ver mis planes</Button>}>
            {gone ? `${state.error.message} Pide a quien organiza un enlace nuevo.` : state.error.code === "network" ? state.error.message : "Revisa que el enlace esté completo o pide uno nuevo."}
          </EmptyState>
        </div>
      </div>
    );
  }

  const { preview } = state;
  const displayName = name ?? user.name ?? "";

  const join = async (event) => {
    event.preventDefault();
    setJoining({ busy: true, error: "" });
    try {
      const planId = await repo.acceptInvite(token, displayName);
      track("invite_accepted");
      refresh();
      navigate(`/plan/${planId}`, { replace: true });
    } catch (error) {
      setJoining({ busy: false, error: error.message });
    }
  };

  return (
    <div className="plan-page">
      <div className="plan-container">
        <section className="plan-hero-card invite-card">
          <div className="plan-poster">
            <PosterImage src={preview.title?.image} alt={`Póster de ${preview.title?.title ?? "la película"}`} />
          </div>
          <div>
            <span className="plan-status">{preview.mode === "home" ? "🏠 PLAN EN CASA" : "🍿 PLAN DE CINE"}</span>
            <h1>{preview.name}</h1>
            <p className="plan-message">
              {preview.owner_name} te invita a ver <strong>{preview.title?.title}</strong>
              {preview.title?.year ? ` (${preview.title.year})` : ""}.
            </p>
            <div className="plan-details">
              <div className="detail-box"><span>📅 Fecha</span><strong>{preview.date}</strong></div>
              <div className="detail-box"><span>🕐 Hora propuesta</span><strong>{preview.time || "Por definir"}</strong></div>
              <div className="detail-box"><span>👥 Personas</span><strong>{preview.member_count}</strong></div>
            </div>

            {preview.already_member ? (
              <div className="plan-actions">
                <Button variant="primary" to={`/plan/${preview.plan_id}`}>Ya estás en el plan: verlo</Button>
              </div>
            ) : (
              <form className="invite-form" onSubmit={join}>
                <div className="form-group">
                  <label htmlFor="invite-name">Cómo te verán en el plan</label>
                  <input id="invite-name" maxLength={40} required value={displayName} onChange={(event) => setName(event.target.value)} />
                </div>
                {joining.error && <p className="error-message" role="alert">{joining.error}</p>}
                <Button variant="primary" type="submit" disabled={joining.busy || !displayName.trim()}>
                  {joining.busy ? "Uniéndote…" : "Unirme al plan"}
                </Button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

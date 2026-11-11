import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import Loading from "../components/common/Loading.jsx";
import PlanAfterglow from "../components/plans/PlanAfterglow.jsx";
import PlanForm from "../components/plans/PlanForm.jsx";
import PlanGroupPanel from "../components/plans/PlanGroupPanel.jsx";
import PlanHero from "../components/plans/PlanHero.jsx";
import PlanTimePoll from "../components/plans/PlanTimePoll.jsx";
import RsvpPanel from "../components/plans/RsvpPanel.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { usePlans } from "../hooks/usePlans.js";
import { useShare } from "../hooks/useShare.js";
import { useToast } from "../hooks/useToast.js";
import { track } from "../services/analytics.js";
import * as repo from "../services/planRepository.js";
import { downloadIcs, planStart } from "../utils/calendar.js";
import { appUrl } from "../utils/share.js";

/** Plan remoto por id, con cambios en vivo. null en `plan` = no existe o no eres miembro (RLS no distingue). */
function useRemotePlan(id, userId, enabled) {
  const [state, setState] = useState({ key: null, plan: null, error: null });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const key = enabled ? `${id}:${userId}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    repo.getPlan(id, userId).then(
      (plan) => active && setState({ key, plan, error: null }),
      (error) => active && setState({ key, plan: null, error })
    );
    return () => {
      active = false;
    };
  }, [key, id, userId, version]);

  // Respuestas y ediciones de otras personas llegan sin recargar; se cancela al salir o cambiar de cuenta.
  useEffect(() => (key ? repo.subscribePlan(id, reload) : undefined), [key, id, reload]);

  return { ...(state.key === key ? state : { plan: null, error: null }), loading: Boolean(key) && state.key !== key, reload };
}

/** Enlaces de invitación: crear, compartir y revocar (solo quien organiza). */
function InvitePanel({ plan }) {
  const share = useShare();
  const { showToast } = useToast();
  const [invites, setInvites] = useState(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => repo.listInvites(plan.id).then(setInvites, () => setInvites([])), [plan.id]);
  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const token = await repo.createInvite(plan.id);
      const url = appUrl(`invite/${token}`);
      setLink(url);
      track("invite_created");
      await share({ title: `CINET - ${plan.name}`, text: `Te invito a «${plan.name}». Únete y confirma aquí:`, url });
      load();
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (inviteId) => {
    try {
      await repo.revokeInvite(inviteId);
      showToast("Enlace revocado: ya no sirve para unirse.");
      setLink("");
      load();
    } catch (error) {
      showToast(error.message);
    }
  };

  return (
    <section className="rsvp-section plan-invites">
      <span className="section-kicker">INVITAR</span>
      <h2>Invita con un enlace</h2>
      <p>Quien lo abra podrá unirse con su cuenta y confirmar. Caduca en 14 días y puedes revocarlo cuando quieras.</p>
      <div className="plan-actions">
        <Button variant="primary" disabled={busy || plan.status === "cancelled"} onClick={create}>
          {busy ? "Creando enlace…" : "🔗 Crear y compartir enlace"}
        </Button>
      </div>
      {link && (
        <p className="plan-invite-link">
          <label htmlFor="invite-link">Enlace de invitación</label>
          <input id="invite-link" readOnly value={link} onFocus={(event) => event.target.select()} />
        </p>
      )}
      {invites?.length > 0 && (
        <ul className="plan-invite-list" aria-label="Enlaces activos">
          {invites.map((invite) => (
            <li key={invite.id}>
              <span>
                Enlace del {new Date(invite.created_at).toLocaleDateString("es-CO")} · {invite.uses} {invite.uses === 1 ? "persona se unió" : "personas se unieron"} · caduca el{" "}
                {new Date(invite.expires_at).toLocaleDateString("es-CO")}
              </span>
              <button type="button" className="duo-link" onClick={() => revoke(invite.id)}>
                Revocar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Ruta /plan/:id — ver, responder y (si organizas) editar, invitar y cancelar. */
export default function PlanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPlan, updatePlan, deletePlan, mode, refresh } = usePlans();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const remoteId = repo.isRemoteId(id);
  const remote = useRemotePlan(id, user?.id, remoteId && mode === "remote");
  const plan = remoteId ? remote.plan : getPlan(id);
  useDocumentTitle(plan?.name ?? "Plan");

  if (authLoading || remote.loading) return <Loading label="Cargando el plan" />;

  if (!plan) {
    const privateRemote = remoteId && mode !== "remote";
    return (
      <div className="plan-page">
        <div className="plan-container">
          <EmptyState
            icon="🍿"
            heading="h1"
            title={remote.error ? "No pudimos cargar el plan" : privateRemote ? "Este plan es privado" : "Plan no encontrado"}
            action={
              privateRemote ? (
                <Button variant="primary" to="/login" state={{ from: `/plan/${id}` }}>
                  Iniciar sesión
                </Button>
              ) : (
                <Button variant="primary" to="/my-plans">Ver mis planes</Button>
              )
            }
          >
            {remote.error
              ? remote.error.message
              : privateRemote
                ? "Inicia sesión con la cuenta con la que te uniste para verlo."
                : remoteId
                  ? "No existe o no eres parte de él. Pide a quien organiza un enlace de invitación."
                  : "Este plan se guardó solo en el navegador de quien lo creó."}
          </EmptyState>
        </div>
      </div>
    );
  }

  const afterChange = () => {
    refresh();
    remote.reload();
  };

  const saveChanges = ({ name, message }) =>
    updatePlan(plan, { name: name.trim(), message: message.trim() }).then(
      () => {
        setEditing(false);
        showToast("✏️ Plan actualizado");
        afterChange();
      },
      (error) => {
        showToast(error.message);
        if (error.code === "CN409") remote.reload();
      }
    );

  const runAndGo = async (action, message, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await action();
      showToast(message);
      refresh();
      navigate("/my-plans");
    } catch (error) {
      showToast(error.message);
    }
  };

  const cancel = async () => {
    if (!window.confirm("¿Cancelar el plan? Las personas invitadas lo verán como cancelado y los enlaces dejarán de funcionar.")) return;
    try {
      await repo.cancelPlan(plan.id);
      showToast("Plan cancelado");
      afterChange();
    } catch (error) {
      showToast(error.message);
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(`¿Quitar a ${member.name} del plan? Dejará de verlo.`)) return;
    try {
      await repo.removeMember(plan.id, member.userId);
      afterChange();
    } catch (error) {
      showToast(error.message);
    }
  };

  const cancelled = plan.status === "cancelled";

  return (
    <div className="plan-page">
      <div className="plan-container">
        <Link to="/my-plans" className="back-link">← Volver a mis planes</Link>

        {!plan.remote && (
          <p className="plan-mode-notice" role="status">
            Este plan existe <strong>solo en este navegador</strong>: si compartes el enlace, otras personas no podrán abrirlo.
            {mode === "remote" ? " Impórtalo a tu cuenta desde «Mis planes» para compartirlo." : " Inicia sesión para crear planes compartidos."}
          </p>
        )}
        {cancelled && (
          <p className="plan-mode-notice is-cancelled" role="status">
            Este plan fue cancelado. Ya no se puede confirmar asistencia.
          </p>
        )}

        <PlanHero plan={plan}>
          <div className="plan-actions plan-hero-actions">
            {plan.isOwner && !editing && !cancelled && (
              <Button variant="secondary" className="plan-edit-button" onClick={() => setEditing(true)}>
                ✏️ Editar plan
              </Button>
            )}
            {!cancelled && planStart(plan) && (
              <Button variant="secondary" onClick={() => downloadIcs(plan, { url: appUrl(`plan/${plan.id}`) })}>
                📅 Añadir a mi calendario
              </Button>
            )}
          </div>
          {!cancelled && planStart(plan) && <p className="plan-note">El archivo .ics se abre con tu calendario. CINET no envía recordatorios.</p>}
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

        <RsvpPanel plan={plan} voter={user?.name ?? plan.organizer} onChanged={afterChange} />
        {!cancelled && <PlanAfterglow plan={plan} />}

        {plan.remote && plan.isOwner && !cancelled && <InvitePanel plan={plan} />}
        {plan.remote && user && <PlanTimePoll plan={plan} user={user} onChanged={afterChange} />}
        {plan.remote && user && <PlanGroupPanel plan={plan} user={user} onChanged={afterChange} />}

        {plan.remote && plan.isOwner && plan.members.length > 1 && (
          <section className="rsvp-section">
            <span className="section-kicker">PERSONAS</span>
            <h2>Quién está en el plan</h2>
            <ul className="plan-member-list">
              {plan.members
                .filter((member) => member.role !== "owner")
                .map((member) => (
                  <li key={member.userId}>
                    <span>{member.name}</span>
                    <button type="button" className="duo-link" onClick={() => removeMember(member)}>
                      Quitar
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {plan.remote && (
          <div className="plan-actions plan-danger-zone">
            {plan.isOwner ? (
              <>
                {!cancelled && (
                  <Button variant="secondary" onClick={cancel}>
                    Cancelar plan
                  </Button>
                )}
                <Button variant="secondary" onClick={() => runAndGo(() => repo.deletePlan(plan.id), "🗑️ Plan eliminado", `¿Eliminar «${plan.name}» para todas las personas?`)}>
                  Eliminar plan
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => runAndGo(() => repo.leavePlan(plan.id), "Saliste del plan", "¿Salir del plan? Necesitarás una invitación nueva para volver.")}>
                Salir del plan
              </Button>
            )}
          </div>
        )}

        {!plan.remote && plan.isOwner && (
          <div className="plan-actions plan-danger-zone">
            <Button variant="secondary" onClick={() => runAndGo(() => deletePlan(plan), "🗑️ Plan eliminado", `¿Eliminar «${plan.name}»?`)}>
              Eliminar plan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

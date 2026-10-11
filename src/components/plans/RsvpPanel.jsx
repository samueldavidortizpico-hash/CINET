import { useState } from "react";
import Button from "../common/Button.jsx";
import { usePlans } from "../../hooks/usePlans.js";
import { useShare } from "../../hooks/useShare.js";
import { useToast } from "../../hooks/useToast.js";
import { track } from "../../services/analytics.js";
import { getRsvpStatus, getShareText, RSVP_OPTIONS } from "../../services/planService.js";
import { appUrl } from "../../utils/share.js";

/**
 * Confirmación de asistencia (Sí / Tal vez / No) y lista de personas.
 * Plan remoto: la respuesta es la de tu cuenta (el servidor no deja responder por otra persona).
 * Plan local: como antes, por nombre y solo en este navegador.
 */
export default function RsvpPanel({ plan, voter, onChanged }) {
  const { respondToPlan } = usePlans();
  const share = useShare();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const current = plan.remote ? plan.myRsvp : getRsvpStatus(plan, voter);
  const cancelled = plan.status === "cancelled";
  const people = plan.remote
    ? plan.members.map((member) => ({ key: member.userId, name: member.name, option: RSVP_OPTIONS.find((option) => option.key === member.rsvp) }))
    : RSVP_OPTIONS.flatMap((option) => (plan.rsvp?.[option.key] ?? []).map((name) => ({ key: `${option.key}-${name}`, name, option })));

  const respond = async (status) => {
    setSaving(true);
    try {
      await respondToPlan(plan, voter, status);
      track("rsvp_changed", { rsvp: status });
      onChanged?.();
    } catch (error) {
      showToast(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = () =>
    share({ title: `CINET - ${plan.name}`, text: getShareText(plan), url: appUrl(`plan/${plan.id}`) });

  return (
    <section className="rsvp-section">
      <span className="section-kicker">CONFIRMACIÓN</span>
      <h2>¿Vas a asistir?</h2>
      <p>
        {plan.remote ? "Tu respuesta queda guardada en tu cuenta y la ve todo el plan." : <>Responde al plan como <strong>{voter}</strong>.</>}
      </p>

      <div className="rsvp-buttons">
        {RSVP_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`rsvp-btn${current === option.key ? " selected" : ""}`}
            aria-pressed={current === option.key}
            disabled={saving || cancelled}
            onClick={() => respond(option.key)}
          >
            {option.button}
          </button>
        ))}
      </div>

      <div className="attendees">
        <h3>👥 {plan.remote ? "Personas en el plan" : "Invitados"}</h3>
        <div id="attendees-list">
          {people.length === 0 && <p className="plan-note">Todavía no hay respuestas.</p>}
          {people.map(({ key, name, option }) => (
            <div key={key} className="attendee">
              <span>{name}</span>
              <strong className={option?.className}>{option ? `${option.icon} ${option.label}` : "Sin responder"}</strong>
            </div>
          ))}
        </div>
      </div>

      {!plan.remote && (
        <div className="plan-actions">
          <Button id="share-plan" variant="primary" onClick={handleShare}>
            📤 Compartir resumen
          </Button>
          <Button variant="secondary" to="/movies">
            🎬 Ver películas
          </Button>
        </div>
      )}
    </section>
  );
}

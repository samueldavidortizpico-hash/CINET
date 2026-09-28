import Button from "../common/Button.jsx";
import { usePlans } from "../../hooks/usePlans.js";
import { useShare } from "../../hooks/useShare.js";
import { getRsvpStatus, getShareText, RSVP_OPTIONS } from "../../services/planService.js";
import { appUrl } from "../../utils/share.js";

/** Confirmación de asistencia (Sí / Tal vez / No) y lista de invitados. */
export default function RsvpPanel({ plan, voter }) {
  const { respondToPlan } = usePlans();
  const share = useShare();
  const current = getRsvpStatus(plan, voter);
  const attendees = RSVP_OPTIONS.flatMap((option) =>
    (plan.rsvp?.[option.key] ?? []).map((name) => ({ name, option }))
  );

  const handleShare = () =>
    share({ title: `CINET - ${plan.name}`, text: getShareText(plan), url: appUrl(`plan/${plan.id}`) });

  return (
    <section className="rsvp-section">
      <span className="section-kicker">CONFIRMACIÓN</span>
      <h2>¿Vas a asistir?</h2>
      <p>
        Selecciona una opción para responder al plan como <strong>{voter}</strong>.
      </p>

      <div className="rsvp-buttons">
        {RSVP_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`rsvp-btn${current === option.key ? " selected" : ""}`}
            aria-pressed={current === option.key}
            onClick={() => respondToPlan(plan.id, voter, option.key)}
          >
            {option.button}
          </button>
        ))}
      </div>

      <div className="attendees">
        <h3>👥 Invitados</h3>
        <div id="attendees-list">
          {attendees.length === 0 && <p style={{ color: "#9992a5" }}>Todavía no hay respuestas.</p>}
          {attendees.map(({ name, option }) => (
            <div key={`${option.key}-${name}`} className="attendee">
              <span>{name}</span>
              <strong className={option.className}>
                {option.icon} {option.label}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="plan-actions">
        <Button id="share-plan" variant="primary" onClick={handleShare}>
          📤 Compartir plan
        </Button>
        <Button variant="secondary" to="/movies">
          🎬 Ver películas
        </Button>
      </div>
    </section>
  );
}

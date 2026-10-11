import { useState } from "react";
import Button from "../common/Button.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useToast } from "../../hooks/useToast.js";
import { toISODate } from "../../services/movieService.js";
import { chooseTime, clearTimes, listTimeOptions, proposeTimes, toggleTimeVote } from "../../services/planRepository.js";

const MAX_SLOTS = 5;

/** ¿No saben qué día? Quien organiza propone de 2 a 5 horarios, cada quien marca los suyos y se elige uno. */
export default function PlanTimePoll({ plan, user, onChanged }) {
  const { showToast } = useToast();
  const [version, setVersion] = useState(0);
  const { data: options } = useAsync(`poll-${plan.id}-${plan.updatedAt}-${version}`, () => listTimeOptions(plan));
  const [slots, setSlots] = useState([{ date: "", time: "20:00" }, { date: "", time: "20:00" }]);
  const [busy, setBusy] = useState(false);
  const names = Object.fromEntries(plan.members.map((member) => [member.userId, member.name]));
  const cancelled = plan.status === "cancelled";

  const act = async (action, message) => {
    setBusy(true);
    try {
      await action();
      if (message) showToast(message);
      setVersion((value) => value + 1);
      onChanged?.();
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!options || cancelled) return null;
  if (!options.length && !plan.isOwner) return null;

  const setSlot = (index, patch) => setSlots((list) => list.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  const ready = slots.filter((slot) => slot.date && slot.time);

  return (
    <section className="rsvp-section plan-time-poll" aria-labelledby="plan-poll-title">
      <span className="section-kicker">HORARIO</span>
      <h2 id="plan-poll-title">{options.length ? "¿Qué horario les sirve?" : "¿No saben qué día?"}</h2>

      {options.length > 0 ? (
        <>
          <p className="plan-note">Marca todos los que te sirven. {plan.isOwner ? "Cuando quieras, elige uno: pasa a ser la hora propuesta." : "Quien organiza elige el definitivo."}</p>
          <ul className="plan-poll-options">
            {options.map((option) => {
              const mine = option.voters.includes(user.id);
              return (
                <li key={option.id}>
                  <label>
                    <input type="checkbox" checked={mine} disabled={busy} onChange={() => act(() => toggleTimeVote(option.id, !mine))} />
                    <span>
                      <strong>{option.date} · {option.time}</strong>
                      <small>{option.voters.length ? `${option.voters.length} ${option.voters.length === 1 ? "puede" : "pueden"}: ${option.voters.map((id) => names[id] ?? "alguien").join(", ")}` : "Nadie todavía"}</small>
                    </span>
                  </label>
                  {plan.isOwner && (
                    <Button variant="secondary" disabled={busy} onClick={() => act(() => chooseTime(option.id), "Horario elegido")}>Elegir este</Button>
                  )}
                </li>
              );
            })}
          </ul>
          {plan.isOwner && (
            <button type="button" className="duo-link" disabled={busy} onClick={() => window.confirm("¿Cerrar la encuesta sin elegir?") && act(() => clearTimes(plan.id), "Encuesta cerrada")}>
              Cerrar la encuesta sin elegir
            </button>
          )}
          <p className="plan-note">Elegir horario cambia la hora propuesta del plan; no confirma una función del cine.</p>
        </>
      ) : (
        <form
          className="plan-poll-form"
          onSubmit={(event) => {
            event.preventDefault();
            act(() => proposeTimes(plan.id, ready, plan.timeZone ?? "America/Bogota"), "Horarios propuestos");
          }}
        >
          <p className="plan-note">Propón de 2 a 5 horarios y que cada quien marque los que le sirven.</p>
          {slots.map((slot, index) => (
            <div key={index} className="plan-group-when">
              <label>
                <span>Fecha {index + 1}</span>
                <input type="date" min={toISODate(new Date())} value={slot.date} onChange={(event) => setSlot(index, { date: event.target.value })} />
              </label>
              <label>
                <span>Hora {index + 1}</span>
                <input type="time" value={slot.time} onChange={(event) => setSlot(index, { time: event.target.value })} />
              </label>
            </div>
          ))}
          <div className="plan-actions">
            {slots.length < MAX_SLOTS && (
              <Button variant="secondary" onClick={() => setSlots((list) => [...list, { date: "", time: "20:00" }])}>+ Otro horario</Button>
            )}
            <Button variant="primary" type="submit" disabled={busy || ready.length < 2}>Proponer {ready.length} horarios</Button>
          </div>
        </form>
      )}
    </section>
  );
}

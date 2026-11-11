import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../common/Button.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useToast } from "../../hooks/useToast.js";
import { listGroups } from "../../services/groupRepository.js";
import { repeatPlan, scheduleNextPlan, setPlanRepeat, sharePlanWithGroup } from "../../services/planRepository.js";
import { toISODate } from "../../services/movieService.js";
import { to24h } from "../../services/planService.js";

/** Plan de cuenta: compartirlo con un grupo guardado y repetirlo en otra fecha sin copiar respuestas. */
export default function PlanGroupPanel({ plan, user, onChanged }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: groups } = useAsync(`plan-groups-${user.id}`, () => listGroups(user.id));
  const [groupId, setGroupId] = useState("");
  const [when, setWhen] = useState({ dateISO: "", time: to24h(plan.time) ?? "20:00" });
  const [clientRef] = useState(() => crypto.randomUUID()); // repetir dos veces el mismo envío no duplica
  const [busy, setBusy] = useState(false);
  const [nextRef] = useState(() => crypto.randomUUID());
  const [needsPlus, setNeedsPlus] = useState(false);
  const group =groups?.find((item) => item.id === plan.groupId);
  const cancelled = plan.status === "cancelled";

  const act = async (action) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const share = () =>
    act(async () => {
      const added = await sharePlanWithGroup(plan.id, groupId);
      showToast(added ? `${added} ${added === 1 ? "persona se sumó" : "personas se sumaron"} al plan` : "Todo el grupo ya estaba en el plan");
      onChanged?.();
    });

  const repeat = (event) => {
    event.preventDefault();
    act(async () => {
      const id = await repeatPlan(plan.id, { clientRef, dateISO: when.dateISO, time: when.time, timeZone: plan.timeZone ?? "America/Bogota" });
      showToast("Plan repetido: cada persona vuelve a responder");
      navigate(`/plan/${id}`);
    });
  };

  // Plus: el servidor comprueba el derecho; si no lo hay, el mensaje (CN402) lleva a /plus.
  const changeRepeat = (every) =>
    act(async () => {
      try {
        await setPlanRepeat(plan.id, every || null);
        setNeedsPlus(false);
        onChanged?.();
      } catch (error) {
        if (error.code !== "CN402") throw error;
        setNeedsPlus(true);
      }
    });

  const scheduleNext = () =>
    act(async () => {
      const id = await scheduleNextPlan(plan.id, nextRef);
      showToast("Siguiente noche programada con las mismas personas");
      navigate(`/plan/${id}`);
    });

  return (
    <section className="rsvp-section plan-group-tools">
      <span className="section-kicker">CON TU GENTE</span>
      <h2>Grupo y próximas veces</h2>
      {group && (
        <p className="plan-note">
          Plan del grupo <Link to={`/grupos/${group.id}`}>«{group.name}»</Link>.
        </p>
      )}
      {plan.isOwner && !cancelled && groups?.length > 0 && (
        <div className="plan-group-share">
          <label htmlFor="plan-group">Sumar a un grupo guardado</label>
          <select id="plan-group" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">Elegir grupo</option>
            {groups.map((item) => (
              <option key={item.id} value={item.id}>{item.name} ({item.members.length})</option>
            ))}
          </select>
          <Button variant="secondary" disabled={busy || !groupId} onClick={share}>Sumar al plan</Button>
          <p className="plan-note">Entran quienes están hoy en el grupo, sin respuesta: cada quien confirma con su cuenta.</p>
        </div>
      )}
      {plan.isOwner && groups?.length === 0 && (
        <p className="plan-note">¿Siempre ven cine con las mismas personas? <Link to="/grupos">Guarda un grupo</Link> y súmalo en un paso.</p>
      )}
      {!user.guest && (
        <form className="plan-group-repeat" onSubmit={repeat}>
          <h3>Repetir en otra fecha</h3>
          <div className="plan-group-when">
            <label>
              <span>Fecha</span>
              <input type="date" required min={toISODate(new Date())} value={when.dateISO} onChange={(event) => setWhen((current) => ({ ...current, dateISO: event.target.value }))} />
            </label>
            <label>
              <span>Hora propuesta</span>
              <input type="time" required value={when.time} onChange={(event) => setWhen((current) => ({ ...current, time: event.target.value }))} />
            </label>
          </div>
          <Button variant="secondary" type="submit" disabled={busy || !when.dateISO}>Repetir con las mismas personas</Button>
          <p className="plan-note">Misma película, lugar y personas. No se copian las respuestas de esta vez.</p>
        </form>
      )}
      {plan.isOwner && !cancelled && !user.guest && (
        <div className="plan-group-fixed">
          <h3>Noche fija <span className="plus-tag">PLUS</span></h3>
          <label htmlFor="plan-repeat">Se repite</label>
          <select id="plan-repeat" value={plan.repeatEvery ?? ""} disabled={busy} onChange={(event) => changeRepeat(event.target.value)}>
            <option value="">No se repite</option>
            <option value="week">Cada semana</option>
            <option value="2weeks">Cada 2 semanas</option>
            <option value="month">Cada mes</option>
          </select>
          {plan.repeatEvery && <Button variant="secondary" disabled={busy} onClick={scheduleNext}>Programar la siguiente</Button>}
          {needsPlus && <p className="plan-note" role="alert">La noche fija es parte de CINET Plus. <Link to="/plus">Ver qué incluye</Link></p>}
        </div>
      )}
    </section>
  );
}

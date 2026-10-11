import { useState } from "react";
import Button from "../common/Button.jsx";
import { useDuoHistory } from "../../hooks/useDuoHistory.js";
import { useLocalStorage } from "../../hooks/useLocalStorage.js";
import { useShare } from "../../hooks/useShare.js";
import { track } from "../../services/analytics.js";
import { addToHistory } from "../../services/historyService.js";
import { planStart } from "../../utils/calendar.js";
import { appUrl } from "../../utils/share.js";

const FEEDBACK_KEY = "cinet-plan-feedback"; // { [planId]: { watched: "yes"|"no", liked: "yes"|"meh"|"no"|null } } — solo este navegador
const LIKED = [
  { key: "yes", label: "Sí, nos gustó" },
  { key: "meh", label: "Más o menos" },
  { key: "no", label: "No mucho" },
];
const LIKED_TEXT = { yes: "Nos gustó.", meh: "Nos dejó dudas.", no: "No fue lo nuestro." };

/**
 * Después de la fecha: «¿La vieron? ¿Les gustó?», opcional. Es un autoinforme de este dispositivo, no una
 * asistencia ni una compra verificada. «La vimos» la saca de las recomendaciones de Duo; el recuerdo se
 * revisa antes de compartir y no lleva nombres ni votos.
 */
export default function PlanAfterglow({ plan }) {
  const [all, setAll] = useLocalStorage(FEEDBACK_KEY, {});
  const { change: changeHistory } = useDuoHistory();
  const share = useShare();
  const [now] = useState(() => Date.now());
  const start = planStart(plan);
  if (!plan.movie || !start || start.getTime() > now) return null;

  const answer = all?.[plan.id] ?? null;
  const save = (patch) => {
    const next = { watched: null, liked: null, ...answer, ...patch };
    setAll((current) => ({ ...(current ?? {}), [plan.id]: next }));
    if (!answer) track("plan_completed_reported", {});
    if (patch.watched === "yes") changeHistory((history) => addToHistory(history, "seen", [{ ...plan.movie, poster: plan.movie.image }]));
  };
  const date = start.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
  const memory = answer?.watched === "yes" ? `Vimos «${plan.movie.title}» el ${date}. ${LIKED_TEXT[answer.liked] ?? ""}`.trim() : null;

  return (
    <section className="rsvp-section plan-afterglow" aria-labelledby="plan-afterglow-title">
      <span className="section-kicker">DESPUÉS DE LA FUNCIÓN · OPCIONAL</span>
      <h2 id="plan-afterglow-title">¿La vieron? ¿Les gustó?</h2>
      {!answer?.watched && (
        <div className="plan-actions">
          <Button variant="primary" onClick={() => save({ watched: "yes" })}>
            Sí, la vimos
          </Button>
          <Button variant="secondary" onClick={() => save({ watched: "no" })}>
            Al final no
          </Button>
        </div>
      )}
      {answer?.watched === "no" && <p className="plan-note">Anotado: no la vieron. Sigue disponible para recomendarla en Duo.</p>}
      {answer?.watched === "yes" && (
        <>
          <p className="plan-note">No la volveremos a recomendar en Duo en este navegador.</p>
          <div className="plan-actions" role="group" aria-label="¿Les gustó?">
            {LIKED.map((option) => (
              <Button key={option.key} variant={answer.liked === option.key ? "primary" : "secondary"} aria-pressed={answer.liked === option.key} onClick={() => save({ liked: option.key })}>
                {option.label}
              </Button>
            ))}
          </div>
          <figure className="plan-memory">
            <figcaption>Recuerdo para compartir · revísalo antes</figcaption>
            <blockquote>{memory}</blockquote>
            <Button variant="secondary" onClick={() => share({ title: "Un recuerdo de CINET", text: memory, url: appUrl(`movie/${plan.movie.id}`) })}>
              ↗ Compartir el recuerdo
            </Button>
          </figure>
        </>
      )}
      <p className="plan-note">Se guarda solo en este dispositivo. Es lo que ustedes cuentan, no una asistencia ni una compra comprobada.</p>
    </section>
  );
}

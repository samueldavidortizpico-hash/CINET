import { useState } from "react";
import Button from "../common/Button.jsx";
import { useShare } from "../../hooks/useShare.js";
import { NIGHT_QUESTIONS, NIGHT_RITUALS, nightAgenda, nightSummary, normalizeNight } from "../../services/nightExperience.js";

export default function DuoNightExperience({ title, size, value, onChange }) {
  const night = normalizeNight(value);
  const share = useShare();
  const [preview, setPreview] = useState(false);
  const ritual = NIGHT_RITUALS.find((item) => item.id === night.ritual);
  const agenda = nightAgenda(title, night);
  const change = (patch) => { onChange({ ...night, ...patch }); setPreview(false); };
  return (
    <section className="duo-night" aria-labelledby="night-title">
      <p className="duo-overline">EL CRÉDITO EXTRA DE SU NOCHE</p>
      <h3 id="night-title">La película es solo el comienzo.</h3>
      <p>Diseñen el encuentro: un ritual, algo para preparar y una conversación para después.</p>
      <fieldset className="duo-night-rituals">
        <legend>¿Qué experiencia quieren?</legend>
        {NIGHT_RITUALS.map((item) => <label key={item.id} className={night.ritual === item.id ? "is-selected" : ""}>
          <input type="radio" name="night-ritual" value={item.id} checked={night.ritual === item.id} onChange={() => change({ ritual: item.id, checked: [] })} />
          <strong>{item.name}</strong><span>{item.description}</span>
        </label>)}
      </fieldset>
      <div className="duo-night-fields">
        <label>Hora del encuentro<input type="time" value={night.start} onChange={(event) => change({ start: event.target.value })} /></label>
        <label>Presupuesto total propuesto (COP)<input type="number" min="0" max="10000000" step="1000" value={night.budget || ""} placeholder="Opcional" onChange={(event) => change({ budget: event.target.value })} /></label>
      </div>
      {night.budget > 0 && <p role="status">Aporte sugerido: <strong>COP {Math.ceil(night.budget / size).toLocaleString("es-CO")}</strong> por persona. Estimación manual; no registra pagos.</p>}
      {agenda.length > 0 && <ol className="duo-night-agenda" aria-label="Agenda estimada">{agenda.map((item) => <li key={item.label}><time>{item.time}</time><span>{item.label}</span></li>)}</ol>}
      <p className="duo-fineprint">Los rituales son sugerencias editables mediante su elección. Horarios estimados sin pausas; para series se considera un episodio. Sin duración conocida no estimamos el final.</p>
      <fieldset className="duo-night-checklist"><legend>Antes de empezar · preparación local</legend>
        {ritual.tasks.map((task, index) => <label key={task}><input type="checkbox" checked={night.checked.includes(index)} onChange={() => change({ checked: night.checked.includes(index) ? night.checked.filter((item) => item !== index) : [...night.checked, index] })} />{task}</label>)}
      </fieldset>
      <div className="duo-night-conversation"><span>DESPUÉS DE LOS CRÉDITOS · SIN SPOILERS</span><p aria-live="polite">{NIGHT_QUESTIONS[night.question]}</p><Button variant="secondary" onClick={() => change({ question: (night.question + 1) % NIGHT_QUESTIONS.length })}>Otra pregunta</Button></div>
      <p className="duo-fineprint">Se conserva en esta sesión de este navegador; no se sincroniza con asistentes ni se guarda en el plan. El resumen no incluye nombres ni votos.</p>
      <Button variant="secondary" onClick={() => setPreview(!preview)}>{preview ? "Cerrar resumen" : "Revisar la noche para compartir"}</Button>
      {preview && <div className="duo-night-preview"><pre>{nightSummary(title, night, size)}</pre><Button variant="primary" onClick={() => share({ title: "Nuestra noche CINET", text: nightSummary(title, night, size) })}>Compartir este resumen</Button></div>}
    </section>
  );
}

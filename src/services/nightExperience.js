export const NIGHT_RITUALS = [
  { id: "cozy", name: "Modo refugio", description: "Luz suave, algo rico y cero prisa.", prep: 15, after: 10, tasks: ["Preparar bebidas y algo para compartir", "Acomodar el espacio", "Consultar el servicio oficial"] },
  { id: "debate", name: "Club de la escena final", description: "Una historia y una conversación que sigue después.", prep: 10, after: 20, tasks: ["Elegir una pregunta para después", "Preparar bebidas", "Consultar el servicio oficial"] },
  { id: "premiere", name: "Nuestra pequeña premiere", description: "Una entrada especial, sin salir de casa.", prep: 20, after: 15, tasks: ["Preparar la mesa o el espacio", "Elegir un snack entre todos", "Consultar el servicio oficial"] },
];
export const NIGHT_QUESTIONS = [
  "¿Qué imagen se te quedó en la cabeza?",
  "¿Qué decisión de un personaje habrías tomado diferente?",
  "¿Qué le preguntarías a quien hizo esta historia?",
  "¿Qué parte te gustaría conversar sin buscar una respuesta correcta?",
];
export function normalizeNight(value = {}) {
  const ritual = NIGHT_RITUALS.some((item) => item.id === value?.ritual) ? value.ritual : "cozy";
  return {
    ritual,
    start: /^([01]\d|2[0-3]):[0-5]\d$/.test(value?.start ?? "") ? value.start : "",
    budget: Math.min(10000000, Math.max(0, Number(value?.budget) || 0)),
    checked: Array.isArray(value?.checked) ? value.checked.filter((item) => Number.isInteger(item) && item >= 0 && item < 3) : [],
    question: Number.isInteger(value?.question) && value.question >= 0 && value.question < NIGHT_QUESTIONS.length ? value.question : 0,
  };
}
function clock(total) {
  return `${String(Math.floor(total % 1440 / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}${total >= 1440 ? " (+1 día)" : ""}`;
}
export function nightAgenda(title, settings) {
  const night = normalizeNight(settings);
  const ritual = NIGHT_RITUALS.find((item) => item.id === night.ritual);
  if (!night.start) return [];
  const [hour, minute] = night.start.split(":").map(Number);
  const start = hour * 60 + minute;
  const entries = [{ label: "Preparar el encuentro", time: clock(start) }, { label: title.type === "tv" ? "Empezar un episodio" : "Empezar la película", time: clock(start + ritual.prep) }];
  // No estimamos series completas ni tratamos una duración desconocida como cero.
  if (Number.isFinite(title.runtime) && title.runtime > 0 && title.runtime <= 600) {
    entries.push({ label: "Conversar después", time: clock(start + ritual.prep + title.runtime) });
    entries.push({ label: "Cerrar la noche", time: clock(start + ritual.prep + title.runtime + ritual.after) });
  }
  return entries;
}
export function nightSummary(title, settings, size) {
  const night = normalizeNight(settings);
  const ritual = NIGHT_RITUALS.find((item) => item.id === night.ritual);
  return [
    `Nuestra noche CINET: «${title.title}»`, ritual.name,
    ...nightAgenda(title, night).map((item) => `${item.time} · ${item.label}`),
    "Horarios estimados, sin pausas. No es una reserva ni un plan guardado.",
    ...(night.budget ? [`Presupuesto manual total: COP ${night.budget.toLocaleString("es-CO")} · aporte sugerido para ${size} personas: COP ${Math.ceil(night.budget / Math.max(1, size)).toLocaleString("es-CO")}. No registra pagos.`] : []),
    `Para después: ${NIGHT_QUESTIONS[night.question]}`,
  ].join("\n");
}

/* =========================================================
   planService — reglas de negocio de los planes (funciones puras).
   La persistencia la hace PlanContext con useLocalStorage.
   ========================================================= */

import { findMovie, toISODate } from "./movieService.js";

export const RSVP_OPTIONS = [
  { key: "yes", label: "Sí", icon: "✅", button: "✅ Sí, voy", className: "status-yes" },
  { key: "maybe", label: "Tal vez", icon: "🤔", button: "🤔 Tal vez", className: "status-maybe" },
  { key: "no", label: "No", icon: "❌", button: "❌ No puedo", className: "status-no" },
];

/** Resumen de la película guardado dentro del plan (como en el prototipo). */
export function toPlanMovie(movie) {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    duration: movie.duration,
    rating: movie.rating,
    genres: movie.genre ? [movie.genre] : [],
    image: movie.poster,
  };
}

export function validatePlan({ name = "", organizer = "" }) {
  if (!name.trim()) return { field: "name", message: "Escribe un nombre para el plan." };
  if (!organizer.trim()) return { field: "organizer", message: "Escribe tu nombre." };
  return null;
}

export function buildPlan(selection, form, owner = null, now = new Date()) {
  const organizer = form.organizer.trim();
  return {
    id: `cinehub-${now.getTime()}`,
    name: form.name.trim(),
    organizer,
    ownerEmail: owner?.email ?? null,
    message: form.message.trim(),
    movie: selection.movie,
    cinema: selection.cinema,
    date: selection.date,
    dateISO: selection.dateISO,
    time: selection.time,
    // Plan en casa (streaming): plataforma en cinema.name, ambiente y comida sugerida.
    mode: selection.mode ?? "cinema",
    ambience: selection.ambience ?? null,
    food: selection.food ?? null,
    duration: selection.duration ?? selection.movie.duration ?? null,
    marathon: selection.marathon ?? null, // maratón de Duo: [{ id, title, minutes, episodes }]
    createdAt: now.toISOString(),
    rsvp: { yes: [organizer], maybe: [], no: [] },
  };
}

/** Horarios para ver en casa. */
export const HOME_TIMES = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];

/**
 * Hora recomendada para ver en casa: que termine hacia las 23:00.
 * Redondea a la media hora y se mantiene entre 18:00 y 21:30.
 */
export function recommendedStart(runtime = 120, endBy = 23 * 60) {
  const start = Math.floor((endBy - (runtime || 120)) / 30) * 30;
  const clamped = Math.min(Math.max(start, 18 * 60), 21 * 60 + 30);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** Planes sin dueño (creados antes del login) los puede gestionar cualquiera. */
export function canManagePlan(plan, user) {
  return !plan.ownerEmail || plan.ownerEmail === user?.email;
}

export function getRsvpStatus(plan, person) {
  return RSVP_OPTIONS.find(({ key }) => plan.rsvp?.[key]?.includes(person))?.key ?? null;
}

/** Devuelve un plan nuevo donde `person` solo aparece en la lista `status`. */
export function setRsvp(plan, person, status) {
  const rsvp = {};
  for (const { key } of RSVP_OPTIONS) {
    rsvp[key] = (plan.rsvp?.[key] ?? []).filter((name) => name !== person);
  }
  rsvp[status].push(person);
  return { ...plan, rsvp };
}

/** Planes antiguos sin fecha ISO se consideran próximos (igual que el prototipo). */
export function isUpcoming(plan, today = new Date()) {
  return !plan.dateISO || plan.dateISO >= toISODate(today);
}

export function filterPlans(plans, filter = "all", today = new Date()) {
  const matches = {
    all: () => true,
    upcoming: (plan) => isUpcoming(plan, today),
    past: (plan) => !isUpcoming(plan, today),
  }[filter];
  return plans.filter(matches).reverse(); // los más recientes primero
}

export function getPlanStats(plans) {
  const count = (key) => plans.reduce((total, plan) => total + (plan.rsvp?.[key]?.length ?? 0), 0);
  return { total: plans.length, yes: count("yes"), maybe: count("maybe"), no: count("no") };
}

export function getPlanPoster(plan) {
  return findMovie(plan.movie?.id)?.poster ?? plan.movie?.image ?? "";
}

/** "A → B → C" (títulos de una maratón guardada como plan). */
export const marathonTitles = (plan) => (plan.marathon ?? []).map((item) => item.title).join(" → ");

export function getShareText(plan) {
  return [
    `🍿 ${plan.name}`,
    plan.marathon ? `🎬 Maratón: ${marathonTitles(plan)}` : `🎬 ${plan.movie.title}`,
    `📍 ${plan.cinema.name} - ${plan.cinema.location}`,
    `📅 ${plan.date}`,
    `🕐 ${plan.time}`,
    plan.message,
    "¿Quién se apunta?",
  ].filter(Boolean).join("\n");
}

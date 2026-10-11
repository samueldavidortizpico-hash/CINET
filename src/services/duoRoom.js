/* Lógica pura de las salas de Duo: baraja a partir de los gustos anónimos y lectura del resultado. */

import { DEFAULT_DUO_SESSION, DEFAULT_PERSON } from "../data/duo.js";

export const DECK_SIZE = 8;

/** Votos que guarda el servidor (en la sesión de un solo teléfono "Quizá" es "later"). */
export const ROOM_VOTES = [
  { key: "yes", icon: "❤️", label: "Sí" },
  { key: "maybe", icon: "🤔", label: "Quizá" },
  { key: "no", icon: "❌", label: "No" },
  { key: "veto", icon: "🚫", label: "Veto" }, // uno por ronda: ese título no puede ganar
];

/**
 * Gustos de la sala (sin nombres, en orden aleatorio) → sesión de Duo para el mismo motor de un solo teléfono:
 * cada persona sigue siendo una persona, así el ranking conserva «que nadie sufra» por persona.
 */
export function roomSession(room, prefsList = []) {
  const people = prefsList.map((prefs, index) => ({
    ...DEFAULT_PERSON,
    name: `Persona ${index + 1}`,
    genres: prefs.genres ?? [],
    mustGenres: prefs.mustGenres ?? [],
    rejectedGenres: prefs.rejectedGenres ?? [],
    maxRuntime: prefs.maxRuntime ?? 0,
  }));
  return { ...DEFAULT_DUO_SESSION, mode: room.mode === "tv" ? "tv" : "movie", region: room.region, people: people.length ? people : [DEFAULT_PERSON] };
}

/** Solo imágenes https o rutas de la propia app: lo mismo que acepta el servidor. */
const safeImage = (src) => (typeof src === "string" && src.length <= 300 && /^(https:\/\/|\/[^/])/.test(src) ? src : "");

/** Lo mejor del ranking → baraja de la ronda (solo lo que el servidor guarda). */
export function toDeck(items, size = DECK_SIZE) {
  return items.slice(0, size).map(({ title }) => ({
    id: String(title.id),
    title: String(title.title).slice(0, 200),
    year: String(title.year ?? "").slice(0, 4),
    image: safeImage(title.poster),
    type: title.type === "tv" ? "tv" : "movie",
  }));
}

/** Resultado del servidor → texto honesto: una coincidencia no es lo mismo que «la más votada». */
export function describeResult(result, candidates = []) {
  if (!result) return null;
  const winner = candidates.find((item) => item.id === result.winner) ?? null;
  const tallies = (result.tallies ?? []).map((tally) => ({ ...tally, title: candidates.find((item) => item.id === tally.id) }));
  const text = {
    match: `¡Coincidencia! Las ${result.participants} personas dijeron que sí a «${winner?.title}».`,
    top: `No hubo coincidencia total. La que más gustó fue «${winner?.title}».`,
    none: result.all_vetoed
      ? "Todos los títulos quedaron vetados. Armen otra ronda o ajusten sus gustos."
      : "Ninguna convenció. Prueben otra ronda o ajusten sus gustos.",
  }[result.outcome];
  return { outcome: result.outcome, winner, text, tallies };
}

/** Progreso de la ronda abierta: cuántos títulos votó cada participante (nunca qué votó). */
export function roundProgress(round, members) {
  if (!round || round.status !== "open") return [];
  const total = round.candidates.length;
  return round.participants
    .map((userId) => members.find((member) => member.user_id === userId))
    .filter(Boolean)
    .map((member) => ({ userId: member.user_id, name: member.display_name, seat: member.seat, done: Math.min(member.votes_cast, total), total }));
}

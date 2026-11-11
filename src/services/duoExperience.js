import { DEFAULT_DUO_SESSION, DEFAULT_PERSON, TONES } from "../data/duo.js";

/** Una ocasión configura el formato y las butacas, nunca inventa gustos personales. */
export const DUO_OCCASIONS = [
  { id: "date", title: "Una cita", subtitle: "Dos gustos. Una buena noche.", icon: "heart", people: 2, mode: "movie" },
  { id: "friends", title: "Noche de amigos", subtitle: "Menos discusión, más historias.", icon: "ticket", people: 4, mode: "movie" },
  { id: "solo", title: "Un rato para mí", subtitle: "Tu siguiente descubrimiento.", icon: "moon", people: 1, mode: "movie" },
  { id: "marathon", title: "Tarde de maratón", subtitle: "Preparen las crispetas.", icon: "layers", people: 2, mode: "marathon" },
  // En familia el modo familia viene puesto: solo títulos con clasificación comprobada.
  { id: "family", title: "Plan en familia", subtitle: "Para todas las edades, sin sorpresas.", icon: "sun", people: 3, mode: "movie", family: "kids" },
];

export function startOccasion(session, id) {
  const occasion = DUO_OCCASIONS.find((item) => item.id === id);
  return {
    ...DEFAULT_DUO_SESSION,
    region: session.region,
    providers: [...session.providers],
    occasion: occasion?.id ?? null,
    mode: occasion?.mode ?? "movie",
    family: occasion?.family ?? session.family ?? "off",
    people: Array.from({ length: occasion?.people ?? session.people.length }, () => ({ ...DEFAULT_PERSON })),
  };
}

/**
 * Con cuenta: la persona 1 (quien usa el teléfono) parte de sus gustos guardados, y la sesión de su región y
 * plataformas. No se toca a nadie más: los gustos de cada acompañante los marca esa persona.
 */
export function withAccountTaste(session, prefs, name = "") {
  if (!prefs) return session;
  const [first, ...others] = session.people;
  return {
    ...session,
    region: prefs.region ?? session.region,
    providers: prefs.providers?.length ? [...prefs.providers] : session.providers,
    people: [
      { ...first, name: first.name || name, genres: [...(prefs.genres ?? [])], rejectedGenres: [...(prefs.rejectedGenres ?? [])], maxRuntime: prefs.maxRuntime || first.maxRuntime },
      ...others,
    ],
  };
}

export const moodLabel = (key) => TONES.find((tone) => tone.key === key)?.label ?? null;

/** Nueva ronda: baraja y personas congeladas, sin votos heredados de rondas anteriores. */
export function newRound(deck, size) {
  const id = globalThis.crypto?.randomUUID?.() ?? `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, deck: [...deck], size, person: 0, card: 0, phase: size > 1 ? "handoff" : "vote", votes: {}, result: null };
}

/** Votos de una ronda cerrada → votos de la sesión (el aprendizaje es por persona). La ronda conserva los suyos. */
export function mergeRoundVotes(sessionVotes = {}, roundVotes = {}) {
  const merged = { ...sessionVotes };
  for (const [id, list] of Object.entries(roundVotes)) {
    const base = [...(merged[id] ?? [])];
    list.forEach((vote, person) => {
      if (vote) base[person] = vote;
    });
    merged[id] = base;
  }
  return merged;
}

/**
 * Lo que la próxima tanda va a usar, por persona y sin inventar: películas de su calibración y votos.
 * → [{ name, loved, noped, yes, no }] solo de quien dio alguna señal.
 */
export function learningSummary(profile, votes = {}) {
  return profile.people
    .map((person, index) => {
      const lists = Object.values(votes).map((list) => list?.[index]);
      return { name: person.name, loved: person.loved.length, noped: person.noped.length, yes: lists.filter((vote) => vote === "yes").length, no: lists.filter((vote) => vote === "no").length };
    })
    .filter((entry) => entry.loved + entry.noped + entry.yes + entry.no > 0);
}

/** Tres propuestas del mismo tablero. No relaja filtros ni crea un consenso inexistente. */
export function shortlistItems(board, items) {
  const byId = new Map(items.map((item) => [item.title.id, item]));
  return [...new Set(board)].map((id) => byId.get(id)).filter(Boolean).slice(0, 3);
}

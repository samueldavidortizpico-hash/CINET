import { useCallback, useMemo } from "react";
import { CALIBRATION_ANSWERS, DEFAULT_DUO_SESSION, DEFAULT_MARATHON, DEFAULT_PERSON, DUO_SESSION_KEY, FAMILY_LEVELS, MAX_PEOPLE, MODES, stepsFor, TONES } from "../data/duo.js";
import { DUO_OCCASIONS } from "../services/duoExperience.js";
import { useLocalStorage } from "./useLocalStorage.js";

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const asList = (value) => (Array.isArray(value) ? value : []);
const asNumber = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

function asPerson(value) {
  const saved = isObject(value) ? value : {};
  return {
    ...DEFAULT_PERSON,
    name: typeof saved.name === "string" ? saved.name : "",
    genres: asList(saved.genres),
    mustGenres: asList(saved.mustGenres),
    rejectedGenres: asList(saved.rejectedGenres),
    tone: asList(saved.tone),
    actors: asList(saved.actors).filter((actor) => isObject(actor) && actor.id != null && actor.name),
    maxRuntime: asNumber(saved.maxRuntime, DEFAULT_PERSON.maxRuntime),
    episodeMax: asNumber(saved.episodeMax, 0),
    seasonsMax: asNumber(saved.seasonsMax, 0),
    seriesStatus: ["any", "ended", "ongoing"].includes(saved.seriesStatus) ? saved.seriesStatus : "any",
    titles: asList(saved.titles).filter(
      (item) => isObject(item) && typeof item.id === "string" && Array.isArray(item.genreKeys) && CALIBRATION_ANSWERS.some(({ key }) => key === item.answer)
    ),
  };
}

const ROUND_PHASES = ["handoff", "vote", "reveal", "results"];

/** Ronda guardada → ronda válida o null (una ronda dañada se descarta: no se inventan votos). */
function asRound(value) {
  if (!isObject(value) || typeof value.id !== "string" || !Array.isArray(value.deck) || !value.deck.length) return null;
  const size = Math.min(Math.max(asNumber(value.size, 1), 1), MAX_PEOPLE);
  return {
    id: value.id,
    deck: value.deck.filter((id) => typeof id === "string"),
    size,
    person: Math.min(Math.max(asNumber(value.person, 0), 0), size - 1),
    card: Math.max(asNumber(value.card, 0), 0),
    phase: ROUND_PHASES.includes(value.phase) ? value.phase : "handoff",
    votes: isObject(value.votes) ? value.votes : {},
    result: typeof value.result === "string" ? value.result : null,
  };
}

/** Sesión guardada (quizá de la versión anterior o dañada) → sesión válida. */
export function asSession(value) {
  const stored = isObject(value) ? value : {};
  const saved = asList(stored.people).slice(0, MAX_PEOPLE);
  const people = (saved.length ? saved : DEFAULT_DUO_SESSION.people).map(asPerson);
  const steps = stepsFor(people.length);
  return {
    ...DEFAULT_DUO_SESSION,
    step: steps.some(({ key }) => key === stored.step) ? stored.step : DEFAULT_DUO_SESSION.step,
    reached: Math.min(asNumber(stored.reached, 0), steps.length - 1),
    mode: MODES.some(({ key }) => key === stored.mode) ? stored.mode : DEFAULT_DUO_SESSION.mode,
    occasion: DUO_OCCASIONS.some(({ id }) => id === stored.occasion) ? stored.occasion : null,
    mood: TONES.some(({ key }) => key === stored.mood) ? stored.mood : null,
    resultView: stored.resultView === "explore" ? "explore" : "shortlist",
    marathon: { ...DEFAULT_MARATHON, ...(isObject(stored.marathon) ? stored.marathon : {}) },
    region: typeof stored.region === "string" ? stored.region : DEFAULT_DUO_SESSION.region,
    providers: asList(stored.providers),
    people,
    relax: { ...DEFAULT_DUO_SESSION.relax, ...(isObject(stored.relax) ? stored.relax : {}) },
    removed: asList(stored.removed),
    board: asList(stored.board),
    marathonPlan: isObject(stored.marathonPlan) && Array.isArray(stored.marathonPlan.entries) ? stored.marathonPlan : null,
    final: typeof stored.final === "string" ? stored.final : null,
    votes: isObject(stored.votes) ? stored.votes : {},
    family: FAMILY_LEVELS.some(({ key }) => key === stored.family) ? stored.family : "off",
    finalists: asList(stored.finalists).filter((item) => isObject(item) && typeof item.id === "string" && typeof item.role === "string"),
    batch: Math.max(asNumber(stored.batch, 1), 1),
    round: asRound(stored.round),
  };
}

/**
 * Sesión Duo persistida. update(patch | (sesión) => patch) mezcla los cambios.
 * hasSession: ya había una sesión guardada (para "Continuar sesión").
 */
export function useDuoSession() {
  const [stored, setStored] = useLocalStorage(DUO_SESSION_KEY, null);
  const session = useMemo(() => asSession(stored), [stored]);

  const update = useCallback(
    (patch) =>
      setStored((current) => {
        const base = asSession(current);
        return { ...base, ...(typeof patch === "function" ? patch(base) : patch) };
      }),
    [setStored]
  );
  const reset = useCallback((patch = {}) => setStored({ ...DEFAULT_DUO_SESSION, ...patch }), [setStored]);

  return { session, hasSession: isObject(stored), update, reset };
}

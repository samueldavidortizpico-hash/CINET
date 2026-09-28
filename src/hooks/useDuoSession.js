import { useCallback, useMemo } from "react";
import { DEFAULT_DUO_SESSION, DEFAULT_MARATHON, DEFAULT_PERSON, DUO_SESSION_KEY, MODES, STEPS } from "../data/duo.js";
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
  };
}

/** Sesión guardada (quizá de la versión anterior o dañada) → sesión válida. */
export function asSession(value) {
  const stored = isObject(value) ? value : {};
  const people = [0, 1].map((index) => asPerson(asList(stored.people)[index]));
  return {
    ...DEFAULT_DUO_SESSION,
    step: STEPS.some(({ key }) => key === stored.step) ? stored.step : DEFAULT_DUO_SESSION.step,
    reached: Math.min(asNumber(stored.reached, 0), STEPS.length - 1),
    mode: MODES.some(({ key }) => key === stored.mode) ? stored.mode : DEFAULT_DUO_SESSION.mode,
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

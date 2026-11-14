import { useCallback, useMemo } from "react";
import { CALIBRATION_ANSWERS, DEFAULT_DUO_SESSION, DEFAULT_MARATHON, DEFAULT_PERSON, DUO_SESSION_KEY, FAMILY_LEVELS, MARATHON_COUNTS, MARATHON_SCOPES, MARATHON_STYLES, MAX_PEOPLE, MODES, SESSION_LENGTHS, stepsFor, TONES } from "../data/duo.js";
import { DUO_OCCASIONS } from "../services/duoExperience.js";
import { useLocalStorage } from "./useLocalStorage.js";

/* Esquema de la sesión guardada (N11). Versión 2 = esta validación por campo. Una sesión sin versión
   (v1) se migra con los mismos decodificadores; una de versión FUTURA se descarta entera (no se
   adivina su forma). Cada fragmento inválido se quita por separado y se anota en `report` para avisar.
   Solo toca la clave de Duo: favoritos, planes y demás almacenamiento no se leen ni se borran aquí. */
export const DUO_SESSION_VERSION = 2;

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const asList = (value) => (Array.isArray(value) ? value : []);
const asNumber = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const isShortText = (value, max = 120) => typeof value === "string" && value.length > 0 && value.length <= max;
const isId = (value) => (typeof value === "string" && value.length > 0 && value.length <= 80) || (Number.isInteger(value) && value > 0);

/** Lista filtrada; si se descartó algo, lo anota. */
function keep(report, label, value, valid, max = 50) {
  const list = asList(value);
  const kept = list.filter(valid).slice(0, max);
  if (kept.length !== list.length || (value != null && !Array.isArray(value))) report.push(label);
  return kept;
}

/** { [id]: [voto | null, …] } con votos de texto corto. */
function asVotes(report, label, value) {
  if (!isObject(value)) {
    if (value != null) report.push(label);
    return {};
  }
  const out = {};
  for (const [id, list] of Object.entries(value).slice(0, 200)) {
    if (Array.isArray(list) && list.length <= 8 && list.every((vote) => vote === null || isShortText(vote, 20))) out[id] = list;
    else report.push(label);
  }
  return out;
}

function asMarathon(value) {
  const saved = isObject(value) ? value : {};
  const type = ["movie", "tv"].includes(saved.type) ? saved.type : DEFAULT_MARATHON.type;
  return {
    type,
    maxMinutes: SESSION_LENGTHS.some(({ value: minutes }) => minutes === Number(saved.maxMinutes)) ? Number(saved.maxMinutes) : DEFAULT_MARATHON.maxMinutes,
    count: MARATHON_COUNTS[type].includes(Number(saved.count)) ? Number(saved.count) : type === "tv" ? 6 : DEFAULT_MARATHON.count,
    style: MARATHON_STYLES.some(({ key }) => key === saved.style) ? saved.style : DEFAULT_MARATHON.style,
    scope: MARATHON_SCOPES.some(({ key }) => key === saved.scope) ? saved.scope : DEFAULT_MARATHON.scope,
  };
}

function asPerson(value, report = []) {
  const saved = isObject(value) ? value : {};
  const textList = (label, list) => keep(report, label, list, (item) => isShortText(item, 40), 30);
  return {
    ...DEFAULT_PERSON,
    name: typeof saved.name === "string" ? saved.name.slice(0, 40) : "",
    genres: textList("géneros", saved.genres),
    mustGenres: textList("géneros", saved.mustGenres),
    rejectedGenres: textList("géneros", saved.rejectedGenres),
    tone: textList("tono", saved.tone),
    // id numérico o de texto y nombre de TEXTO: un objeto como nombre rompía el render (N11).
    actors: keep(report, "actores", saved.actors, (actor) => isObject(actor) && isId(actor.id) && isShortText(actor.name), 10)
      .map((actor) => ({ id: actor.id, name: actor.name })),
    maxRuntime: asNumber(saved.maxRuntime, DEFAULT_PERSON.maxRuntime),
    episodeMax: asNumber(saved.episodeMax, 0),
    seasonsMax: asNumber(saved.seasonsMax, 0),
    seriesStatus: ["any", "ended", "ongoing"].includes(saved.seriesStatus) ? saved.seriesStatus : "any",
    titles: keep(
      report,
      "títulos calificados",
      saved.titles,
      (item) => isObject(item) && typeof item.id === "string" && Array.isArray(item.genreKeys) && item.genreKeys.every((key) => typeof key === "string") && CALIBRATION_ANSWERS.some(({ key }) => key === item.answer),
      200
    ),
  };
}

const ROUND_PHASES = ["handoff", "vote", "reveal", "results"];

/** Ronda guardada → ronda válida o null (una ronda dañada se descarta: no se inventan votos). */
function asRound(value, report = []) {
  if (value == null) return null;
  if (!isObject(value) || typeof value.id !== "string" || !Array.isArray(value.deck) || !value.deck.length) {
    report.push("ronda de votación");
    return null;
  }
  const size = Math.min(Math.max(asNumber(value.size, 1), 1), MAX_PEOPLE);
  const deck = keep(report, "ronda de votación", value.deck, (id) => typeof id === "string", 50);
  if (!deck.length) return null;
  return {
    id: value.id,
    deck,
    size,
    person: Math.min(Math.max(asNumber(value.person, 0), 0), size - 1),
    card: Math.min(Math.max(asNumber(value.card, 0), 0), deck.length),
    phase: ROUND_PHASES.includes(value.phase) ? value.phase : "handoff",
    votes: asVotes(report, "ronda de votación", value.votes),
    result: typeof value.result === "string" ? value.result : null,
  };
}

function asMarathonPlan(value, report) {
  if (value == null) return null;
  if (!isObject(value) || !Array.isArray(value.entries)) {
    report.push("maratón");
    return null;
  }
  return {
    ...(typeof value.notice === "string" && { notice: value.notice.slice(0, 300) }),
    entries: keep(report, "maratón", value.entries, (entry) => isObject(entry) && typeof entry.id === "string", 20).map((entry) => ({
      id: entry.id,
      episodes: Number.isFinite(entry.episodes) ? entry.episodes : null,
    })),
  };
}

/**
 * Sesión guardada (quizá de una versión anterior o dañada) → sesión válida.
 * report (opcional) recibe el nombre de cada fragmento descartado.
 */
export function asSession(value, report = []) {
  if (isObject(value) && Number.isFinite(value.version) && value.version > DUO_SESSION_VERSION) {
    report.push("sesión de una versión más nueva");
    return { ...DEFAULT_DUO_SESSION };
  }
  const stored = isObject(value) ? value : {};
  const saved = asList(stored.people).slice(0, MAX_PEOPLE);
  const people = (saved.length ? saved : DEFAULT_DUO_SESSION.people).map((person) => asPerson(person, report));
  const steps = stepsFor(people.length);
  const relax = isObject(stored.relax) ? stored.relax : {};
  return {
    ...DEFAULT_DUO_SESSION,
    step: steps.some(({ key }) => key === stored.step) ? stored.step : DEFAULT_DUO_SESSION.step,
    reached: Math.min(asNumber(stored.reached, 0), steps.length - 1),
    mode: MODES.some(({ key }) => key === stored.mode) ? stored.mode : DEFAULT_DUO_SESSION.mode,
    occasion: DUO_OCCASIONS.some(({ id }) => id === stored.occasion) ? stored.occasion : null,
    mood: TONES.some(({ key }) => key === stored.mood) ? stored.mood : null,
    resultView: stored.resultView === "explore" ? "explore" : "shortlist",
    marathon: asMarathon(stored.marathon),
    region: typeof stored.region === "string" && /^[A-Z]{2}$/.test(stored.region) ? stored.region : DEFAULT_DUO_SESSION.region,
    providers: keep(report, "plataformas", stored.providers, (id) => isShortText(id, 40) || Number.isInteger(id), 40),
    people,
    relax: {
      runtime: Math.max(asNumber(relax.runtime, 0), 0),
      platforms: relax.platforms === true,
      oneSided: relax.oneSided === true,
    },
    removed: keep(report, "títulos quitados", stored.removed, (id) => typeof id === "string", 500),
    board: keep(report, "resultados", stored.board, (id) => typeof id === "string", 100),
    marathonPlan: asMarathonPlan(stored.marathonPlan, report),
    final: typeof stored.final === "string" ? stored.final : null,
    votes: asVotes(report, "votos", stored.votes),
    family: FAMILY_LEVELS.some(({ key }) => key === stored.family) ? stored.family : "off",
    finalists: keep(report, "finalistas", stored.finalists, (item) => isObject(item) && typeof item.id === "string" && typeof item.role === "string" && (item.why == null || (Array.isArray(item.why) && item.why.length <= 10 && item.why.every((line) => typeof line === "string"))), 20),
    batch: Math.max(asNumber(stored.batch, 1), 1),
    round: asRound(stored.round, report),
    version: DUO_SESSION_VERSION,
  };
}

/**
 * Sesión Duo persistida. update(patch | (sesión) => patch) mezcla los cambios.
 * hasSession: ya había una sesión guardada (para "Continuar sesión").
 * repaired: nombres de los fragmentos descartados al leerla (para avisar; [] si estaba sana).
 */
export function useDuoSession() {
  const [stored, setStored] = useLocalStorage(DUO_SESSION_KEY, null);
  const [session, repaired] = useMemo(() => {
    const report = [];
    return [asSession(stored, report), [...new Set(report)]];
  }, [stored]);

  const update = useCallback(
    (patch) =>
      setStored((current) => {
        const base = asSession(current);
        return { ...base, ...(typeof patch === "function" ? patch(base) : patch) };
      }),
    [setStored]
  );
  const reset = useCallback((patch = {}) => setStored({ ...DEFAULT_DUO_SESSION, version: DUO_SESSION_VERSION, ...patch }), [setStored]);

  return { session, hasSession: isObject(stored), repaired, update, reset };
}

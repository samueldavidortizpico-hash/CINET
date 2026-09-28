/* =========================================================
   recommender — algoritmo de CineHub Duo (funciones puras, sin red
   ni almacenamiento). Recibe títulos normalizados por movieService.

   1. PERFIL (buildProfile): une las respuestas de las dos personas.
      Límites = el menor de los dos · imprescindibles y rechazados = la
      unión · "les gusta a ambos" = la intersección.

   2. FILTROS OBLIGATORIOS (checkTitle). Si uno falla, el título no sale:
      tipo (nunca se mezclan películas y series) · historial (vistas,
      rechazadas, "no me interesa") · quitados de la sesión · sin estrenar ·
      géneros rechazados · géneros imprescindibles (todos) · gustos de cada
      persona · duración · temporadas y estado (series, si TMDB lo sabe) ·
      plataformas. Solo tres se amplían a mano (profile.relax): +minutos,
      otras plataformas y "encaja con uno solo". Esos títulos van después
      de los estrictos y su explicación empieza por "Es una alternativa…".

   3. PUNTUACIÓN (scoreTitle): suma ponderada de criterios en [0, 1]
        score = Σ WEIGHTS[criterio] × valor[criterio]
      genre       géneros que les gustan presentes / min(2, nº elegidos)
      subgenre    1 si combina dos o más de esos géneros
      tone        1 si tiene el tono elegido (por género o palabra clave)
      cast        1 si sale un actor o actriz elegido
      compat      personas cuyos gustos cumple / personas que marcaron gustos
      runtime     1 si su duración confirmada cabe en el límite
      quality     valoración bayesiana (v·R + 200·6.5) / (v + 200), 5 → 0 y 8.5 → 1
      popularity  log10(1 + popularidad TMDB) / 3 (solo desempata)
      favorite    1 si alguno lo guardó en favoritos
      recent      1 si se recomendó hace poco (peso negativo: rota los títulos)
      No hay porcentajes de compatibilidad: solo motivos verificables.

   4. DIVERSIDAD (diversify): reordena restando DIVERSITY_PENALTY × parecido
      con los últimos elegidos (mismo género o misma saga).
   5. DADO (rollDice): sorteo ponderado e^((score − mejor) / T) entre los
      válidos, sin repetir lo que está en pantalla, lo anterior ni lo reciente.
   6. MARATÓN (buildMarathon): llena el tiempo según estilo y alcance.
   ========================================================= */

import { personName, SERIES_STATUS, SERIES_STATUS_LABELS, TONES } from "../data/duo.js";
import { PLATFORMS } from "../data/platforms.js";
import { GENRES, regionName } from "../data/tmdb.js";
import { asHistory, excludedIds } from "./historyService.js";

export const WEIGHTS = {
  genre: 30,
  subgenre: 10,
  tone: 15,
  cast: 10,
  compat: 20,
  runtime: 5,
  quality: 15,
  popularity: 5,
  favorite: 8,
  recent: -30,
};

const PRIOR_VOTES = 200;
const PRIOR_MEAN = 6.5;
const DIVERSITY_PENALTY = 15;
const DICE_TEMPERATURE = 12;
const RELAXED_WEIGHT = 0.25;

/* ---------- Utilidades ---------- */

const union = (...lists) => [...new Set(lists.flat().filter((item) => item != null))];
const intersect = (a = [], b = []) => a.filter((item) => b.includes(item));
const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
const round1 = (value) => Math.round(value * 10) / 10;
const uniqueById = (titles) => [...new Map(titles.map((title) => [title.id, title])).values()];
const today = () => new Date().toISOString().slice(0, 10);

/** ["a", "b", "c"] → "a, b y c" */
export const listEs = (items) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`);

export const genreName = (key) => (GENRES.find((genre) => genre.key === key)?.label ?? key).toLowerCase();
const genreNames = (keys) => listEs(keys.map(genreName));
const toneName = (key) => TONES.find((tone) => tone.key === key)?.label ?? key;

/** 128 → "2 h 8 min" */
export function formatMinutes(total) {
  const minutes = Math.round(total);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** "2014 · Película · 2 h 49 min" o "2008 · Serie · 5 temp. · episodios de 47 min" (solo datos conocidos). */
export function titleMeta(title) {
  const length =
    title.type === "tv"
      ? [title.seasons && `${title.seasons} temp.`, title.runtime && `episodios de ${title.runtime} min`].filter(Boolean).join(" · ")
      : title.runtime
        ? formatMinutes(title.runtime)
        : null;
  return [title.year, title.type === "tv" ? "Serie" : "Película", length].filter(Boolean).join(" · ");
}

/** Minutos de un título (película) o de un episodio (serie). runtimeCap: tope verificado por TMDB discover. */
const minutesOf = (title) => title.runtime || title.runtimeCap || 0;

/* ---------- 1. Perfil de la pareja ---------- */

export function buildProfile(session) {
  const type = session.mode === "marathon" ? (session.marathon?.type === "tv" ? "tv" : "movie") : session.mode === "tv" ? "tv" : "movie";
  const answers = session.people ?? [];
  const people = answers.map((person, index) => ({
    name: personName(person, index),
    genres: union(person.genres ?? [], person.mustGenres ?? []),
    tone: person.tone ?? [],
    actors: (person.actors ?? []).map((actor) => actor.name),
  }));
  const limit = (key) => {
    const values = answers.map((person) => Number(person[key]) || 0).filter((value) => value > 0);
    return values.length ? Math.min(...values) : 0;
  };
  const statuses = union(answers.map((person) => person.seriesStatus).filter((status) => SERIES_STATUS[status]));
  const rejected = union(...answers.map((person) => person.rejectedGenres ?? []));

  return {
    type,
    people,
    liked: union(...people.map((person) => person.genres)).filter((key) => !rejected.includes(key)),
    shared: intersect(people[0]?.genres, people[1]?.genres),
    must: union(...answers.map((person) => person.mustGenres ?? [])),
    rejected,
    tone: union(...people.map((person) => person.tone)),
    actors: [...new Map(answers.flatMap((person) => person.actors ?? []).map((actor) => [actor.id, actor])).values()],
    maxRuntime: limit(type === "tv" ? "episodeMax" : "maxRuntime"),
    seasonsMax: type === "tv" ? limit("seasonsMax") : 0,
    seriesStatus: type !== "tv" ? "any" : statuses.length > 1 ? "conflict" : (statuses[0] ?? "any"),
    region: session.region ?? "CO",
    providers: session.providers ?? [],
    relax: { runtime: 0, platforms: false, oneSided: false, ...session.relax },
  };
}

const capitalize = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;

/** Preferencias que hacen imposible cualquier resultado (blocking) o casi, explicadas. */
export function findConflicts(profile) {
  const conflicts = intersect(profile.must, profile.rejected).map((key) => ({
    blocking: true,
    text: `${capitalize(genreName(key))} es imprescindible para una persona y la otra lo rechaza.`,
  }));
  if (profile.type === "tv") {
    for (const key of profile.must.filter((item) => !GENRES.find((genre) => genre.key === item)?.tv)) {
      conflicts.push({ blocking: true, text: `TMDB no clasifica series como ${genreName(key)} y es imprescindible.` });
    }
  }
  if (profile.seriesStatus === "conflict") {
    conflicts.push({ blocking: true, text: "Una persona quiere una serie terminada y la otra una en emisión." });
  }
  for (const person of profile.people) {
    const blocked = person.genres.filter((key) => profile.rejected.includes(key));
    if (blocked.length && blocked.length === person.genres.length && !person.tone.length && !person.actors.length) {
      conflicts.push({ blocking: false, text: `Todo lo que le gusta a ${person.name} (${genreNames(blocked)}) lo rechaza la otra persona.` });
    }
  }
  return conflicts;
}

/* ---------- 2. Filtros obligatorios ---------- */

function tonesOf(title) {
  const words = [...(title.tags ?? []), ...(title.keywords ?? [])].join(" ").toLowerCase();
  return TONES.filter(
    (tone) => tone.genres.some((genre) => title.genreKeys?.includes(genre)) || tone.words.some((word) => words.includes(word))
  ).map((tone) => tone.key);
}

function hitsFor(person, title, tones) {
  const genres = intersect(person.genres, title.genreKeys ?? []);
  const tone = intersect(person.tone, tones);
  const cast = intersect(person.actors, title.castMatch ?? []);
  return {
    name: person.name,
    genres,
    tone,
    cast,
    expressed: person.genres.length + person.tone.length + person.actors.length > 0,
    pleased: genres.length + tone.length + cast.length > 0,
  };
}

/** "ok" | "relaxed" (cabe con los minutos extra) | "fail" (no cabe o no se sabe). */
function runtimeStatus(title, profile) {
  const max = profile.maxRuntime;
  if (!max) return "ok";
  const minutes = title.runtime || title.runtimeCap;
  if (!minutes) return "fail";
  if (minutes <= max) return "ok";
  return minutes <= max + (Number(profile.relax.runtime) || 0) ? "relaxed" : "fail";
}

const platformsOf = (title, profile) =>
  Array.isArray(title.providers)
    ? PLATFORMS.filter(
        (platform) =>
          profile.providers.includes(platform.id) && title.providers.some((provider) => platform.tmdbIds.includes(provider.id))
      )
    : [];

function isUnreleased(title, now) {
  if (title.status === "PRÓXIMAMENTE") return true;
  if (!title.releaseDate) return title.type === "tv" && title.tmdbId != null; // serie de TMDB sin fecha de estreno
  return title.releaseDate > now;
}

/**
 * → { ok: true, relaxed: [...] } o { ok: false, reason }.
 * reason: type | history | unreleased | rejected | must | taste | oneSided | runtime | seasons | status | platform
 */
export function checkTitle(title, profile, { excluded = new Set(), now = today() } = {}) {
  const relaxed = [];
  const fail = (reason) => ({ ok: false, reason });
  const genres = title.genreKeys ?? [];

  if ((title.type ?? "movie") !== profile.type) return fail("type");
  if (excluded.has(title.id)) return fail("history");
  if (isUnreleased(title, now)) return fail("unreleased");
  if (genres.some((key) => profile.rejected.includes(key))) return fail("rejected");
  if (!profile.must.every((key) => genres.includes(key))) return fail("must");

  const tones = tonesOf(title);
  const hits = profile.people.map((person) => hitsFor(person, title, tones)).filter((hit) => hit.expressed);
  const pleased = hits.filter((hit) => hit.pleased).length;
  if (hits.length && !pleased) return fail("taste");
  if (pleased < hits.length) {
    if (!profile.relax.oneSided) return fail("oneSided");
    relaxed.push("oneSided");
  }

  const runtime = runtimeStatus(title, profile);
  if (runtime === "fail") return fail("runtime");
  if (runtime === "relaxed") relaxed.push("runtime");

  if (profile.type === "tv") {
    if (profile.seasonsMax && title.seasons > profile.seasonsMax) return fail("seasons");
    if (profile.seriesStatus === "conflict") return fail("status");
    const wanted = SERIES_STATUS[profile.seriesStatus]?.tmdb;
    if (wanted && title.seriesStatus && !wanted.includes(title.seriesStatus)) return fail("status");
  }

  if (profile.providers.length && Array.isArray(title.providers) && !platformsOf(title, profile).length) {
    if (!profile.relax.platforms) return fail("platform");
    relaxed.push("platforms");
  }
  return { ok: true, relaxed };
}

/* ---------- 3. Puntuación y explicación ---------- */

/** Valoración bayesiana normalizada: pocas reseñas acercan la nota a la media (6.5). */
function quality({ rating = 0, votes }) {
  const value = Number.isFinite(votes) ? (votes * rating + PRIOR_VOTES * PRIOR_MEAN) / (votes + PRIOR_VOTES) : rating;
  return clamp01((value - 5) / 3.5);
}

function describeHit(hit) {
  if (hit.genres.length) return genreNames(hit.genres);
  if (hit.tone.length) return `tono ${listEs(hit.tone.map(toneName))}`;
  return `sale ${listEs(hit.cast)}`;
}

function reasonsFor(title, profile, facts) {
  const { hits, liked, toneHits, cast, relaxed, values } = facts;
  const reasons = [];
  const expressed = hits.filter((hit) => hit.expressed);
  const pleasedNames = expressed.filter((hit) => hit.pleased).map((hit) => hit.name);

  if (relaxed.includes("runtime")) reasons.push("Es una alternativa porque ampliaste el rango de duración.");
  if (relaxed.includes("platforms")) reasons.push("Es una alternativa: puede no estar en sus plataformas.");
  if (relaxed.includes("oneSided")) {
    const others = expressed.filter((hit) => !hit.pleased).map((hit) => hit.name);
    reasons.push(`Es una alternativa: encaja con los gustos de ${listEs(pleasedNames)}, no con los de ${listEs(others)}.`);
  }

  const shared = intersect(profile.shared, title.genreKeys ?? []);
  if (shared.length) reasons.push(`Coincide con el género elegido por ambos: ${genreNames(shared)}.`);
  else if (expressed.length === 2 && pleasedNames.length === 2) {
    reasons.push(`Encaja con los dos: ${expressed.map((hit) => `${describeHit(hit)} para ${hit.name}`).join(" y ")}.`);
  } else if (liked.length) {
    const who = expressed.filter((hit) => hit.genres.length).map((hit) => hit.name);
    reasons.push(`Coincide con ${genreNames(liked)}${who.length ? `, que eligió ${listEs(who)}` : ""}.`);
  }
  if (toneHits.length) reasons.push(`Tiene un tono similar al seleccionado (${listEs(toneHits.map(toneName))}).`);
  if (cast.length) reasons.push(`Sale ${listEs(cast)}.`);

  if (values.runtime) {
    const max = formatMinutes(profile.maxRuntime);
    if (profile.type === "tv") {
      reasons.push(title.runtime ? `Sus episodios duran unos ${title.runtime} min, dentro del límite.` : `Sus episodios duran menos de ${max}.`);
    } else {
      reasons.push(
        title.runtime
          ? `Está dentro del límite de duración: ${formatMinutes(title.runtime)} de ${max} como máximo.`
          : `Está dentro del límite de duración (menos de ${max}).`
      );
    }
  }
  if (profile.type === "tv") {
    if (title.seasons) reasons.push(`Tiene ${title.seasons} temporada${title.seasons === 1 ? "" : "s"}.`);
    if (SERIES_STATUS_LABELS[title.seriesStatus]) reasons.push(`Está ${SERIES_STATUS_LABELS[title.seriesStatus]}.`);
  }
  const platforms = platformsOf(title, profile);
  if (platforms.length) reasons.push(`Está en ${listEs(platforms.map((platform) => platform.name))} en ${regionName(profile.region)}.`);
  if (title.rating >= 7.5) {
    reasons.push(
      title.votes
        ? `Tiene ${title.rating}/10 en TMDB con ${title.votes.toLocaleString("es")} votos.`
        : `Tiene ${title.rating}/10 de valoración.`
    );
  }
  if (values.favorite) reasons.push("Uno de ustedes la guardó en favoritos.");
  if (!reasons.length) reasons.push("Cumple todos sus filtros; como no marcaron gustos, la ordenamos por valoración.");
  return reasons;
}

/**
 * → { score, breakdown: [{ key, points }], reasons: ["…"], bothPleased }
 * ctx: { favorites, recent, relaxed }
 */
export function scoreTitle(title, profile, { favorites = [], recent = [], relaxed = [] } = {}) {
  const tones = tonesOf(title);
  const hits = profile.people.map((person) => hitsFor(person, title, tones));
  const expressed = hits.filter((hit) => hit.expressed);
  const liked = intersect(profile.liked, title.genreKeys ?? []);
  const toneHits = intersect(profile.tone, tones);
  const cast = union(...hits.map((hit) => hit.cast));

  const values = {
    genre: profile.liked.length ? clamp01(liked.length / Math.min(profile.liked.length, 2)) : 0,
    subgenre: liked.length >= 2 ? 1 : 0,
    tone: toneHits.length ? 1 : 0,
    cast: cast.length ? 1 : 0,
    compat: expressed.length ? expressed.filter((hit) => hit.pleased).length / expressed.length : 0,
    runtime: profile.maxRuntime && runtimeStatus(title, profile) === "ok" ? 1 : 0,
    quality: quality(title),
    popularity: clamp01(Math.log10(1 + (title.popularity ?? 0)) / 3),
    favorite: favorites.includes(title.id) ? 1 : 0,
    recent: recent.includes(title.id) ? 1 : 0,
  };
  const breakdown = Object.keys(WEIGHTS)
    .filter((key) => values[key] > 0)
    .map((key) => ({ key, points: round1(WEIGHTS[key] * values[key]) }));

  return {
    score: round1(breakdown.reduce((total, item) => total + item.points, 0)),
    breakdown,
    reasons: reasonsFor(title, profile, { hits, liked, toneHits, cast, relaxed, values }),
    bothPleased: expressed.length === 2 && expressed.every((hit) => hit.pleased),
  };
}

/* ---------- 4. Ranking y diversidad ---------- */

/** Parecido entre dos títulos en [0, 1]: géneros en común (60 %) y misma saga (40 %). */
function similarity(a, b) {
  const genresA = a.genreKeys ?? [];
  const genresB = b.genreKeys ?? [];
  const all = union(genresA, genresB);
  const genre = all.length ? intersect(genresA, genresB).length / all.length : 0;
  const saga = a.collection?.id != null && a.collection.id === b.collection?.id ? 1 : 0;
  return 0.6 * genre + 0.4 * saga;
}

/** Reordena para no encadenar títulos parecidos. Las alternativas siempre van después. */
export function diversify(items, penalty = DIVERSITY_PENALTY) {
  // ponytail: O(n²) sobre ~100 candidatos; si crecen a miles, comparar por grupos de género.
  const pool = [...items];
  const out = [];
  while (pool.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    pool.forEach((item, index) => {
      const closeness = Math.max(0, ...out.slice(-3).map((picked) => similarity(picked.title, item.title)));
      const value = item.score - penalty * closeness - (item.relaxed.length ? 1000 : 0);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    out.push(...pool.splice(bestIndex, 1));
  }
  return out;
}

const byRank = (a, b) =>
  Number(a.relaxed.length > 0) - Number(b.relaxed.length > 0) || b.score - a.score || (b.title.rating ?? 0) - (a.title.rating ?? 0);

/**
 * Filtra, puntúa, ordena y diversifica.
 * → { items: [{ title, relaxed, score, breakdown, reasons, bothPleased }], rejectedBy: { [reason]: n } }
 */
export function rankTitles(titles, profile, { history, favorites = [], removed = [], now = today() } = {}) {
  const excluded = excludedIds(history);
  removed.forEach((id) => excluded.add(id));
  const { recent } = asHistory(history);
  const items = [];
  const rejectedBy = {};

  for (const title of uniqueById(titles)) {
    const check = checkTitle(title, profile, { excluded, now });
    if (!check.ok) {
      rejectedBy[check.reason] = (rejectedBy[check.reason] ?? 0) + 1;
      continue;
    }
    items.push({ title, relaxed: check.relaxed, ...scoreTitle(title, profile, { favorites, recent, relaxed: check.relaxed }) });
  }
  return { items: diversify(items.sort(byRank)), rejectedBy };
}

/** Tablero en pantalla: conserva los que siguen siendo válidos y rellena con los siguientes del ranking. */
export function fillBoard(board, items, size) {
  const ids = items.map((item) => item.title.id);
  const kept = board.filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))].slice(0, size);
}

/* ---------- 5. Dado ---------- */

/** Sorteo ponderado: peso = e^((score − mejor) / T); las alternativas pesan RELAXED_WEIGHT. */
function weightedPick(items, random = Math.random, temperature = DICE_TEMPERATURE) {
  if (!items.length) return null;
  const best = Math.max(...items.map((item) => item.score));
  const weights = items.map((item) => Math.exp((item.score - best) / temperature) * (item.relaxed?.length ? RELAXED_WEIGHT : 1));
  let roll = random() * weights.reduce((total, weight) => total + weight, 0);
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index];
    if (roll < 0) return items[index];
  }
  return items.at(-1);
}

/**
 * 🎲 Un candidato válido que no esté en pantalla ni sea el anterior; evita los recientes
 * mientras queden otros. → { item, poolSize, repeatsRecent } o null si no queda ninguno.
 */
export function rollDice(items, { shown = [], previous = null, recent = [], random = Math.random } = {}) {
  const avoid = new Set([...shown, previous].filter(Boolean));
  const fresh = items.filter((item) => !avoid.has(item.title.id));
  const unseen = fresh.filter((item) => !recent.includes(item.title.id));
  const pool = unseen.length ? unseen : fresh;
  const item = weightedPick(pool, random);
  return item && { item, poolSize: pool.length, repeatsRecent: !unseen.length };
}

/** "Ver otra parecida": el válido más parecido que no esté en pantalla (null si ninguno se parece). */
export function findSimilar(target, items, avoid = []) {
  const skip = new Set([target.id, ...avoid]);
  let best = null;
  let bestValue = 0;
  for (const item of items) {
    if (skip.has(item.title.id)) continue;
    const closeness = similarity(target, item.title);
    const value = closeness * 100 + item.score / 10; // el parecido manda; la puntuación desempata
    if (closeness > 0 && value > bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}

/* ---------- 6. Maratón ---------- */

const closest = (item, others) => Math.max(0, ...others.map((other) => similarity(other.title, item.title)));

// Ajuste de puntuación según el estilo, respecto a lo ya elegido (picked[0] marca el hilo).
const STYLE_BONUS = {
  thematic: (item, picked) => 25 * similarity(picked[0].title, item.title),
  varied: (item, picked) => -25 * closest(item, picked),
  balanced: (item, picked) => 10 * similarity(picked[0].title, item.title) - 12 * closest(item, picked.slice(1)),
};

function chooseNext(pool, picked, style, random) {
  const options = pool
    .filter((item) => !picked.includes(item))
    .map((item) => ({ item, score: item.score + STYLE_BONUS[style](item, picked), relaxed: item.relaxed }))
    .sort((a, b) => b.score - a.score);
  if (!options.length) return null;
  return (random ? weightedPick(options.slice(0, 6), random) : options[0]).item;
}

const byRelease = (a, b) => String(a.title.releaseDate || a.title.year).localeCompare(String(b.title.releaseDate || b.title.year));

function sagaMarathon(pool, settings, random) {
  const groups = new Map();
  for (const item of pool) {
    const id = item.title.collection?.id;
    if (id != null) groups.set(id, [...(groups.get(id) ?? []), item]);
  }
  const options = [];
  for (const members of groups.values()) {
    const chosen = [];
    let used = 0;
    for (const item of [...members].sort(byRelease)) {
      if (chosen.length >= settings.count || used + minutesOf(item.title) > settings.maxMinutes) break; // sin saltarse partes
      chosen.push(item);
      used += minutesOf(item.title);
    }
    if (chosen.length >= 2) {
      const average = chosen.reduce((total, item) => total + item.score, 0) / chosen.length;
      options.push({ chosen, score: average + 5 * chosen.length, relaxed: [] });
    }
  }
  if (!options.length) return null;
  options.sort((a, b) => b.score - a.score);
  const best = random ? weightedPick(options, random) : options[0];
  return {
    entries: best.chosen.map((item) => ({ id: item.title.id, episodes: null })),
    notice: `Saga «${best.chosen[0].title.collection.name}», en orden de estreno.`,
  };
}

/** Reparte `total` episodios entre `parts` series: 5 entre 2 → [3, 2]. */
const split = (total, parts) => Array.from({ length: parts }, (_, index) => Math.floor(total / parts) + (index < total % parts ? 1 : 0));

function seriesMarathon(pool, settings, random) {
  const oneSeries = settings.scope === "saga" || settings.style === "thematic";
  const maxSeries = Math.min(oneSeries ? 1 : settings.style === "balanced" ? 2 : settings.count, settings.count);
  const first = random ? weightedPick(pool, random) : pool[0];
  if (!first) return { entries: [], notice: null };
  const chosen = [first];
  while (chosen.length < maxSeries) {
    const next = chooseNext(pool, chosen, settings.style === "varied" ? "varied" : "balanced", random);
    if (!next) break;
    chosen.push(next);
  }

  const entries = [];
  let used = 0;
  split(settings.count, chosen.length).forEach((wanted, index) => {
    const item = chosen[index];
    const each = minutesOf(item.title);
    const episodes = Math.min(wanted, item.title.episodes || wanted, Math.floor((settings.maxMinutes - used) / each));
    if (episodes > 0) {
      entries.push({ id: item.title.id, episodes });
      used += episodes * each;
    }
  });
  return { entries, notice: null };
}

/**
 * Arma una maratón con títulos YA filtrados y puntuados (rankTitles).
 * settings: { type, maxMinutes, count (títulos o episodios), style, scope }
 * random: null = determinista (la mejor opción); una función = "regenerar" con el dado.
 * → { entries: [{ id, episodes }], notice }
 */
export function buildMarathon(items, settings, { random = null, avoid = [] } = {}) {
  const pool = items.filter((item) => !avoid.includes(item.title.id) && minutesOf(item.title) > 0);
  if (settings.type === "tv") return seriesMarathon(pool, settings, random);

  let notice = null;
  if (settings.scope === "saga") {
    const saga = sagaMarathon(pool, settings, random);
    if (saga) return saga;
    notice = "No encontramos una saga o universo con dos títulos que quepan en su tiempo; armamos una maratón temática.";
  }
  const style = settings.scope === "saga" ? "thematic" : settings.style;
  const fitting = (used) => pool.filter((item) => used + minutesOf(item.title) <= settings.maxMinutes);
  const firstOptions = fitting(0);
  const first = random ? weightedPick(firstOptions, random) : firstOptions[0];
  if (!first) return { entries: [], notice };

  const picked = [first];
  let used = minutesOf(first.title);
  while (picked.length < settings.count) {
    const next = chooseNext(fitting(used), picked, style, random);
    if (!next) break;
    picked.push(next);
    used += minutesOf(next.title);
  }
  return { entries: picked.map((item) => ({ id: item.title.id, episodes: null })), notice };
}

/**
 * Filas para la pantalla: orden, minutos, inicio y tiempo restante tras cada título.
 * Las entradas que dejaron de ser válidas (p. ej. marcadas como vistas) se cuentan en `missing`.
 */
export function describeMarathon(plan, items, settings) {
  const byId = new Map(items.map((item) => [item.title.id, item]));
  const entries = plan?.entries ?? [];
  const rows = [];
  let start = 0;
  for (const entry of entries) {
    const item = byId.get(entry.id);
    if (!item) continue;
    const minutes = minutesOf(item.title) * (entry.episodes || 1);
    rows.push({ item, episodes: entry.episodes, minutes, start, remainingAfter: settings.maxMinutes - start - minutes, approx: !item.title.runtime });
    start += minutes;
  }
  return { rows, total: start, remaining: settings.maxMinutes - start, missing: entries.length - rows.length, approx: rows.some((row) => row.approx) };
}

/** 🎲 Cambia un título (mismo número de episodios) por otro válido que quepa. null si no hay. */
export function replaceInMarathon(plan, id, items, settings, { random = Math.random, avoid = [] } = {}) {
  const { rows, remaining } = describeMarathon(plan, items, settings);
  const row = rows.find((item) => item.item.title.id === id);
  if (!row) return null;
  const inPlan = new Set(plan.entries.map((entry) => entry.id));
  const options = items.filter((item) => {
    const each = minutesOf(item.title);
    return (
      !inPlan.has(item.title.id) &&
      !avoid.includes(item.title.id) &&
      each > 0 &&
      each * (row.episodes || 1) <= remaining + row.minutes &&
      (!row.episodes || !item.title.episodes || item.title.episodes >= row.episodes)
    );
  });
  const item = weightedPick(options, random);
  if (!item) return null;
  const entries = plan.entries.map((entry) => (entry.id === id ? { id: item.title.id, episodes: row.episodes } : entry));
  return { plan: { ...plan, entries }, item, poolSize: options.length };
}

export const removeFromMarathon = (plan, id) => ({ ...plan, entries: plan.entries.filter((entry) => entry.id !== id) });

/* =========================================================
   recommender — algoritmo de CineHub Duo (funciones puras, sin red
   ni almacenamiento). Recibe títulos normalizados por movieService.

   1. PERFIL (buildProfile): une las respuestas de 1 a 8 personas.
      Límites = el menor · imprescindibles y rechazados = la unión ·
      "les gusta a todos" = la intersección · en grupos de 3 o más,
      "la mayoría" = géneros que eligió al menos la mitad.

   2. FILTROS (checkTitle).
      Duros (nunca salen): tipo (nunca se mezclan películas y series) ·
      historial (vistas, rechazadas, "no me interesa") · quitados de la
      sesión · sin estrenar · géneros rechazados · animación/documental si
      nadie los eligió · ningún imprescindible · no encaja con ninguno.
      Blandos: todos los imprescindibles · encaja con el quórum (todos en
      solitario o pareja; 2/3 del grupo desde 3 personas) · duración
      (hasta +NEAR_MINUTES o sin confirmar) · temporadas y estado · plataformas.
      Tres se amplían a mano (profile.relax): +minutos, otras plataformas y
      "encaja con uno solo". Si menos de MIN_RESULTS cumplen todo, se
      completa con los que fallan menos filtros blandos. Esos títulos van
      después de los estrictos y su explicación empieza por "Es una alternativa…".
      Un gusto se cumple por género o actor; el tono solo cuenta como gusto
      para quien no eligió géneros.

   3. PUNTUACIÓN (scoreTitle): suma ponderada de criterios en [0, 1]
        score = Σ WEIGHTS[criterio] × valor[criterio]
      genre       ½ · (géneros que les gustan presentes / min(2, nº elegidos))
                  + ½ · (géneros que les gustan / géneros del título): premia
                  lo que es de verdad de ese género, no lo que trae de todo
      subgenre    1 si combina dos o más de esos géneros
      tone        1 si tiene el tono elegido (por género o palabra clave)
      cast        1 si sale un actor o actriz elegido
      group       ajuste del grupo = ½ · media + ½ · mínimo de los ajustes por
                  persona (estrategia "menor descontento": nadie se queda
                  fuera). Ajuste de una persona: 0 si no encaja, 0.25 si solo
                  el tono, 0.6 + 0.4 · profundidad (cuántos de sus gustos toca)
      runtime     1 si su duración confirmada cabe en el límite
      quality     valoración bayesiana (v·R + 200·6.5) / (v + 200), 5 → 0 y 8.5 → 1
      popularity  log10(1 + popularidad TMDB) / 3 (solo desempata)
      fresh       1 si se estrenó hace menos de un año, ½ si hace menos de dos
      feedback    parecido a lo que votaron "sí" − parecido a lo que votaron
                  "no" en esta sesión, en [−1, 1]: el ranking aprende al votar
      favorite    1 si alguno lo guardó en favoritos
      recent      1 si se recomendó hace poco (peso negativo: rota los títulos)
      No hay porcentajes de compatibilidad: solo motivos verificables.

   4. DIVERSIDAD Y REPARTO (diversify): reordena restando DIVERSITY_PENALTY ×
      parecido con los últimos elegidos (mismo género o misma saga) y, desde el
      2.º puesto, adelanta una opción para quien aún no tenga ninguna suya.
   5. DADO (rollDice): sorteo ponderado e^((score − mejor) / T) entre los
      DICE_POOL mejores que cumplen todo (alternativas solo si no queda
      ninguno), sin repetir lo que está en pantalla, lo anterior ni lo reciente.
   6. MARATÓN (buildMarathon): llena el tiempo según estilo y alcance.
   ========================================================= */

import { FORMAT_GENRES, personName, SERIES_STATUS, SERIES_STATUS_LABELS, TONES } from "../data/duo.js";
import { PLATFORMS } from "../data/platforms.js";
import { GENRES, regionName } from "../data/tmdb.js";
import { asHistory, excludedIds } from "./historyService.js";

export const WEIGHTS = {
  genre: 30,
  subgenre: 10,
  tone: 15,
  cast: 10,
  group: 20,
  runtime: 5,
  quality: 15,
  popularity: 5,
  fresh: 6,
  feedback: 14,
  favorite: 8,
  recent: -30,
};

const PRIOR_VOTES = 200;
const PRIOR_MEAN = 6.5;
const DIVERSITY_PENALTY = 15;
const DICE_TEMPERATURE = 10;
const DICE_POOL = 15;
const RELAXED_WEIGHT = 0.25;
/** Resultados mínimos: si menos cumplen todo, se completa con alternativas cercanas. */
export const MIN_RESULTS = 20;
/** Minutos de más que se aceptan en una alternativa. */
export const NEAR_MINUTES = 30;

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

/* ---------- 1. Perfil del grupo ---------- */

/** Personas que deben quedar conformes para que un título cumpla todo: todas hasta 2; 2/3 desde 3. */
export const quorum = (expressed) => (expressed <= 2 ? expressed : Math.ceil((expressed * 2) / 3));

export function buildProfile(session) {
  const type = session.mode === "marathon" ? (session.marathon?.type === "tv" ? "tv" : "movie") : session.mode === "tv" ? "tv" : "movie";
  const answers = session.people ?? [];
  const people = answers.map((person, index) => ({
    name: personName(person, index),
    genres: union(person.genres ?? [], person.mustGenres ?? []),
    must: person.mustGenres ?? [],
    rejected: person.rejectedGenres ?? [],
    seriesStatus: person.seriesStatus ?? "any",
    tone: person.tone ?? [],
    actors: (person.actors ?? []).map((actor) => actor.name),
  }));
  const limit = (key) => {
    const values = answers.map((person) => Number(person[key]) || 0).filter((value) => value > 0);
    return values.length ? Math.min(...values) : 0;
  };
  const statuses = union(answers.map((person) => person.seriesStatus).filter((status) => SERIES_STATUS[status]));
  const rejected = union(...answers.map((person) => person.rejectedGenres ?? []));
  const liked = union(...people.map((person) => person.genres)).filter((key) => !rejected.includes(key));
  // "A todos": solo si cada persona eligió géneros (alguien sin gustos no "coincide" con nada).
  const shared = people.length > 1 && people.every((person) => person.genres.length) ? people.map((person) => person.genres).reduce(intersect) : [];
  const fans = (key) => people.filter((person) => person.genres.includes(key)).length;

  return {
    type,
    people,
    liked,
    shared,
    majority: people.length >= 3 ? liked.filter((key) => !shared.includes(key) && fans(key) >= Math.max(2, people.length / 2)) : [],
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
  const who = (test) => listEs(profile.people.filter(test).map((person) => person.name));
  const plural = (test) => profile.people.filter(test).length > 1;
  const conflicts = intersect(profile.must, profile.rejected).map((key) => {
    const rejects = (person) => person.rejected.includes(key);
    return {
      blocking: true,
      text: `${capitalize(genreName(key))} es imprescindible para ${who((person) => person.must.includes(key))} y ${who(rejects)} lo ${plural(rejects) ? "rechazan" : "rechaza"}.`,
    };
  });
  if (profile.type === "tv") {
    for (const key of profile.must.filter((item) => !GENRES.find((genre) => genre.key === item)?.tv)) {
      conflicts.push({ blocking: true, text: `TMDB no clasifica series como ${genreName(key)} y es imprescindible.` });
    }
  }
  if (profile.seriesStatus === "conflict") {
    const wants = (status) => (person) => person.seriesStatus === status;
    conflicts.push({
      blocking: true,
      text: `${who(wants("ended"))} ${plural(wants("ended")) ? "quieren" : "quiere"} una serie terminada y ${who(wants("ongoing"))} una en emisión.`,
    });
  }
  for (const person of profile.people) {
    const blocked = person.genres.filter((key) => profile.rejected.includes(key));
    if (blocked.length && blocked.length === person.genres.length && !person.tone.length && !person.actors.length) {
      const others = profile.people.length === 2 ? "la otra persona" : "alguien más del grupo";
      conflicts.push({ blocking: false, text: `Todo lo que le gusta a ${person.name} (${genreNames(blocked)}) lo rechaza ${others}.` });
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
  // Quien eligió géneros queda conforme con un género o un actor suyo; el tono solo no basta.
  const pleased = genres.length + cast.length > 0 || (!person.genres.length && tone.length > 0);
  // Profundidad: cuántos de sus gustos toca (con dos ya está lleno).
  const wanted = Math.min(2, person.genres.length + person.actors.length + (person.tone.length ? 1 : 0)) || 1;
  const depth = Math.min(1, (genres.length + cast.length + (tone.length ? 1 : 0)) / wanted);
  return {
    name: person.name,
    genres,
    tone,
    cast,
    expressed: person.genres.length + person.tone.length + person.actors.length > 0,
    pleased,
    fit: pleased ? 0.6 + 0.4 * depth : tone.length ? 0.25 : 0,
  };
}

/** Ajuste del grupo: ½ media + ½ mínimo ("menor descontento"). Con una persona, su ajuste. */
function groupFit(hits) {
  if (!hits.length) return 0;
  const fits = hits.map((hit) => hit.fit);
  return 0.5 * (fits.reduce((total, fit) => total + fit, 0) / fits.length) + 0.5 * Math.min(...fits);
}

/**
 * "ok" | "relaxed" (cabe con los minutos ampliados a mano) | "near" (hasta NEAR_MINUTES más
 * o sin confirmar: solo como alternativa) | "fail".
 */
function runtimeStatus(title, profile) {
  const max = profile.maxRuntime;
  if (!max) return "ok";
  const minutes = title.runtime || title.runtimeCap;
  if (!minutes) return "near";
  if (minutes <= max) return "ok";
  const extra = Number(profile.relax.runtime) || 0;
  if (minutes <= max + extra) return "relaxed";
  return minutes <= max + extra + NEAR_MINUTES ? "near" : "fail";
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
 * → { ok: true, relaxed: [...] } o { ok: false, reason, misses? }.
 * Con `misses` (filtros blandos que no cumple) el título puede completar la lista como alternativa.
 * reason: type | history | unreleased | rejected | format | must | taste | oneSided | runtime | seasons | status | platform
 */
export function checkTitle(title, profile, { excluded = new Set(), now = today() } = {}) {
  const relaxed = [];
  const misses = [];
  let reason = null;
  const miss = (key, why = key) => {
    misses.push(key);
    reason ??= why;
  };
  const fail = (why) => ({ ok: false, reason: why });
  const genres = title.genreKeys ?? [];

  if ((title.type ?? "movie") !== profile.type) return fail("type");
  if (excluded.has(title.id)) return fail("history");
  if (isUnreleased(title, now)) return fail("unreleased");
  if (genres.some((key) => profile.rejected.includes(key))) return fail("rejected");
  if (genres.some((key) => FORMAT_GENRES.includes(key) && !profile.liked.includes(key))) return fail("format");

  const mustHits = intersect(profile.must, genres).length;
  if (mustHits < profile.must.length) {
    if (!mustHits) return fail("must");
    miss("must");
  }

  const tones = tonesOf(title);
  const hits = profile.people.map((person) => hitsFor(person, title, tones)).filter((hit) => hit.expressed);
  const pleased = hits.filter((hit) => hit.pleased).length;
  if (hits.length && !pleased) return fail("taste");
  if (pleased < quorum(hits.length)) {
    if (profile.relax.oneSided) relaxed.push("oneSided");
    else miss("oneSided");
  }

  const runtime = runtimeStatus(title, profile);
  if (runtime === "fail") return fail("runtime");
  if (runtime === "relaxed") relaxed.push("runtime");
  if (runtime === "near") miss("runtime");

  if (profile.type === "tv") {
    if (profile.seriesStatus === "conflict") return fail("status");
    if (profile.seasonsMax && title.seasons > profile.seasonsMax) miss("seasons");
    const wanted = SERIES_STATUS[profile.seriesStatus]?.tmdb;
    if (wanted && title.seriesStatus && !wanted.includes(title.seriesStatus)) miss("status");
  }

  if (profile.providers.length && Array.isArray(title.providers) && !platformsOf(title, profile).length) {
    if (profile.relax.platforms) relaxed.push("platforms");
    else miss("platforms", "platform");
  }
  return misses.length ? { ok: false, reason, misses: [...relaxed, ...misses] } : { ok: true, relaxed };
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

/** "Encaja con los dos: comedia para Ana y acción para Luis." (con más de 3, los demás solo por nombre). */
function everyoneReason(expressed, size) {
  const shown = expressed.slice(0, 3).map((hit) => `${describeHit(hit)} para ${hit.name}`);
  const rest = expressed.slice(3).map((hit) => hit.name);
  const crowd = size === 2 ? "los dos" : size === 3 ? "los tres" : `los ${size}`;
  return rest.length
    ? `Encaja con ${crowd}: ${shown.join(", ")} y también con ${listEs(rest)}.`
    : `Encaja con ${crowd}: ${listEs(shown)}.`;
}

function reasonsFor(title, profile, facts) {
  const { hits, liked, toneHits, cast, relaxed, values, closest } = facts;
  const reasons = [];
  const size = profile.people.length;
  const solo = size === 1;
  const expressed = hits.filter((hit) => hit.expressed);
  const pleasedNames = expressed.filter((hit) => hit.pleased).map((hit) => hit.name);

  if (relaxed.includes("must")) {
    const genres = title.genreKeys ?? [];
    const has = profile.must.filter((key) => genres.includes(key));
    reasons.push(`Es una alternativa: es de ${genreNames(has)}, pero no de ${genreNames(profile.must.filter((key) => !has.includes(key)))}.`);
  }
  if (relaxed.includes("runtime")) {
    reasons.push(
      runtimeStatus(title, profile) === "relaxed"
        ? `Es una alternativa porque ${solo ? "ampliaste" : "ampliaron"} el rango de duración.`
        : "Es una alternativa: dura algo más de lo que pidieron o TMDB no confirma su duración."
    );
  }
  if (relaxed.includes("seasons")) reasons.push(`Es una alternativa: tiene ${title.seasons} temporadas, más de las que pidieron.`);
  if (relaxed.includes("status")) reasons.push("Es una alternativa: su estado de emisión no es el que pidieron.");
  if (relaxed.includes("platforms")) reasons.push("Es una alternativa: puede no estar en sus plataformas.");
  if (relaxed.includes("oneSided")) {
    const others = expressed.filter((hit) => !hit.pleased).map((hit) => hit.name);
    reasons.push(`Es una alternativa: encaja con los gustos de ${listEs(pleasedNames)}, no con los de ${listEs(others)}.`);
  }

  const shared = intersect(profile.shared, title.genreKeys ?? []);
  const majority = intersect(profile.majority ?? [], title.genreKeys ?? []);
  if (shared.length) reasons.push(`Coincide con ${size === 2 ? "el género elegido por ambos" : "lo que eligieron todos"}: ${genreNames(shared)}.`);
  else if (expressed.length >= 2 && pleasedNames.length === expressed.length) reasons.push(everyoneReason(expressed, size));
  else if (expressed.length >= 3 && pleasedNames.length >= 2 && !relaxed.includes("oneSided")) {
    reasons.push(`Encaja con ${listEs(pleasedNames)} (${pleasedNames.length} de ${expressed.length}).`);
  } else if (liked.length) {
    const who = expressed.filter((hit) => hit.genres.length).map((hit) => hit.name);
    reasons.push(solo ? `Es de ${genreNames(liked)}, lo que elegiste.` : `Coincide con ${genreNames(liked)}${who.length ? `, que eligió ${listEs(who)}` : ""}.`);
  }
  if (majority.length && !shared.length) reasons.push(`A la mayoría le gusta ${genreNames(majority)}.`);
  if (closest) reasons.push(`Se parece a «${closest.title}», que ${solo ? "te" : "les"} gustó.`);
  if (toneHits.length) reasons.push(`Tiene un tono similar al ${solo ? "que buscas" : "seleccionado"} (${listEs(toneHits.map(toneName))}).`);
  if (cast.length) reasons.push(`Sale ${listEs(cast)}.`);
  if (values.fresh === 1) reasons.push(`Es un estreno reciente (${title.year}).`);

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
  if (values.favorite) reasons.push(solo ? "La guardaste en favoritos." : size === 2 ? "Uno de ustedes la guardó en favoritos." : "Alguien del grupo la guardó en favoritos.");
  if (!reasons.length) {
    reasons.push(solo ? "Cumple tus filtros; como no marcaste gustos, la ordenamos por valoración." : "Cumple todos sus filtros; como no marcaron gustos, la ordenamos por valoración.");
  }
  return reasons;
}

/** 1 si se estrenó hace menos de un año, ½ si hace menos de dos. */
function freshness(title, now) {
  if (!title.releaseDate) return 0;
  const days = (Date.parse(now) - Date.parse(title.releaseDate)) / 86_400_000;
  if (!(days >= 0)) return 0;
  return days <= 365 ? 1 : days <= 730 ? 0.5 : 0;
}

/** Lo votado en la sesión → { liked, disliked } (títulos). Gana el voto más repetido; empate = neutro. */
export function feedbackFrom(votes = {}, titles = []) {
  const byId = new Map(titles.map((title) => [title.id, title]));
  const liked = [];
  const disliked = [];
  for (const [id, list] of Object.entries(votes)) {
    const title = byId.get(id);
    if (!title || !Array.isArray(list)) continue;
    const yes = list.filter((vote) => vote === "yes").length;
    const no = list.filter((vote) => vote === "no").length;
    if (yes > no) liked.push(title);
    else if (no > yes) disliked.push(title);
  }
  return { liked, disliked };
}

/** El más parecido de `list` (sin contar el propio título) y su parecido. */
function nearest(title, list) {
  let best = null;
  let value = 0;
  for (const other of list) {
    if (other.id === title.id) continue;
    const closeness = similarity(other, title);
    if (closeness > value) {
      best = other;
      value = closeness;
    }
  }
  return { best, value };
}

/**
 * → { score, breakdown: [{ key, points }], reasons: ["…"], allPleased, seats }
 * seats: por persona { name, expressed, pleased, fit, genres, tone, cast } (las butacas de la tarjeta).
 * ctx: { favorites, recent, relaxed, feedback: { liked, disliked }, now }
 */
export function scoreTitle(title, profile, { favorites = [], recent = [], relaxed = [], feedback = {}, now = today() } = {}) {
  const tones = tonesOf(title);
  const hits = profile.people.map((person) => hitsFor(person, title, tones));
  const expressed = hits.filter((hit) => hit.expressed);
  const genres = title.genreKeys ?? [];
  const liked = intersect(profile.liked, genres);
  const toneHits = intersect(profile.tone, tones);
  const cast = union(...hits.map((hit) => hit.cast));
  const likedNear = nearest(title, feedback.liked ?? []);
  const dislikedNear = nearest(title, feedback.disliked ?? []);

  const values = {
    // Cobertura (tiene lo que piden) y foco (no trae mucho más): una aventura-comedia-familiar-fantasía
    // no gana a una comedia pura solo por acumular géneros.
    genre: liked.length ? clamp01(0.5 * (liked.length / Math.min(profile.liked.length, 2)) + 0.5 * (liked.length / genres.length)) : 0,
    subgenre: liked.length >= 2 ? 1 : 0,
    tone: toneHits.length ? 1 : 0,
    cast: cast.length ? 1 : 0,
    group: groupFit(expressed),
    runtime: profile.maxRuntime && runtimeStatus(title, profile) === "ok" ? 1 : 0,
    quality: quality(title),
    popularity: clamp01(Math.log10(1 + (title.popularity ?? 0)) / 3),
    fresh: freshness(title, now),
    feedback: Math.max(-1, Math.min(1, likedNear.value - dislikedNear.value)),
    favorite: favorites.includes(title.id) ? 1 : 0,
    recent: recent.includes(title.id) ? 1 : 0,
  };
  const breakdown = Object.keys(WEIGHTS)
    .filter((key) => values[key] !== 0)
    .map((key) => ({ key, points: round1(WEIGHTS[key] * values[key]) }));
  const closest = likedNear.value >= 0.4 && likedNear.value > dislikedNear.value ? likedNear.best : null;

  return {
    score: round1(breakdown.reduce((total, item) => total + item.points, 0)),
    breakdown,
    reasons: reasonsFor(title, profile, { hits, liked, toneHits, cast, relaxed, values, closest }),
    allPleased: expressed.length >= 2 && expressed.every((hit) => hit.pleased),
    seats: hits.map((hit) => ({
      name: hit.name,
      expressed: hit.expressed,
      pleased: hit.pleased,
      fit: round1(hit.fit),
      genres: hit.genres,
      tone: hit.tone,
      cast: hit.cast,
    })),
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

/**
 * Reordena para no encadenar títulos parecidos y para que nadie se quede fuera: desde el 2.º puesto,
 * si alguien que marcó gustos aún no tiene ninguna opción suya y existe una, esa va antes
 * (cobertura del grupo; con pareja o solo casi nunca cambia nada). Las alternativas siempre van después.
 */
export function diversify(items, penalty = DIVERSITY_PENALTY) {
  // ponytail: O(n²) sobre ~100 candidatos; si crecen a miles, comparar por grupos de género.
  const pool = [...items];
  const out = [];
  const covered = new Set(); // índices de persona que ya tienen una opción suya
  const pleases = (item) => (item.seats ?? []).flatMap((seat, index) => (seat.expressed && seat.pleased ? [index] : []));
  const feeds = (item) => pleases(item).some((index) => !covered.has(index));
  while (pool.length) {
    const hungry = out.length > 0 && pool.some(feeds);
    let bestIndex = -1;
    let bestValue = -Infinity;
    pool.forEach((item, index) => {
      if (hungry && !feeds(item)) return;
      const closeness = Math.max(0, ...out.slice(-3).map((picked) => similarity(picked.title, item.title)));
      const value = item.score - penalty * closeness - 1000 * item.relaxed.length;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    const [picked] = pool.splice(bestIndex, 1);
    out.push(picked);
    pleases(picked).forEach((index) => covered.add(index));
  }
  return out;
}

// Menos filtros incumplidos primero; luego puntuación y valoración.
const byRank = (a, b) => a.relaxed.length - b.relaxed.length || b.score - a.score || (b.title.rating ?? 0) - (a.title.rating ?? 0);

export const isStrict = (item) => !item.relaxed.length;

/**
 * Filtra, puntúa, ordena y diversifica. Si menos de MIN_RESULTS cumplen todo (strict), completa
 * hasta 2 × MIN_RESULTS con alternativas que fallan filtros blandos (las que fallan menos, primero),
 * para que haya lista y el dado tenga de dónde sacar.
 * feedback: { liked, disliked } de feedbackFrom (votos de la sesión): el ranking aprende al votar.
 * → { items: [{ title, relaxed, score, breakdown, reasons, allPleased, seats }], strict, rejectedBy: { [reason]: n } }
 */
export function rankTitles(titles, profile, { history, favorites = [], removed = [], feedback = {}, now = today() } = {}) {
  const excluded = excludedIds(history);
  removed.forEach((id) => excluded.add(id));
  const { recent } = asHistory(history);
  const scored = (title, relaxed) => ({ title, relaxed, ...scoreTitle(title, profile, { favorites, recent, relaxed, feedback, now }) });
  const items = [];
  const near = [];
  const rejectedBy = {};

  for (const title of uniqueById(titles)) {
    const check = checkTitle(title, profile, { excluded, now });
    if (check.ok) {
      items.push(scored(title, check.relaxed));
      continue;
    }
    rejectedBy[check.reason] = (rejectedBy[check.reason] ?? 0) + 1;
    if (check.misses) near.push([title, check.misses]);
  }
  const strict = items.length;
  const fill = strict < MIN_RESULTS ? near.map(([title, misses]) => scored(title, misses)).sort(byRank).slice(0, 2 * MIN_RESULTS - strict) : [];
  // Las alternativas automáticas siempre después de los que pasan (también de los ampliados a mano).
  return { items: [...diversify(items.sort(byRank)), ...diversify(fill)], strict, rejectedBy };
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
 * 🎲 Uno de los DICE_POOL mejores que no esté en pantalla ni sea el anterior. Solo usa
 * alternativas si ya no queda ninguno que cumpla todo; evita los recientes mientras queden otros.
 * → { item, poolSize, repeatsRecent, alternative } o null si no queda ninguno.
 */
export function rollDice(items, { shown = [], previous = null, recent = [], random = Math.random } = {}) {
  const avoid = new Set([...shown, previous].filter(Boolean));
  const fresh = items.filter((item) => !avoid.has(item.title.id));
  const strict = fresh.filter(isStrict);
  const valid = strict.length ? strict : fresh;
  const unseen = valid.filter((item) => !recent.includes(item.title.id));
  const pool = (unseen.length ? unseen : valid).sort((a, b) => b.score - a.score).slice(0, DICE_POOL);
  const item = weightedPick(pool, random);
  return item && { item, poolSize: pool.length, repeatsRecent: !unseen.length, alternative: !strict.length };
}

/** "Ver otra parecida": el válido más parecido que no esté en pantalla (null si ninguno se parece). */
export function findSimilar(target, items, avoid = []) {
  const skip = new Set([target.id, ...avoid]);
  let best = null;
  let bestValue = -Infinity;
  for (const item of items) {
    if (skip.has(item.title.id)) continue;
    const closeness = similarity(target, item.title);
    // Cumplir todo manda; luego el parecido; la puntuación desempata.
    const value = closeness * 100 + item.score / 10 - 100 * item.relaxed.length;
    if (closeness > 0 && value > bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}

/* ---------- 6. Maratón ---------- */

const preferStrict = (items) => (items.some(isStrict) ? items.filter(isStrict) : items);
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
    // Una alternativa solo entra si no cabe ningún título que cumpla todo.
    .map((item) => ({ item, score: item.score + STYLE_BONUS[style](item, picked) - 100 * item.relaxed.length, relaxed: item.relaxed }))
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
  const firstOptions = preferStrict(pool);
  const first = random ? weightedPick(firstOptions, random) : firstOptions[0];
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
  const firstOptions = preferStrict(fitting(0));
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

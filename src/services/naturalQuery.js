/* =========================================================
   Búsqueda en lenguaje natural para Duo («una comedia corta en pareja en Netflix,
   nada de terror»). Intérprete local, acotado y determinista: no usa IA ni sale
   del navegador. Devuelve CRITERIOS (no títulos) y lo que entendió, para que la
   persona lo corrija; el motor de Duo decide los títulos y explica sus razones.
   Lo escrito cuenta como los gustos de quien escribe (persona 1); los «no»
   filtran para todo el grupo. A nadie más se le atribuyen gustos.
   ========================================================= */

import { DEFAULT_DUO_SESSION, DEFAULT_PERSON, MAX_PEOPLE } from "../data/duo.js";
import { GENRES } from "../data/tmdb.js";
import { PLATFORMS } from "../data/platforms.js";

const norm = (text) => ` ${String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9+ ]+/g, " ").replace(/\s+/g, " ").trim()} `;

const GENRE_WORDS = {
  action: ["accion", "peleas", "balazos"],
  adventure: ["aventura", "aventuras"],
  animation: ["animada", "animadas", "animacion", "dibujos", "anime"],
  comedy: ["comedia", "comedias", "risa", "reir", "chistosa", "graciosa"],
  drama: ["drama", "dramas", "dramatica"],
  "science-fiction": ["ciencia ficcion", "sci fi", "scifi", "espacial", "futurista"],
  fantasy: ["fantasia", "magia"],
  horror: ["terror", "miedo", "horror", "sustos"],
  thriller: ["suspenso", "thriller"],
  crime: ["crimen", "policiaca", "policial", "mafia"],
  mystery: ["misterio", "detectives"],
  romance: ["romance", "romantica", "romanticas", "de amor"],
  family: ["familiar"],
  documentary: ["documental", "documentales"],
};
// «max» solo no: choca con «máximo». HBO Max se reconoce por «hbo».
const PLATFORM_WORDS = { netflix: ["netflix"], disney: ["disney"], prime: ["prime", "amazon"], max: ["hbo", "hbo max"], appletv: ["apple"], paramount: ["paramount"], mgm: ["mgm"], crunchyroll: ["crunchyroll"] };
const MOOD_WORDS = { fun: ["divertida", "divertido", "para reir"], intense: ["intensa", "intenso"], romantic: ["romantica", "romantico"], exciting: ["emocionante", "adrenalina"], relaxed: ["relajada", "tranquila", "liviana", "ligera"] };
const NEGATION = /\b(nada de|sin|no quiero|no queremos|evitar|excepto|que no sea|nada que sea|ni)\s+(?:[a-z]+\s+){0,2}$/;
const NUMBERS = { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };

/** Posiciones de una palabra/frase completa en el texto normalizado. */
function positions(text, word) {
  const found = [];
  let index = text.indexOf(` ${word} `);
  while (index !== -1) {
    found.push(index);
    index = text.indexOf(` ${word} `, index + 1);
  }
  return found;
}

/** ¿Va negada? Mira solo el trozo anterior dentro de la misma cláusula. */
const negated = (text, index) => NEGATION.test(text.slice(0, index + 1).split(/ pero | y si | aunque /).at(-1));

export function parseQuery(input) {
  const text = norm(input);
  const result = { people: null, mode: null, liked: [], rejected: [], maxRuntime: null, providers: [], mood: null, family: null };

  for (const [key, words] of Object.entries(GENRE_WORDS)) {
    for (const word of words) {
      for (const index of positions(text, word)) {
        const list = negated(text, index) ? result.rejected : result.liked;
        if (!list.includes(key)) list.push(key);
      }
    }
  }
  result.liked = result.liked.filter((key) => !result.rejected.includes(key));

  for (const [id, words] of Object.entries(PLATFORM_WORDS)) if (words.some((word) => positions(text, word).length)) result.providers.push(id);
  for (const [key, words] of Object.entries(MOOD_WORDS)) if (!result.mood && words.some((word) => positions(text, word).length)) result.mood = key;

  if (/ (serie|series|capitulos|temporada) /.test(text)) result.mode = "tv";
  if (/ maraton /.test(text)) result.mode = "marathon";
  if (!result.mode && / (pelicula|peli|pelis|peliculas) /.test(text)) result.mode = "movie";

  if (/ (para (los )?ninos|infantil|con (los|mis) (ninos|hijos|hijas)|apta para ninos) /.test(text)) result.family = "kids";
  else if (/ (adolescentes|para mayores de 13|desde 13) /.test(text)) result.family = "teens";

  const counted = /\b(?:somos|para|seremos|vamos a ser)\s+(\d+|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho)\b(?! (?:h|hora|horas|min|minutos)\b)|\b(\d+|dos|tres|cuatro|cinco|seis|siete|ocho)\s+personas\b/.exec(text);
  if (counted) result.people = Number(NUMBERS[counted[1] ?? counted[2]] ?? counted[1] ?? counted[2]);
  else if (/ (en pareja|con mi pareja|cita|los dos|las dos|nosotros dos) /.test(text)) result.people = 2;
  else if (/ (en familia|con (los|mis) (ninos|hijos)) /.test(text)) result.people = 3;
  else if (/ (amigos|amigas|parche|en grupo) /.test(text)) result.people = 4;
  else if (/ (solo yo|yo solo|yo sola|para mi|estoy solo|estoy sola) /.test(text)) result.people = 1;
  if (result.people) result.people = Math.min(MAX_PEOPLE, Math.max(1, result.people));

  const limit = /\b(?:menos de|hasta|maximo|max)\s+(\d+(?:\s?y media)?)\s*(h|hora|horas|min|minutos)\b/.exec(text);
  if (limit) {
    const amount = Number.parseFloat(limit[1]) + (limit[1].includes("y media") ? 0.5 : 0);
    result.maxRuntime = Math.round(limit[2].startsWith("h") ? amount * 60 : amount);
  } else if (/ (corta|cortica|cortita|rapida|que no dure mucho) /.test(text)) result.maxRuntime = 100;
  else if (/ (larga|sin limite de tiempo) /.test(text)) result.maxRuntime = 0;

  return result;
}

const genreName = (key) => GENRES.find((genre) => genre.key === key)?.label.toLowerCase() ?? key;
const platformName = (id) => PLATFORMS.find((platform) => platform.id === id)?.name ?? id;

/** Lo entendido, en frases cortas que se pueden corregir. Vacío = no se entendió nada concreto. */
export function describeQuery(parsed) {
  const parts = [];
  if (parsed.people) parts.push(parsed.people === 1 ? "Solo tú" : parsed.people === 2 ? "En pareja" : `${parsed.people} personas`);
  if (parsed.mode) parts.push({ movie: "Película", tv: "Serie", marathon: "Maratón" }[parsed.mode]);
  if (parsed.liked.length) parts.push(`Te apetece: ${parsed.liked.map(genreName).join(", ")}`);
  if (parsed.rejected.length) parts.push(`Nada de: ${parsed.rejected.map(genreName).join(", ")}`);
  if (parsed.maxRuntime) parts.push(`Hasta ${Math.floor(parsed.maxRuntime / 60)} h ${parsed.maxRuntime % 60 ? `${parsed.maxRuntime % 60} min` : ""}`.trim());
  if (parsed.maxRuntime === 0) parts.push("Sin límite de duración");
  if (parsed.providers.length) parts.push(`En ${parsed.providers.map(platformName).join(", ")}`);
  if (parsed.mood) parts.push(`Ánimo: ${{ fun: "divertido", intense: "intenso", romantic: "romántico", exciting: "emocionante", relaxed: "relajado" }[parsed.mood]}`);
  if (parsed.family) parts.push(parsed.family === "kids" ? "Modo familia: niñas y niños" : "Modo familia: desde 13 años");
  return parts;
}

/** Criterios → sesión nueva de Duo (se revisa en el paso «Plan» antes de buscar). */
export function sessionFromQuery(session, parsed) {
  const count = parsed.people ?? session.people.length;
  const first = {
    ...DEFAULT_PERSON,
    name: session.people[0]?.name ?? "",
    genres: parsed.liked,
    rejectedGenres: parsed.rejected,
    maxRuntime: parsed.maxRuntime ?? DEFAULT_PERSON.maxRuntime,
  };
  return {
    ...DEFAULT_DUO_SESSION,
    region: session.region,
    providers: parsed.providers.length ? parsed.providers : [...session.providers],
    mode: parsed.mode ?? "movie",
    mood: parsed.mood,
    family: parsed.family ?? "off",
    people: [first, ...Array.from({ length: count - 1 }, () => ({ ...DEFAULT_PERSON }))],
  };
}

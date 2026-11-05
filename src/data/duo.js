/* CineHub Duo — sesión de 1 a MAX_PEOPLE personas, encuesta, series y maratón.
   Solo se guardan preferencias; nunca usuarios ni contraseñas de plataformas. */

export const DUO_PREFERENCES_KEY = "cinehub-duo-preferences"; // { genres } de la última sesión (lo usa el inicio)
export const DUO_HISTORY_KEY = "cinehub-duo-history";
export const DUO_SESSION_KEY = "cinehub-duo-session";

export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 8;

/** ¿Quiénes ven? count: personas al elegir la tarjeta (en grupo se ajusta con + y −). */
export const GROUPS = [
  { key: "solo", count: 1, label: "Solo yo", text: "Recomendaciones a tu medida." },
  { key: "pair", count: 2, label: "En pareja", text: "Dos gustos, una elección." },
  { key: "group", count: 4, label: "En grupo", text: `De 3 a ${MAX_PEOPLE} personas, sin que nadie se quede fuera.` },
];
export const groupOf = (count) => (count <= 1 ? "solo" : count === 2 ? "pair" : "group");

/** Color de la butaca de cada persona: la acompaña en todo el recorrido. */
export const SEAT_COLORS = ["#ff5a4f", "#ff9b55", "#f4c36c", "#7fd1ae", "#6fb6ff", "#b69cff", "#ff86c8", "#d8d0c8"];
export const seatColor = (index) => SEAT_COLORS[index % SEAT_COLORS.length];

/** "los dos" / "los 4" / "ti": a quién se le habla en los textos. */
export const crowd = (count) => (count <= 1 ? "ti" : count === 2 ? "los dos" : `los ${count}`);

export const MODES = [
  { key: "movie", icon: "🎬", label: "Película", text: "Una película que encaje con todos." },
  { key: "tv", icon: "📺", label: "Serie", text: "Una serie según episodios, temporadas y si ya terminó." },
  { key: "marathon", icon: "🍿", label: "Maratón", text: "Varias películas o episodios que caben en su tiempo." },
];

/** Respuestas de una persona. genres = "me gusta"; mustGenres = imprescindibles; rejectedGenres = "no quiero". */
export const DEFAULT_PERSON = {
  name: "",
  genres: [],
  mustGenres: [],
  rejectedGenres: [],
  tone: [],
  actors: [],
  maxRuntime: 130, // películas, en minutos (0 = sin límite)
  episodeMax: 0, // series: duración máxima por episodio
  seasonsMax: 0, // series: máximo de temporadas
  seriesStatus: "any", // any | ended | ongoing
  // Calibración por pósteres: [{ id, ids, title, year, poster, genreKeys, answer }] con answer
  // love ("Me encanta") | nope ("No es para mí") | seen ("Ya la vi") | unknown ("No la conozco").
  titles: [],
};

/**
 * Películas para calibrar gustos (catálogo local de CINET: siempre disponible, con póster propio).
 * Mezclan géneros, épocas y popularidad; ninguna es "la buena respuesta".
 */
export const CALIBRATION_IDS = ["interstellar", "the-hangover", "coco", "a-quiet-place", "forrest-gump", "john-wick", "the-godfather", "lord-of-the-rings-fellowship"];

export const CALIBRATION_ANSWERS = [
  { key: "love", icon: "♥", label: "Me encanta" },
  { key: "nope", icon: "✕", label: "No es para mí" },
  { key: "seen", icon: "👁", label: "Ya la vi" },
  { key: "unknown", icon: "?", label: "No la conozco" },
];

/** Las seis escenas de Duo. Cada paso de la sesión pertenece a una. */
export const DUO_SCENES = [
  { key: "setup", label: "Preparar la noche", short: "Noche" },
  { key: "taste", label: "Mostrar gustos", short: "Gustos" },
  { key: "match", label: "Encontrar coincidencias", short: "Coincidencias" },
  { key: "compare", label: "Comparar finalistas", short: "Finalistas" },
  { key: "decide", label: "Decidir juntos", short: "Decidir" },
  { key: "plan", label: "Organizar", short: "Plan" },
];
export const sceneOf = (step, roundOpen = false) =>
  step === "mode" ? "setup" : step.startsWith("person-") || step === "seen" ? "taste" : step === "common" ? "match" : step === "final" ? "plan" : roundOpen ? "decide" : "compare";

export const DEFAULT_MARATHON = { type: "movie", maxMinutes: 360, count: 3, style: "balanced", scope: "mix" };
export const MARATHON_COUNTS = { movie: [2, 3, 4, 5, 6], tv: [2, 4, 6, 8, 10, 12] };

/**
 * Sesión persistida (una recarga retoma el mismo paso y los mismos resultados).
 * board: ids en pantalla (el primero es la recomendación principal) · removed: quitados de esta sesión
 * relax: filtros ampliados a mano · marathonPlan: { entries: [{ id, episodes }], notice } · final: id elegido
 * votes: { [titleId]: ["yes" | "later" | "no" | null, …] }
 */
export const DEFAULT_DUO_SESSION = {
  step: "mode",
  reached: 0,
  mode: "movie",
  occasion: null,
  mood: null, // ánimo de esta sesión; no se atribuye a ninguna persona
  resultView: "shortlist",
  marathon: DEFAULT_MARATHON,
  region: "CO",
  providers: [],
  people: [DEFAULT_PERSON, DEFAULT_PERSON],
  relax: { runtime: 0, platforms: false, oneSided: false },
  removed: [],
  board: [],
  marathonPlan: null,
  final: null,
  votes: {},
  family: "off", // modo familia (FAMILY_LEVELS)
  // Finalistas fijadas para esta tanda: [{ id, role, why }]. Solo cambian con "Generar otra tanda" o al cambiar preferencias.
  finalists: [],
  batch: 1,
  // Ronda de votación persistida (una recarga la retoma; una nueva ronda empieza sin votos):
  // { id, deck: [ids], size, person, card, phase: handoff | vote | reveal | results, votes: { [id]: [...] }, result }
  round: null,
};

/**
 * Modo familia: filtra por clasificación por edad de TMDB con una lista EXACTA de clasificaciones
 * (con «hasta PG» TMDB deja pasar títulos sin clasificar). TMDB no tiene sistema colombiano: fuera de
 * México se usa el de EE. UU. como referencia, y la interfaz lo dice. Sin clasificación = no apto.
 */
export const FAMILY_LEVELS = [
  { key: "off", label: "No" },
  { key: "all", label: "Todo público" },
  { key: "kids", label: "Niñas y niños" },
  { key: "teens", label: "Desde 13 años" },
];
export const FAMILY_CERTS = {
  US: { system: "EE. UU. (MPA)", all: ["G"], kids: ["G", "PG"], teens: ["G", "PG", "PG-13"] },
  MX: { system: "México (RTC)", all: ["AA", "A"], kids: ["AA", "A"], teens: ["AA", "A", "B"] },
};
export function familyFilter(level, region) {
  if (!FAMILY_LEVELS.some((item) => item.key === level) || level === "off") return null;
  const country = FAMILY_CERTS[region] ? region : "US";
  return { level, country, system: FAMILY_CERTS[country].system, certifications: FAMILY_CERTS[country][level], fallback: country !== region };
}

/** Pasos de una sesión: uno por persona entre "Plan" y "Ya vistas". */
export const stepsFor = (count) => [
  { key: "mode", label: "Plan" },
  ...Array.from({ length: count }, (_, index) => ({ key: `person-${index}`, label: `Persona ${index + 1}` })),
  { key: "seen", label: "Ya vistas" },
  { key: "common", label: count > 1 ? "En común" : "Resumen" },
  { key: "results", label: "Resultados" },
  { key: "final", label: "Elección" },
];

/** Géneros que son un formato: solo salen si alguien los elige (una comedia animada no es "una comedia" para quien no pidió animación). */
export const FORMAT_GENRES = ["animation", "documentary"];

// Estado de ánimo: coincide por género o por palabras en etiquetas/keywords del título.
export const TONES = [
  { key: "fun", label: "divertido", icon: "😂", genres: ["comedy", "family"], words: ["comedia", "humor", "parody"] },
  { key: "intense", label: "intenso", icon: "🔥", genres: ["thriller", "horror", "crime"], words: ["revenge", "survival", "suspenso"] },
  { key: "romantic", label: "romántico", icon: "💘", genres: ["romance"], words: ["romance", "love", "amor"] },
  { key: "exciting", label: "emocionante", icon: "⚡", genres: ["action", "adventure", "science-fiction"], words: ["superhéroes", "superhero", "heist", "space", "espacio"] },
  { key: "relaxed", label: "relajado", icon: "🛋️", genres: ["family", "comedy"], words: ["friendship", "amistad", "nature"] },
];

export const RUNTIME_OPTIONS = [
  { value: 100, label: "Corta (hasta 1 h 40)" },
  { value: 130, label: "Normal (hasta 2 h 10)" },
  { value: 160, label: "Larga (hasta 2 h 40)" },
  { value: 0, label: "Sin límite" },
];

export const EPISODE_OPTIONS = [
  { value: 30, label: "Cortos (hasta 30 min)" },
  { value: 45, label: "Normales (hasta 45 min)" },
  { value: 65, label: "Largos (hasta 1 h 05)" },
  { value: 0, label: "Sin límite" },
];

export const SEASON_OPTIONS = [
  { value: 1, label: "Miniserie (1 temporada)" },
  { value: 3, label: "Hasta 3 temporadas" },
  { value: 0, label: "Cualquiera" },
];

export const SERIES_STATUS_OPTIONS = [
  { value: "any", label: "Me da igual" },
  { value: "ended", label: "Terminada (tiene final)" },
  { value: "ongoing", label: "En emisión" },
];

/** Estados de TMDB (status de /tv/{id}) que cumplen cada preferencia y su código en /discover/tv. */
export const SERIES_STATUS = {
  ended: { tmdb: ["Ended"], code: "3" },
  ongoing: { tmdb: ["Returning Series", "In Production"], code: "0|2" },
};

export const SERIES_STATUS_LABELS = {
  "Returning Series": "en emisión",
  Ended: "finalizada",
  Canceled: "cancelada",
  "In Production": "en producción",
  Planned: "anunciada",
  Pilot: "en piloto",
};

export const MARATHON_STYLES = [
  { key: "thematic", icon: "🎯", label: "Temática", text: "Mismo género, tono o universo de principio a fin." },
  { key: "varied", icon: "🎨", label: "Variada", text: "Cada título de un género distinto." },
  { key: "balanced", icon: "⚖️", label: "Equilibrada", text: "Un hilo común con algo de variedad." },
];

export const MARATHON_SCOPES = [
  { key: "mix", label: "Mezcla de títulos" },
  { key: "saga", label: "Saga o universo (en orden)" },
];

export const SESSION_LENGTHS = [
  { value: 240, label: "4 horas" },
  { value: 360, label: "6 horas" },
  { value: 480, label: "8 horas" },
  { value: 720, label: "12 horas" },
];

export const VOTES = [
  { key: "yes", icon: "❤️", label: "Sí" },
  { key: "later", icon: "🤔", label: "Quizá" },
  { key: "no", icon: "❌", label: "No" },
];
/** Puntos de cada voto para ordenar la ronda de votación. */
export const VOTE_POINTS = { yes: 2, later: 1, no: 0 };

/** Ambiente del plan en casa y comida sugerida. */
export const AMBIENCES = [
  { key: "romantic", label: "Romántico", icon: "💘", food: "Pizza artesanal y limonada de coco" },
  { key: "fun", label: "Divertido", icon: "😂", food: "Crispetas, nachos con queso y gaseosa" },
  { key: "intense", label: "Intenso", icon: "🔥", food: "Hamburguesas y papas a la francesa" },
];

export const personName = (person, index) => person?.name?.trim() || `Persona ${index + 1}`;

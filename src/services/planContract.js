/* =========================================================
   planContract — contrato v1 de los datos de planes y cartelera,
   espejo de supabase/migrations/20261107100000_plan_data_contracts.sql.
   La base rechaza lo inválido (CN422); aquí se DECODIFICA de forma
   defensiva al leer: una fila vieja o dañada nunca rompe una vista,
   solo pierde el campo que no cumple.
   ========================================================= */

/** Zonas que PostgreSQL e Intl aceptan. Idéntica a public.is_supported_time_zone (hay prueba que lo compara). */
export const SUPPORTED_TIME_ZONES = Object.freeze([
  "UTC", "America/Bogota", "America/Mexico_City", "America/Lima", "America/Guayaquil", "America/Panama",
  "America/Caracas", "America/Santiago", "America/Argentina/Buenos_Aires", "America/Sao_Paulo",
  "America/Montevideo", "America/La_Paz", "America/Asuncion", "America/Costa_Rica", "America/Guatemala",
  "America/El_Salvador", "America/Tegucigalpa", "America/Managua", "America/Santo_Domingo",
  "America/Puerto_Rico", "America/Havana", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Toronto", "Europe/Madrid", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Europe/Rome", "Europe/Lisbon",
]);
const ZONES = new Set(SUPPORTED_TIME_ZONES);

/** Zona utilizable para mostrar; con otra se usa UTC y se avisa (el instante no cambia). */
export function displayZone(zone) {
  if (ZONES.has(zone)) return { timeZone: zone, fallback: false };
  return { timeZone: "UTC", fallback: true };
}

const text = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");
const scalar = (value, max) => (typeof value === "string" ? value.slice(0, max) : Number.isFinite(value) ? value : null);
const number = (value, min, max) => (Number.isFinite(value) && value >= min && value <= max ? value : null);
const httpUrl = (value) => (typeof value === "string" && /^https?:\/\/\S+$/.test(value) && value.length <= 300 ? value : null);
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** plans.title → resumen del título (el id viene aparte: title_id). */
export function decodeTitle(raw) {
  const value = isObject(raw) ? raw : {};
  return {
    title: text(value.title, 200),
    year: scalar(value.year, 10) ?? "",
    duration: scalar(value.duration, 40) ?? "",
    runtime: number(value.runtime, 0, 2000),
    rating: scalar(value.rating, 10),
    genres: Array.isArray(value.genres) ? value.genres.filter((genre) => typeof genre === "string" || Number.isFinite(genre)).slice(0, 10).map(String) : [],
    image: text(value.image, 500),
  };
}

export function decodePlace(raw) {
  const value = isObject(raw) ? raw : {};
  const url = httpUrl(value.url);
  return { name: text(value.name, 120), location: text(value.location, 200), ...(url && { url }) };
}

/** Maratón: solo elementos con título de texto. null si no queda ninguno. */
export function decodeMarathon(raw) {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .filter((item) => isObject(item) && typeof item.title === "string" && item.title.trim())
    .slice(0, 12)
    .map((item) => ({
      id: typeof item.id === "string" || Number.isFinite(item.id) ? item.id : null,
      title: item.title.slice(0, 200),
      minutes: number(item.minutes, 0, 100000),
      episodes: number(item.episodes, 0, 10000),
    }));
  return items.length ? items : null;
}

export function decodeDetails(raw) {
  const value = isObject(raw) ? raw : {};
  return {
    ambience: text(value.ambience, 80) || null,
    food: text(value.food, 200) || null,
    duration: scalar(value.duration, 40),
    marathon: decodeMarathon(value.marathon),
    budget: Number.isInteger(value.budget) && value.budget >= 1 && value.budget <= 2_000_000 ? value.budget : null,
  };
}

/* =========================================================
   Turnos justos entre sesiones de Duo (opcional, en este navegador).
   - Solo usa lo que el grupo DECLARA al final («¿alguien cedió esta vez?»);
     nunca se deduce de los votos ni se le atribuye a nadie en secreto.
   - Empujón pequeño y con tope para títulos que encajan con quien cedió;
     no salta filtros duros (rechazos, duración, plataformas, familia).
   - Decae a la mitad cada 30 días y se puede reiniciar o apagar.
   ========================================================= */

export const TURNS_KEY = "cinet-duo-turns";
export const EMPTY_TURNS = { enabled: false, people: {} };
export const TURN_POINTS = 3; // puntos de ranking por punto de turno (un título bien puntuado ronda 100)
export const MAX_TURN = 3;
const HALF_LIFE_DAYS = 30;
const DAY = 86_400_000;

/** Solo nombres escritos por el grupo: «Persona 2» cambia de dueño cada sesión. */
export const turnKey = (name) => {
  const key = String(name ?? "").trim().toLowerCase();
  return key && !/^persona \d+$/.test(key) ? key : null;
};

function decayed(entry, now) {
  if (!entry) return 0;
  const days = Math.max(0, (now - Date.parse(entry.at)) / DAY);
  return entry.points * 0.5 ** (days / HALF_LIFE_DAYS);
}

/** Crédito actual (0..3) de cada persona con nombre de la sesión. */
export function turnCredits(state, names, now = Date.now()) {
  const credits = {};
  for (const name of names) {
    const key = turnKey(name);
    const value = key ? decayed(state?.people?.[key], now) : 0;
    if (value >= 0.1) credits[name] = Math.round(value * 10) / 10;
  }
  return credits;
}

/**
 * Lo que el grupo anotó al final: quien cedió gana un punto (tope 3); a quien no cedió se le descuenta uno,
 * porque esta vez la elección le quedó más cerca. Personas sin nombre propio no cuentan.
 */
export function recordYield(state, yielded, names, now = Date.now()) {
  const people = { ...(state?.people ?? {}) };
  const at = new Date(now).toISOString();
  for (const name of names) {
    const key = turnKey(name);
    if (!key) continue;
    const current = decayed(people[key], now);
    const points = yielded.includes(name) ? Math.min(MAX_TURN, current + 1) : Math.max(0, current - 1);
    people[key] = { points: Math.round(points * 100) / 100, at };
  }
  return { ...EMPTY_TURNS, ...state, people };
}

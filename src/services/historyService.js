/* =========================================================
   historyService — qué no volver a recomendar (funciones puras).
   Lo persiste useDuoHistory en localStorage ("cinehub-duo-history").

   seen           vistas ("Ya la vimos" o "Marcar como vista")
   rejected       rechazadas (las dos personas votaron ❌)
   notInterested  "No me interesa"
   recent         recomendadas hace poco: no se excluyen, bajan de puesto
                  y el dado las evita
   titles         título, tipo y póster de lo excluido, para listarlo y
                  poder recuperarlo sin volver a pedirlo a TMDB
   ========================================================= */

export const EMPTY_HISTORY = { seen: [], rejected: [], notInterested: [], recent: [], titles: {} };
export const EXCLUDING = ["seen", "rejected", "notInterested"];
const RECENT_LIMIT = 60;

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const idList = (...values) =>
  [...new Set(values.flatMap((value) => (Array.isArray(value) ? value : [])))].filter((id) => typeof id === "string" && id !== "");

/** Historial guardado (quizá viejo, dañado o de otra versión) → historial válido. */
export function asHistory(value) {
  const stored = isObject(value) ? value : {};
  const titles = isObject(stored.titles)
    ? Object.fromEntries(Object.entries(stored.titles).filter(([, meta]) => isObject(meta) && typeof meta.title === "string"))
    : {};
  return {
    seen: idList(stored.seen),
    rejected: idList(stored.rejected, stored.dismissed), // "dismissed" = nombre de la versión anterior
    notInterested: idList(stored.notInterested),
    recent: idList(stored.recent).slice(0, RECENT_LIMIT),
    titles,
  };
}

export const excludedIds = (history) => new Set(EXCLUDING.flatMap((list) => asHistory(history)[list]));

const titleMeta = (title) => ({ title: title.title, type: title.type ?? "movie", poster: title.poster ?? "", year: title.year ?? "" });

/** Añade títulos (objetos o ids) al principio de history[list], sin duplicados. */
export function addToHistory(history, list, titles) {
  const current = asHistory(history);
  const ids = titles.map((title) => (typeof title === "string" ? title : title.id));
  const meta = Object.fromEntries(titles.filter(isObject).map((title) => [title.id, titleMeta(title)]));
  return {
    ...current,
    [list]: idList(ids, current[list]).slice(0, list === "recent" ? RECENT_LIMIT : undefined),
    titles: list === "recent" ? current.titles : { ...current.titles, ...meta },
  };
}

/** Quita un id de history[list] (p. ej. desmarcar "ya la vi"). */
export function removeFromHistory(history, list, id) {
  const current = asHistory(history);
  return { ...current, [list]: current[list].filter((item) => item !== id) };
}

/** "Recuperar": vuelve a ser recomendable (sale de vistas, rechazadas y "no me interesa"). */
export function restoreTitle(history, id) {
  const current = asHistory(history);
  const titles = { ...current.titles };
  delete titles[id];
  return { ...current, ...Object.fromEntries(EXCLUDING.map((list) => [list, current[list].filter((item) => item !== id)])), titles };
}

const typeOf = (id, meta) => meta?.type ?? (String(id).startsWith("tmdb-tv-") ? "tv" : "movie");

/** Excluidos agrupados para "Ver títulos excluidos": películas vistas, series vistas, rechazadas, no me interesa. */
export function excludedGroups(history) {
  const current = asHistory(history);
  const entry = (id) => ({ id, ...(current.titles[id] ?? { title: id, type: typeOf(id), poster: "", year: "" }) });
  const seenOf = (type) => current.seen.filter((id) => typeOf(id, current.titles[id]) === type).map(entry);
  return [
    { key: "seen-movie", label: "Películas vistas", items: seenOf("movie") },
    { key: "seen-tv", label: "Series vistas", items: seenOf("tv") },
    { key: "rejected", label: "Rechazadas por los dos", items: current.rejected.map(entry) },
    { key: "notInterested", label: "No nos interesan", items: current.notInterested.map(entry) },
  ];
}

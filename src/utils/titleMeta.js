/* Texto corto de un título para tarjetas y carrusel. Vive fuera de recommender.js para que
   el inicio no descargue el motor de Duo (un módulo va entero al chunk que lo importa primero). */

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

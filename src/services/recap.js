/* =========================================================
   Resumen del año (voluntario). Solo con lo que tiene fecha (los planes) y
   el total de «Ya vistas». Lo que se comparte son cifras agregadas: nunca
   nombres de otras personas, votos, gustos ni direcciones. Sin rachas.
   ========================================================= */

import { MONTHS } from "../data/showtimes.js";

const counted = (plan) => plan.status !== "cancelled" && (plan.isOwner || plan.myRsvp === "yes" || !plan.remote);

export function buildRecap({ plans = [], history, year }) {
  const mine = plans.filter((plan) => counted(plan) && plan.dateISO?.startsWith(String(year)));
  const byMonth = Array.from({ length: 12 }, (_, month) => mine.filter((plan) => Number(plan.dateISO.slice(5, 7)) === month + 1).length);
  const best = Math.max(...byMonth);
  const genres = {};
  for (const plan of mine) for (const genre of plan.movie?.genres ?? []) genres[genre] = (genres[genre] ?? 0) + 1;
  const topGenre = Object.entries(genres).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const titles = new Set(mine.map((plan) => plan.movie?.id ?? plan.movie?.title));
  return {
    year,
    plans: mine.length,
    cinema: mine.filter((plan) => plan.mode !== "home").length,
    home: mine.filter((plan) => plan.mode === "home").length,
    titles: titles.size,
    byMonth,
    bestMonth: best > 0 ? MONTHS[byMonth.indexOf(best)] : null,
    topGenre,
    seenTotal: history?.seen?.length ?? 0,
  };
}

/** Texto para compartir: solo cifras propias, sin nombres de nadie más. */
export function recapShareText(recap) {
  const parts = [`Mi ${recap.year} en CINET: ${recap.plans} ${recap.plans === 1 ? "plan" : "planes"}`];
  if (recap.cinema && recap.home) parts.push(`${recap.cinema} en cine y ${recap.home} en casa`);
  if (recap.topGenre) parts.push(`lo que más planeé: ${recap.topGenre.toLowerCase()}`);
  if (recap.bestMonth) parts.push(`mi mes más movido: ${recap.bestMonth}`);
  return `${parts.join(", ")}.`;
}

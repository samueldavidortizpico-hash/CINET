/* =========================================================
   showtimeService — funciones y eventos publicados por aliados verificados.
   Contrato: título canónico, exhibidor y sede, inicio con zona, formato e
   idioma, URL oficial, precio si existe, fuente, última actualización,
   vigencia y estado. Sin fuente no se afirma hora, cupos, precio ni
   disponibilidad; una función vencida o cancelada no se muestra.

   N13/N22: cada fila se transforma por separado (una fila dañada se aparta,
   las demás se ven) y un fallo de red LANZA error: «sin funciones» y «no
   pudimos cargar» son estados distintos para la interfaz.
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { describeStart } from "./planService.js";

const LISTING = "id, org_id, venue_id, kind, title_id, title, starts_at, time_zone, format, language, price_cop, official_url, source, status, valid_until, updated_at";
const text = (value, max = 200) => (typeof value === "string" ? value.slice(0, max) : "");
const httpsUrl = (value) => (typeof value === "string" && /^https:\/\/\S+$/.test(value) ? value : null);

/** Vigente: programada, futura y con datos aún válidos (la RLS ya lo filtra; aquí se revalida al pintar). */
export const isCurrent = (showtime, now = new Date()) =>
  showtime.status === "scheduled" && new Date(showtime.startsAt) > now && new Date(showtime.validUntil) > now;

export function toShowtime(row, venues = new Map(), orgs = new Map()) {
  const venue = venues.get(row.venue_id);
  const officialUrl = httpsUrl(row.official_url);
  if (!officialUrl) throw new TypeError("official_url no válida");
  return {
    id: row.id,
    orgId: row.org_id,
    kind: row.kind,
    titleId: row.title_id,
    title: text(row.title?.title),
    exhibitor: text(orgs.get(row.org_id)?.name, 80),
    venue: text(venue?.name, 80),
    city: text(venue?.city, 60),
    startsAt: row.starts_at,
    timeZone: row.time_zone,
    ...describeStart(row.starts_at, row.time_zone),
    format: text(row.format, 20) || null,
    language: text(row.language, 20) || null,
    price: Number.isInteger(row.price_cop) ? row.price_cop : null,
    officialUrl,
    source: row.source,
    status: row.status,
    updatedAt: row.updated_at,
    validUntil: row.valid_until,
  };
}

/** Transforma fila por fila; las que no cumplen se cuentan como omitidas en vez de tumbar el bloque. */
export function toShowtimes(rows, venues, orgs, now = new Date()) {
  const items = [];
  let skipped = 0;
  for (const row of rows ?? []) {
    try {
      const showtime = toShowtime(row, venues, orgs);
      if (isCurrent(showtime, now)) items.push(showtime);
    } catch {
      skipped += 1;
    }
  }
  return { items, skipped };
}

const unavailable = () => Object.assign(new Error("No pudimos cargar la cartelera de aliados."), { code: "network" });

async function lookups(rows) {
  const venueIds = [...new Set(rows.map((row) => row.venue_id).filter(Boolean))];
  const orgIds = [...new Set(rows.map((row) => row.org_id))];
  const [venues, orgs] = await Promise.all([
    venueIds.length ? supabase.from("venues").select("id, name, city").in("id", venueIds) : { data: [] },
    orgIds.length ? supabase.from("organizations").select("id, name").in("id", orgIds) : { data: [] },
  ]);
  // Sin nombres de sede u organización la fila sigue siendo útil (hora + enlace oficial).
  return { venues: new Map((venues.data ?? []).map((venue) => [venue.id, venue])), orgs: new Map((orgs.data ?? []).map((org) => [org.id, org])) };
}

/** Funciones vigentes de un título → { items, skipped }. Lanza si la consulta falla. */
export async function getListingsForTitle(titleId, now = new Date()) {
  if (!supabase) return { items: [], skipped: 0 };
  const { data, error } = await supabase.from("listings").select(LISTING).eq("title_id", String(titleId)).order("starts_at", { ascending: true }).limit(100);
  if (error) throw unavailable();
  if (!data?.length) return { items: [], skipped: 0 };
  const { venues, orgs } = await lookups(data);
  return toShowtimes(data, venues, orgs, now);
}

/** Ofertas patrocinadas vigentes (aparte de las funciones; no tocan el ranking). Lanza si la consulta falla. */
export async function getOffersForTitle(titleId, now = new Date()) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("offers").select("id, org_id, headline, body, url, valid_until").eq("title_id", String(titleId)).limit(20);
  if (error) throw unavailable();
  if (!data?.length) return [];
  const { orgs } = await lookups(data);
  return data
    .filter((offer) => new Date(offer.valid_until) > now && httpsUrl(offer.url) && typeof offer.headline === "string")
    .map((offer) => ({ id: offer.id, orgId: offer.org_id, exhibitor: text(orgs.get(offer.org_id)?.name, 80), headline: text(offer.headline, 80), body: text(offer.body), url: offer.url }));
}

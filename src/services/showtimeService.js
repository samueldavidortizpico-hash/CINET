/* =========================================================
   showtimeService — funciones y eventos publicados por aliados verificados.
   Contrato: título canónico, exhibidor y sede, inicio con zona, formato e
   idioma, URL oficial, precio si existe, fuente, última actualización,
   vigencia y estado. Sin fuente no se afirma hora, cupos, precio ni
   disponibilidad; una función vencida o cancelada no se muestra.
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { describeStart } from "./planService.js";

const LISTING = "id, org_id, venue_id, kind, title_id, title, starts_at, time_zone, format, language, price_cop, official_url, source, status, valid_until, updated_at";

/** Vigente: programada, futura y con datos aún válidos (la RLS ya lo filtra; aquí se revalida al pintar). */
export const isCurrent = (showtime, now = new Date()) =>
  showtime.status === "scheduled" && new Date(showtime.startsAt) > now && new Date(showtime.validUntil) > now;

export function toShowtime(row, venues = new Map(), orgs = new Map()) {
  const venue = venues.get(row.venue_id);
  return {
    id: row.id,
    orgId: row.org_id,
    kind: row.kind,
    titleId: row.title_id,
    title: row.title?.title ?? "",
    exhibitor: orgs.get(row.org_id)?.name ?? "",
    venue: venue?.name ?? "",
    city: venue?.city ?? "",
    startsAt: row.starts_at,
    timeZone: row.time_zone,
    ...describeStart(row.starts_at, row.time_zone),
    format: row.format ?? null,
    language: row.language ?? null,
    price: Number.isInteger(row.price_cop) ? row.price_cop : null,
    officialUrl: row.official_url,
    source: row.source,
    status: row.status,
    updatedAt: row.updated_at,
    validUntil: row.valid_until,
  };
}

async function lookups(rows) {
  const venueIds = [...new Set(rows.map((row) => row.venue_id).filter(Boolean))];
  const orgIds = [...new Set(rows.map((row) => row.org_id))];
  const [venues, orgs] = await Promise.all([
    venueIds.length ? supabase.from("venues").select("id, name, city").in("id", venueIds) : { data: [] },
    orgIds.length ? supabase.from("organizations").select("id, name").in("id", orgIds) : { data: [] },
  ]);
  return { venues: new Map((venues.data ?? []).map((venue) => [venue.id, venue])), orgs: new Map((orgs.data ?? []).map((org) => [org.id, org])) };
}

/** Funciones vigentes de un título. La cartelera de aliados es un extra: si falla, se muestra vacía, nunca inventada. */
export async function getListingsForTitle(titleId, now = new Date()) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("listings").select(LISTING).eq("title_id", String(titleId)).order("starts_at", { ascending: true });
  if (error || !data?.length) return [];
  const { venues, orgs } = await lookups(data);
  return data.map((row) => toShowtime(row, venues, orgs)).filter((showtime) => isCurrent(showtime, now));
}

/** Ofertas patrocinadas vigentes de un título (se muestran aparte y no tocan el ranking). */
export async function getOffersForTitle(titleId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("offers").select("id, org_id, headline, body, url, valid_until").eq("title_id", String(titleId));
  if (error || !data?.length) return [];
  const { orgs } = await lookups(data);
  return data
    .filter((offer) => new Date(offer.valid_until) > new Date())
    .map((offer) => ({ id: offer.id, orgId: offer.org_id, exhibitor: orgs.get(offer.org_id)?.name ?? "", headline: offer.headline, body: offer.body, url: offer.url }));
}

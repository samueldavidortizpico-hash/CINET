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
import { collectDataPages, readDataPage } from "./dataPagination.js";

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

/** Lookups públicos en lotes acotados; no crece el filtro in con toda la cartelera. */
async function lookupRows(table, select, ids) {
  const rows = [];
  for (let index = 0; index < ids.length; index += 50) {
    const { data, error } = await supabase.from(table).select(select).in("id", ids.slice(index, index + 50));
    if (error) throw unavailable();
    rows.push(...(data ?? []));
  }
  return rows;
}
async function lookups(rows) {
  const venueIds = [...new Set(rows.map((row) => row.venue_id).filter(Boolean))];
  const orgIds = [...new Set(rows.map((row) => row.org_id))];
  const [venues, orgs] = await Promise.all([
    lookupRows("venues", "id, name, city", venueIds),
    lookupRows("organizations", "id, name", orgIds),
  ]);
  return { venues: new Map(venues.map((venue) => [venue.id, venue])), orgs: new Map(orgs.map((org) => [org.id, org])) };
}

/** Página pública: RLS decide vigencia y organización; transferencia created_at/id. */
export async function titleDataPage(kind, titleId, { cursor = null } = {}) {
  const name = { listings: "list_title_listings_page", offers: "list_title_offers_page" }[kind];
  if (!name || typeof titleId !== "string" || !titleId.length || titleId.length > 64) throw Object.assign(new Error("Título no válido."), { code: "CN422" });
  if (!supabase) return { items: [], nextCursor: null };
  try { return await readDataPage(supabase, name, { p_title: titleId }, { cursor }); }
  catch { throw unavailable(); }
}

/** Funciones vigentes de un título → { items, skipped }. Lanza si la consulta falla. */
export async function getListingsForTitle(titleId, now = new Date()) {
  if (!supabase) return { items: [], skipped: 0 };
  const data = await collectDataPages((cursor) => titleDataPage("listings", String(titleId), { cursor }));
  data.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id));
  if (!data?.length) return { items: [], skipped: 0 };
  const { venues, orgs } = await lookups(data);
  return toShowtimes(data, venues, orgs, now);
}

/** Ofertas patrocinadas vigentes (aparte de las funciones; no tocan el ranking). Lanza si la consulta falla. */
export async function getOffersForTitle(titleId, now = new Date()) {
  if (!supabase) return [];
  const data = await collectDataPages((cursor) => titleDataPage("offers", String(titleId), { cursor }));
  if (!data?.length) return [];
  const { orgs } = await lookups(data);
  return data
    .filter((offer) => new Date(offer.valid_until) > now && httpsUrl(offer.url) && typeof offer.headline === "string")
    .map((offer) => ({ id: offer.id, orgId: offer.org_id, exhibitor: text(orgs.get(offer.org_id)?.name, 80), headline: text(offer.headline, 80), body: text(offer.body), url: offer.url }));
}

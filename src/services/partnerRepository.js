/* =========================================================
   partnerRepository — panel de aliados (supabase/migrations/20261014120000_partners.sql).
   Cada miembro gestiona solo lo de SU organización (RLS); publicar exige que
   un operador de CINET la haya verificado. Toda escritura queda en org_audit.
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { zonedInstant } from "../utils/calendar.js";

function toError(error) {
  if (typeof error?.code === "string" && error.code.startsWith("CN")) return Object.assign(new Error(error.message), { code: error.code });
  if (error?.code === "42501") return Object.assign(new Error("No tienes permiso: solo una organización verificada publica, y solo lo suyo."), { code: "CN403" });
  if (error?.code === "23514") return Object.assign(new Error("Algún dato no es válido (los enlaces deben empezar por https://)."), { code: "CN422" });
  return Object.assign(new Error("No pudimos conectar con el servidor. Inténtalo de nuevo."), { code: "network" });
}

async function run(query) {
  const { data, error } = await query;
  if (error) throw toError(error);
  return data;
}

const db = () => {
  if (!supabase) throw Object.assign(new Error("Las cuentas no están disponibles ahora mismo."), { code: "network" });
  return supabase;
};

export const partnersAvailable = () => Boolean(supabase);

/** Organizaciones de las que soy parte, con mi rol. */
export async function myOrganizations(userId) {
  const memberships = await run(db().from("org_members").select("org_id, role").eq("user_id", userId));
  if (!memberships.length) return [];
  const orgs = await run(db().from("organizations").select("id, name, kind, official_url, status, verified_at, created_at").in("id", memberships.map((item) => item.org_id)));
  return orgs.map((org) => ({ ...org, role: memberships.find((item) => item.org_id === org.id)?.role }));
}

export const requestOrganization = ({ name, kind, officialUrl }) =>
  run(db().rpc("request_organization", { p_name: name, p_kind: kind, p_official_url: officialUrl }));

export const venues = (orgId) => run(db().from("venues").select("id, name, city, official_url").eq("org_id", orgId).order("name"));
export const addVenue = (orgId, { name, city, officialUrl }) =>
  run(db().from("venues").insert({ org_id: orgId, name, city, official_url: officialUrl || null }).select().single());
export const deleteVenue = (id) => run(db().from("venues").delete().eq("id", id).select());

export const listings = (orgId) =>
  run(db().from("listings").select("id, venue_id, kind, title_id, title, starts_at, time_zone, format, language, price_cop, official_url, source, status, valid_until, updated_at").eq("org_id", orgId).order("starts_at", { ascending: true }));

/** Una función o evento: la hora se guarda con su zona; los datos valen hasta que empieza. */
export function addListing(orgId, { venueId, kind, title, dateISO, time, timeZone = "America/Bogota", format, language, price, officialUrl }) {
  const startsAt = zonedInstant(dateISO, time, timeZone).toISOString();
  return run(
    db()
      .from("listings")
      .insert({
        org_id: orgId,
        venue_id: venueId,
        kind,
        title_id: String(title.id),
        title: { title: title.title, year: String(title.year ?? "").slice(0, 4), image: title.image ?? "" },
        starts_at: startsAt,
        time_zone: timeZone,
        valid_until: startsAt,
        format: format || null,
        language: language || null,
        price_cop: price === "" || price == null ? null : Number(price),
        official_url: officialUrl,
      })
      .select()
      .single()
  );
}
export const setListingStatus = (id, status) => run(db().from("listings").update({ status }).eq("id", id).select());
export const deleteListing = (id) => run(db().from("listings").delete().eq("id", id).select());

export const offers = (orgId) => run(db().from("offers").select("id, title_id, headline, body, url, valid_until").eq("org_id", orgId));
export const addOffer = (orgId, { titleId, headline, body, url, validUntil }) =>
  run(db().from("offers").insert({ org_id: orgId, title_id: titleId || null, headline, body: body ?? "", url, valid_until: validUntil }).select().single());
export const deleteOffer = (id) => run(db().from("offers").delete().eq("id", id).select());

export const audit = (orgId) => run(db().from("org_audit").select("id, actor, action, entity, at").eq("org_id", orgId).order("at", { ascending: false }).limit(30));
export const members = (orgId) => run(db().from("org_members").select("user_id, role, added_at").eq("org_id", orgId));
export const addMember = (orgId, email, role = "editor") => run(db().rpc("add_org_member", { p_org: orgId, p_email: email, p_role: role }));
export const removeMember = (orgId, userId) => run(db().rpc("remove_org_member", { p_org: orgId, p_user: userId }));

/* ---------- Operación de CINET ---------- */
export const pendingOrganizations = () =>
  run(db().from("organizations").select("id, name, kind, official_url, status, created_at").eq("status", "pending").order("created_at", { ascending: true }));
export const setOrganizationStatus = (orgId, status) => run(db().rpc("verify_organization", { p_org: orgId, p_status: status }));

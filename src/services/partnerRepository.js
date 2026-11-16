/* =========================================================
   partnerRepository — panel de aliados (supabase/migrations/20261014120000_partners.sql).
   Cada miembro gestiona solo lo de SU organización (RLS); publicar exige que
   un operador de CINET la haya verificado. Toda escritura queda en org_audit.
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { zonedInstant } from "../utils/calendar.js";
import { collectDataPages, readDataPage } from "./dataPagination.js";

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

/** Página acotada por servidor; no se envía límite desde el cliente. */
export async function partnerPage(resource, { orgId = null, cursor = null } = {}) {
  const names = { organizations: "list_my_organizations_page", pending: "list_pending_organizations_page", venues: "list_org_venues_page", listings: "list_org_listings_page", offers: "list_org_offers_page", members: "list_org_members_page", audit: "list_org_audit_page", invitations: "list_my_org_invites_page" };
  if (!names[resource]) throw Object.assign(new Error("Listado no válido."), { code: "CN422" });
  const scoped = ["venues", "listings", "offers", "members", "audit"].includes(resource);
  try { return await readDataPage(db(), names[resource], scoped ? { p_org: orgId } : {}, { cursor, integerId: resource === "audit" }); }
  catch (error) { throw toError(error); }
}
const all = (resource, orgId = null, key) => collectDataPages((cursor) => partnerPage(resource, { orgId, cursor }), key);

/** Solo las organizaciones de la sesión; userId se mantiene por compatibilidad del consumidor. */
export const myOrganizations = () => all("organizations");

export const requestOrganization = ({ name, kind, officialUrl }) =>
  run(db().rpc("request_organization", { p_name: name, p_kind: kind, p_official_url: officialUrl }));

export const venues = async (orgId) => (await all("venues", orgId)).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
export const addVenue = (orgId, { name, city, officialUrl }) =>
  run(db().from("venues").insert({ org_id: orgId, name, city, official_url: officialUrl || null }).select().single());

export const listings = async (orgId) => (await all("listings", orgId)).sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id));

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

export const offers = (orgId) => all("offers", orgId);
export const addOffer = (orgId, { titleId, headline, body, url, validUntil }) =>
  run(db().from("offers").insert({ org_id: orgId, title_id: titleId || null, headline, body: body ?? "", url, valid_until: validUntil }).select().single());

export const audit = (orgId) => all("audit", orgId);
export const members = (orgId) => all("members", orgId, (row) => row.user_id);
/** Invita por correo (N04): nunca revela si hay cuenta; la persona entra solo si acepta. */
export const inviteMember = (orgId, email, role = "editor") => run(db().rpc("invite_org_member", { p_org: orgId, p_email: email, p_role: role }));
export const myOrgInvites = () => all("invitations");
export const acceptOrgInvite = (inviteId) => run(db().rpc("accept_org_invite", { p_invite: inviteId }));
export const declineOrgInvite = (inviteId) => run(db().rpc("decline_org_invite", { p_invite: inviteId }));
export const removeMember = (orgId, userId) => run(db().rpc("remove_org_member", { p_org: orgId, p_user: userId }));

/* ---------- Operación de CINET ---------- */
export const pendingOrganizations = () => all("pending");
export const setOrganizationStatus = (orgId, status) => run(db().rpc("verify_organization", { p_org: orgId, p_status: status }));

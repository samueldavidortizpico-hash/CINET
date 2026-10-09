/* =========================================================
   planRepository — planes compartidos en Supabase.
   Lectura con RLS (solo planes de los que eres miembro) y escritura
   solo por RPC (supabase/migrations/20261009120000_shared_plans.sql).
   Devuelve planes con la misma forma que los locales, más:
   remote, version, status, isOwner, members[], myRsvp, timeSource.
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { describeStart, toStartParts } from "./planService.js";

const SELECT = "id, owner_id, name, message, mode, title_id, title, place, starts_at, time_zone, time_source, details, status, version, created_at, plan_members (user_id, role, display_name, rsvp, responded_at)";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ¿Este id puede ser un plan remoto? (los locales son "cinehub-<timestamp>"). */
export const isRemoteId = (id) => UUID.test(String(id ?? ""));
export const remotePlansAvailable = () => Boolean(supabase);

const MESSAGES = {
  CN403: "No tienes permiso para hacer esto.",
  CN404: "El plan no existe o no tienes acceso.",
  CN409: "Alguien cambió el plan mientras lo editabas. Recarga para ver la versión actual.",
  CN410: "Ya no está disponible.",
  CN422: "Algún dato no es válido.",
  CN429: "Se alcanzó el límite permitido.",
};

/** Error de Supabase → Error con código estable y mensaje para la persona (sin detalles técnicos). */
export function toPlanError(error) {
  const code = typeof error?.code === "string" && error.code.startsWith("CN") ? error.code : "network";
  const message = code === "network" ? "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo." : error.message || MESSAGES[code];
  return Object.assign(new Error(message), { code });
}

function client() {
  if (!supabase) throw Object.assign(new Error("Las cuentas no están disponibles ahora mismo."), { code: "network" });
  return supabase;
}

async function call(name, args) {
  const { data, error } = await client().rpc(name, args);
  if (error) throw toPlanError(error);
  return data;
}

/** Fila de Supabase → plan para la interfaz. */
export function toUiPlan(row, userId) {
  const members = (row.plan_members ?? [])
    .map((member) => ({ userId: member.user_id, name: member.display_name, role: member.role, rsvp: member.rsvp }))
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));
  const rsvp = { yes: [], maybe: [], no: [] };
  members.forEach((member) => member.rsvp && rsvp[member.rsvp].push(member.name));
  const details = row.details ?? {};
  const start = describeStart(row.starts_at, row.time_zone);
  return {
    id: row.id,
    remote: true,
    version: row.version,
    status: row.status,
    isOwner: row.owner_id === userId,
    name: row.name,
    message: row.message,
    mode: row.mode,
    organizer: members.find((member) => member.role === "owner")?.name ?? "",
    movie: { id: row.title_id, title: "", genres: [], ...row.title },
    cinema: { name: "", location: "", ...row.place },
    ...start,
    startsAt: row.starts_at,
    timeZone: row.time_zone,
    timeSource: row.time_source,
    ambience: details.ambience ?? null,
    food: details.food ?? null,
    duration: details.duration ?? null,
    marathon: details.marathon ?? null,
    createdAt: row.created_at,
    members,
    rsvp,
    myRsvp: members.find((member) => member.userId === userId)?.rsvp ?? null,
  };
}

export async function listPlans(userId) {
  const { data, error } = await client().from("plans").select(SELECT).order("created_at", { ascending: true });
  if (error) throw toPlanError(error);
  return data.map((row) => toUiPlan(row, userId));
}

/** null si no existe o no eres miembro (RLS no distingue: así no se filtra si existe). */
export async function getPlan(id, userId) {
  if (!isRemoteId(id)) return null;
  const { data, error } = await client().from("plans").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw toPlanError(error);
  return data && toUiPlan(data, userId);
}

/**
 * Crea el plan a partir de la selección de /functions y del formulario.
 * clientRef hace la petición idempotente: reintentar no duplica (también sirve para importar planes locales).
 */
export async function createPlan({ selection, form, clientRef, displayName }) {
  const { dateISO, time } = toStartParts(selection);
  return call("create_plan", {
    p_client_ref: clientRef,
    p_name: form.name.trim(),
    p_message: (form.message ?? "").trim(),
    p_mode: selection.mode === "home" ? "home" : "cinema",
    p_title_id: String(selection.movie.id).slice(0, 64),
    p_title: {
      title: selection.movie.title,
      year: selection.movie.year ?? "",
      duration: selection.movie.duration ?? "",
      rating: selection.movie.rating ?? null,
      genres: (selection.movie.genres ?? []).slice(0, 3),
      image: selection.movie.image ?? "",
    },
    p_place: { name: selection.cinema?.name ?? "", location: selection.cinema?.location ?? "", ...(selection.cinema?.url && { url: selection.cinema.url }) },
    p_date: dateISO,
    p_time: time,
    p_time_zone: selection.timeZone ?? "America/Bogota",
    p_details: {
      ...(selection.ambience && { ambience: selection.ambience }),
      ...(selection.food && { food: selection.food }),
      ...(selection.duration && { duration: selection.duration }),
      ...(selection.marathon && { marathon: selection.marathon.slice(0, 12) }),
    },
    p_display_name: displayName.trim().slice(0, 40) || "Organizador",
  });
}

export const updatePlan = (plan, { name, message }) =>
  call("update_plan", { p_plan: plan.id, p_version: plan.version, p_name: name.trim(), p_message: (message ?? "").trim() });
export const cancelPlan = (id) => call("cancel_plan", { p_plan: id });
export const deletePlan = (id) => call("delete_plan", { p_plan: id });
export const setRsvp = (id, rsvp) => call("set_plan_rsvp", { p_plan: id, p_rsvp: rsvp });
export const leavePlan = (id) => call("leave_plan", { p_plan: id });
export const removeMember = (id, userId) => call("remove_plan_member", { p_plan: id, p_user: userId });

/** Token en claro (solo existe aquí y en el enlace que se comparte). */
export const createInvite = (id, days = 14) => call("create_plan_invite", { p_plan: id, p_days: days, p_max_uses: null });
export const revokeInvite = (inviteId) => call("revoke_plan_invite", { p_invite: inviteId });

export async function listInvites(planId) {
  const { data, error } = await client()
    .from("plan_invites")
    .select("id, created_at, expires_at, revoked_at, uses")
    .eq("plan_id", planId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw toPlanError(error);
  return data;
}

export async function previewInvite(token) {
  const data = await call("preview_plan_invite", { p_token: token });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw toPlanError({ code: "CN404" });
  return { ...row, ...describeStart(row.starts_at, row.time_zone) };
}

export const acceptInvite = (token, displayName) => call("accept_plan_invite", { p_token: token, p_display_name: displayName.trim().slice(0, 40) });

/**
 * Cambios en vivo del plan (respuestas, ediciones). Postgres Changes respeta RLS.
 * Devuelve la función para cancelar la suscripción (llamarla al salir o cambiar de cuenta).
 */
export function subscribePlan(id, onChange) {
  if (!supabase || !isRemoteId(id)) return () => {};
  const channel = supabase
    .channel(`plan-${id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "plan_members", filter: `plan_id=eq.${id}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "plans", filter: `id=eq.${id}` }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* =========================================================
   groupRepository — grupos guardados (supabase/migrations/20261012120000_groups.sql).
   Lectura con RLS (solo grupos de los que eres miembro); escritura por RPC.
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { listPlansPage, toPlanError } from "./planRepository.js";
import { collectDataPages, readDataPage } from "./dataPagination.js";

const GROUP_SELECT = "id, owner_id, name, created_at, group_members (user_id, role, display_name, joined_at)";

function client() {
  if (!supabase) throw Object.assign(new Error("Las cuentas no están disponibles ahora mismo."), { code: "network" });
  return supabase;
}

async function call(name, args) {
  const { data, error } = await client().rpc(name, args);
  if (error) throw toPlanError(error);
  return data;
}

async function rows(query) {
  const { data, error } = await query;
  if (error) throw toPlanError(error);
  return data;
}

export const groupsAvailable = () => Boolean(supabase);

/** Fila de Supabase → grupo para la interfaz (quien lo creó primero; el resto por nombre). */
export function toGroup(row, userId) {
  const members = (row.group_members ?? [])
    .map((member) => ({ userId: member.user_id, name: member.display_name, role: member.role }))
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.name.localeCompare(b.name, "es")));
  return { id: row.id, name: row.name, isOwner: row.owner_id === userId, members, createdAt: row.created_at };
}

export async function listGroupsPage(userId, { cursor = null } = {}) {
  try {
    const page = await readDataPage(client(), "list_groups_page", {}, { cursor });
    return { ...page, items: page.items.map((row) => toGroup(row, userId)) };
  } catch (error) { throw toPlanError(error); }
}
export const listGroups = (userId) => collectDataPages((cursor) => listGroupsPage(userId, { cursor }));

/** null si no existe o no eres miembro (RLS no distingue). */
export async function getGroup(id, userId) {
  const data = await rows(client().from("groups").select(GROUP_SELECT).eq("id", id).maybeSingle());
  return data && toGroup(data, userId);
}

/** Conserva el orden starts_at asc NULLS LAST de PostgREST; el id desempata. */
export const comparePlanStart = (a, b) => Number(a.startsAt == null) - Number(b.startsAt == null) || (Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id));

/** Planes del grupo en los que estás (entrar al grupo no abre los planes anteriores). */
export async function groupPlans(groupId, userId) {
  const plans = await collectDataPages((cursor) => listPlansPage(userId, { cursor, groupId }));
  return plans.sort(comparePlanStart);
}

export const createGroup = (name, displayName) => call("create_group", { p_name: name.trim(), p_display_name: displayName.trim().slice(0, 40) || "Organizador" });
export const deleteGroup = (id) => call("delete_group", { p_group: id });
export const leaveGroup = (id) => call("leave_group", { p_group: id });
export const removeMember = (id, userId) => call("remove_group_member", { p_group: id, p_user: userId });
export const createInvite = (id, days = 14) => call("create_group_invite", { p_group: id, p_days: days });
export const revokeInvite = (inviteId) => call("revoke_group_invite", { p_invite: inviteId });
export const acceptInvite = (token, displayName) => call("accept_group_invite", { p_token: token, p_display_name: displayName.trim().slice(0, 40) });

/** Enlaces activos (solo los ve quien creó el grupo; el token nunca vuelve del servidor). */
export async function listInvitesPage(groupId, { cursor = null } = {}) {
  try { return await readDataPage(client(), "list_group_invites_page", { p_group: groupId }, { cursor }); }
  catch (error) { throw toPlanError(error); }
}
export const listInvites = (groupId) => collectDataPages((cursor) => listInvitesPage(groupId, { cursor }));

export async function previewInvite(token) {
  const data = await call("preview_group_invite", { p_token: token });
  return data[0] ?? null;
}

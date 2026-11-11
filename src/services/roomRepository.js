/* =========================================================
   roomRepository — salas de Duo en Supabase (votar desde cada teléfono).
   Lectura con RLS: la sala, sus miembros y rondas si eres miembro; de votos
   y gustos, solo los tuyos. Escritura solo por RPC
   (supabase/migrations/20261010120000_duo_rooms.sql).
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { toPlanError } from "./planRepository.js";

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

export const roomsAvailable = () => Boolean(supabase);

/** "abc 234" → "ABC234" (lo mismo que normaliza el servidor). */
export const normalizeCode = (code) => String(code ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export async function createRoom({ displayName, mode = "movie", region = "CO" }) {
  const data = await call("create_duo_room", { p_display_name: displayName, p_mode: mode, p_region: region });
  return data[0]; // { id, code }
}

/** id de la sala si ya eres miembro (RLS: una sala ajena no aparece), o null. */
export async function findMyRoom(code) {
  const data = await rows(client().from("duo_rooms").select("id").eq("code", normalizeCode(code)).maybeSingle());
  return data?.id ?? null;
}

/** Unirse con el código. Un código inexistente no es un error del servidor: devuelve null y cuenta el intento. */
export async function joinRoom(code, displayName) {
  const id = await call("join_duo_room", { p_code: code, p_display_name: displayName });
  if (!id) throw Object.assign(new Error("No hay ninguna sala con ese código. Revísalo con quien la abrió."), { code: "CN404" });
  return id;
}

/** Estado completo para pintar la sala: sala, miembros, última ronda, mis votos y mis gustos. */
export async function loadRoom(roomId) {
  const db = client();
  const [room, members, rounds, prefs] = await Promise.all([
    rows(db.from("duo_rooms").select("id, code, host_id, mode, region, status, chosen, expires_at").eq("id", roomId).maybeSingle()),
    rows(db.from("room_members").select("user_id, role, seat, display_name, ready, votes_cast").eq("room_id", roomId).order("seat")),
    rows(db.from("room_rounds").select("id, number, status, candidates, participants, result").eq("room_id", roomId).order("number", { ascending: false }).limit(1)),
    rows(db.from("room_preferences").select("prefs").eq("room_id", roomId).maybeSingle()),
  ]);
  if (!room) return null;
  const round = rounds[0] ?? null;
  const votes = round ? await rows(db.from("round_votes").select("candidate_id, vote").eq("round_id", round.id)) : [];
  return {
    room,
    members,
    round,
    myVotes: Object.fromEntries(votes.map((item) => [item.candidate_id, item.vote])),
    myPrefs: prefs?.prefs ?? null,
  };
}

export const savePreferences = (roomId, prefs) => call("set_room_preferences", { p_room: roomId, p_prefs: prefs });
export const deckPreferences = (roomId) => call("room_deck_preferences", { p_room: roomId });
export const startRound = (roomId, candidates) => call("start_room_round", { p_room: roomId, p_candidates: candidates });
export const castVote = (roundId, candidateId, vote) => call("cast_room_vote", { p_round: roundId, p_candidate: candidateId, p_vote: vote });
export const closeRound = (roundId) => call("close_room_round", { p_round: roundId });
export const chooseTitle = (roomId, candidateId) => call("choose_room_title", { p_room: roomId, p_candidate: candidateId });
export const leaveRoom = (roomId) => call("leave_duo_room", { p_room: roomId });
export const removeMember = (roomId, userId) => call("remove_room_member", { p_room: roomId, p_user: userId });
export const closeRoom = (roomId) => call("close_duo_room", { p_room: roomId });

/**
 * Avisa de cualquier cambio en la sala o sus rondas (los votos y gustos nunca viajan por aquí).
 * El estado se vuelve a leer con loadRoom: Realtime no es la fuente de verdad. Devuelve la función para salir.
 */
export function subscribeRoom(roomId, onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`room-${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "duo_rooms", filter: `id=eq.${roomId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "room_rounds", filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* Gustos privados de la cuenta (supabase/migrations/20261011120000_user_preferences.sql). */

import { supabase } from "./supabaseClient.js";
import { toPlanError } from "./planRepository.js";

export const accountPreferencesAvailable = () => Boolean(supabase);

/** Los gustos de la sesión actual (RLS: nunca los de otra cuenta), o null si no hay. */
export async function getMyPreferences() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("user_preferences").select("prefs, updated_at").maybeSingle();
  if (error) throw toPlanError(error);
  return data ? { ...data.prefs, updatedAt: data.updated_at } : null;
}

export async function saveMyPreferences({ region, providers, genres, rejectedGenres, maxRuntime }) {
  const { data, error } = await supabase.rpc("save_my_preferences", { p_prefs: { region, providers, genres, rejectedGenres, maxRuntime } });
  if (error) throw toPlanError(error);
  return data;
}

export async function deleteMyPreferences() {
  const { error } = await supabase.rpc("delete_my_preferences");
  if (error) throw toPlanError(error);
}

/** Descarga los gustos como JSON (derecho de acceso: es exactamente lo que guarda CINET). */
export function exportPreferences(prefs) {
  const { updatedAt, ...data } = prefs;
  const body = JSON.stringify({ app: "CINET", kind: "gustos", exportedAt: new Date().toISOString(), updatedAt, data }, null, 2);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([body], { type: "application/json" }));
  link.download = "cinet-mis-gustos.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

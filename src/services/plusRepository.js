/* =========================================================
   CINET Plus en sandbox (supabase/migrations/20261015120000_plus_sandbox.sql).
   El estado que se lee aquí solo sirve para mostrarlo: quien decide si una
   función Plus se puede usar es el servidor (has_plus en cada RPC).
   No hay pasarela conectada: activar el sandbox no cobra nada.
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { toPlanError } from "./planRepository.js";

/** Hipótesis de precio en prueba (COP al mes). No es un precio validado ni se cobra. */
export const PLUS_PRICE_COP = 9900;

async function rows(query) {
  const { data, error } = await query;
  if (error) throw toPlanError(error);
  return data ?? [];
}

/** { accounts, sandbox, plus: { status, source, endsAt, active } | null } */
export async function getPlusStatus(userId) {
  if (!supabase) return { accounts: false, sandbox: false, plus: null };
  const [config] = await rows(supabase.from("billing_config").select("sandbox"));
  const [own] = userId ? await rows(supabase.from("entitlements").select("status, source, current_period_end").eq("user_id", userId)) : [];
  const plus = own
    ? { status: own.status, source: own.source, endsAt: own.current_period_end, active: own.status !== "expired" && new Date(own.current_period_end) > new Date() }
    : null;
  return { accounts: true, sandbox: Boolean(config?.sandbox), plus };
}

async function call(name) {
  const { data, error } = await supabase.rpc(name);
  if (error) throw toPlanError(error);
  return data;
}

export const startPlusSandbox = () => call("activate_plus_sandbox");
export const cancelPlusSandbox = () => call("cancel_plus");

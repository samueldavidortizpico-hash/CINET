/* =========================================================
   Webhook de cobros de CINET Plus (servidor). Contrato NORMALIZADO de CINET:
   aún no hay pasarela elegida ni cobros reales. Cuando la haya, su adaptador
   verifica la firma propia del proveedor y traduce sus eventos a este formato.
   - Firma y ventana de 5 min: las mismas del webhook de aliados (checkSignature).
   - Idempotencia y orden: apply_billing_event en la base (id único; eventos viejos se ignoran).
   - Cancelar conserva el acceso hasta period_end; expired lo corta.
   ========================================================= */

import { checkSignature, reply } from "./partnerWebhook.js";

const KINDS = new Set(["activated", "renewed", "canceled", "expired"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF = /^[\w.:-]{1,100}$/;

/** Evento validado → argumentos de apply_billing_event, o un texto de error. */
export function parseBillingEvent(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: "JSON no válido." };
  }
  if (!REF.test(String(data?.id ?? ""))) return { error: "id no válido." };
  if (!KINDS.has(data.type)) return { error: "type debe ser activated, renewed, canceled o expired." };
  if (!UUID.test(String(data.user_id ?? ""))) return { error: "user_id no válido." };
  const occurred = Date.parse(data.occurred_at);
  if (Number.isNaN(occurred)) return { error: "occurred_at no válido." };
  const grants = data.type === "activated" || data.type === "renewed";
  const periodEnd = grants ? Date.parse(data.period_end) : null;
  if (grants && !(periodEnd > occurred)) return { error: "period_end debe ser posterior a occurred_at." };
  if (data.subscription_ref != null && !REF.test(String(data.subscription_ref))) return { error: "subscription_ref no válido." };
  return {
    event: {
      p_event_id: data.id,
      p_kind: data.type,
      p_user: data.user_id,
      p_occurred_at: new Date(occurred).toISOString(),
      p_period_end: grants ? new Date(periodEnd).toISOString() : null,
      p_provider_ref: data.subscription_ref ?? null,
    },
  };
}

/**
 * handle({ headers, body }) → { status, headers, body }.
 * store.apply(provider, event) → "applied" | "duplicate" | "stale".
 */
export function createBillingWebhook({ secret, provider, store, now = () => Date.now() }) {
  return async function handle({ headers = {}, body = "" }) {
    const invalid = checkSignature(secret, headers, body, now());
    if (invalid) return reply(401, { error: invalid });
    const { event, error } = parseBillingEvent(body);
    if (error) return reply(400, { error });
    const result = await store.apply(provider, event);
    return reply(200, { received: true, result });
  };
}

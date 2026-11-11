/* =========================================================
   Webhook de ventas de aliados (servidor). Una venta o comisión SOLO existe
   si el aliado la confirma aquí; un clic a su sitio nunca es una venta.
   - Firma: HMAC-SHA256 de "<timestamp>.<cuerpo>" con el secreto del aliado
     (x-cinet-org, x-cinet-timestamp, x-cinet-signature: sha256=<hex>).
   - Anti-repetición: el timestamp debe estar a menos de 5 minutos.
   - Idempotencia: (org, id del evento) es único; repetir responde 200 sin duplicar.
   - Reembolsos: sale_refunded con refund_of anula la comisión de esa venta.
   ========================================================= */

import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_MS = 5 * 60 * 1000;
const KINDS = new Set(["sale_confirmed", "sale_refunded"]);

export const reply = (status, body) => ({ status, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify(body) });

export const signPayload = (secret, timestamp, body) => `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;

function sameSignature(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Firma y ventana anti-repetición (aliados y cobros comparten formato). null = válida; si no, el motivo. */
export function checkSignature(secret, headers, body, now) {
  const timestamp = Number(headers["x-cinet-timestamp"]);
  const signature = headers["x-cinet-signature"];
  if (!secret || !signature) return "Firma ausente o emisor desconocido.";
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp * 1000) > TOLERANCE_MS) return "Timestamp fuera de la ventana permitida.";
  if (!sameSignature(signature, signPayload(secret, timestamp, body))) return "Firma no válida.";
  return null;
}

/** Cuerpo crudo de una petición de Node (la firma se calcula sobre el texto exacto). */
export const readBody = (req, limit = 32_000) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > limit) reject(new Error("Cuerpo demasiado grande"));
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });

/** Evento validado → fila para attribution_events, o un texto de error. */
export function parseEvent(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: "JSON no válido." };
  }
  const id = String(data?.id ?? "");
  if (!/^[\w.:-]{1,100}$/.test(id)) return { error: "id no válido." };
  if (!KINDS.has(data.type)) return { error: "type debe ser sale_confirmed o sale_refunded." };
  if (!Number.isInteger(data.amount_cop) || data.amount_cop < 0 || data.amount_cop > 100_000_000) return { error: "amount_cop no válido." };
  if (Number.isNaN(Date.parse(data.occurred_at))) return { error: "occurred_at no válido." };
  if (data.type === "sale_refunded" && !/^[\w.:-]{1,100}$/.test(String(data.refund_of ?? ""))) return { error: "Un reembolso necesita refund_of." };
  return {
    event: {
      external_id: id,
      kind: data.type,
      refund_of: data.type === "sale_refunded" ? String(data.refund_of) : null,
      plan_ref: typeof data.plan_ref === "string" ? data.plan_ref.slice(0, 100) : null,
      amount_cop: data.amount_cop,
      occurred_at: new Date(data.occurred_at).toISOString(),
    },
  };
}

/**
 * handle({ headers, body }) → { status, headers, body }.
 * secretFor(orgId) → secreto o null · store.insert(orgId, event) → "inserted" | "duplicate".
 */
export function createPartnerWebhook({ secretFor, store, now = () => Date.now() }) {
  return async function handle({ headers = {}, body = "" }) {
    const org = String(headers["x-cinet-org"] ?? "");
    const secret = /^[0-9a-f-]{36}$/i.test(org) ? secretFor(org) : null;
    const invalid = checkSignature(secret, headers, body, now());
    if (invalid) return reply(401, { error: invalid });
    const { event, error } = parseEvent(body);
    if (error) return reply(400, { error });
    const result = await store.insert(org, event);
    return reply(200, { received: true, duplicate: result === "duplicate" });
  };
}

/** Comisión: ventas confirmadas que no tienen reembolso, por la tasa acordada (decimal). Sin confirmación no hay comisión. */
export function commissionFor(events, rate) {
  const refunded = new Set(events.filter((event) => event.kind === "sale_refunded").map((event) => event.refund_of));
  const sales = events.filter((event) => event.kind === "sale_confirmed" && !refunded.has(event.external_id));
  const gross = sales.reduce((total, event) => total + event.amount_cop, 0);
  return { sales: sales.length, gross, commission: Math.round(gross * rate) };
}

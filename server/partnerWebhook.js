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

/** HMAC de "<timestamp>.<cuerpo>". body puede ser el Buffer crudo (bytes exactos recibidos) o texto UTF-8. */
export const signPayload = (secret, timestamp, body) => `sha256=${createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex")}`;

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

const bodyError = (status, message) => Object.assign(new Error(message), { status });

/**
 * Cuerpo crudo de una petición de Node como Buffer: los BYTES exactos sobre los que se verifica el HMAC (N08).
 * - El límite se cuenta en bytes (no en caracteres UTF-16).
 * - Al superarlo o vencer el plazo deja de guardar datos, quita sus oyentes y descarta lo que siga llegando
 *   (resume): la memoria queda acotada y el manejador puede responder 413/408.
 * - Desconexión del cliente o error del stream: rechaza y limpia.
 */
export function readBody(req, { limit = 32_000, timeoutMs = 5_000 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
      req.off("aborted", onAborted);
      chunks.length = 0;
      if (error) {
        req.resume?.(); // descarta el resto sin acumularlo
        reject(error);
      } else resolve(value);
    };
    const onData = (chunk) => {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      size += buffer.length;
      if (size > limit) return finish(bodyError(413, "Cuerpo demasiado grande."));
      chunks.push(buffer);
    };
    const onEnd = () => finish(null, Buffer.concat(chunks, size));
    const onError = () => finish(bodyError(400, "No se pudo leer el cuerpo."));
    const onAborted = () => finish(bodyError(400, "El emisor cerró la conexión."));
    const timer = setTimeout(() => finish(bodyError(408, "El cuerpo tardó demasiado en llegar.")), timeoutMs);
    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
    req.on("aborted", onAborted);
  });
}

/**
 * Llamada al almacenamiento con plazo (N23). Si vence, el resultado es DESCONOCIDO (pudo confirmarse):
 * se responde 503 reintentable y el reintento lo resuelve la idempotencia por id de evento.
 */
export async function withDeadline(operation, timeoutMs) {
  const signal = AbortSignal.timeout(Math.max(250, timeoutMs));
  try {
    return await operation(signal);
  } catch (error) {
    if (signal.aborted) throw Object.assign(new Error("El almacenamiento no respondió a tiempo."), { status: 503, retryable: true });
    throw error;
  }
}

/** Respuesta de un adaptador ante un fallo, sin detalles internos. */
export function failureReply(error) {
  if (error?.status === 413 || error?.status === 408 || error?.status === 400) return reply(error.status, { error: error.message });
  return { ...reply(503, { error: "No pudimos confirmar el registro. Reintenta: el evento es idempotente." }), headers: { "content-type": "application/json", "cache-control": "no-store", "retry-after": "5" } };
}

/** Una línea de registro sin datos sensibles: canal, resultado, estado y latencia. */
export const logWebhook = (channel, outcome, status, startedAt) =>
  console.info(JSON.stringify({ webhook: channel, outcome, status, ms: Date.now() - startedAt }));

const text = (body) => (Buffer.isBuffer(body) ? body.toString("utf8") : String(body ?? ""));

/** Evento validado → fila para attribution_events, o un texto de error. */
export function parseEvent(raw) {
  let data;
  try {
    data = JSON.parse(text(raw));
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
 * handle({ headers, body }) → { status, headers, body }. body: Buffer crudo (o texto).
 * secretFor(orgId) → secreto o null · store.insert(orgId, event, signal) → "inserted" | "duplicate".
 * storeTimeoutMs acota la espera al almacenamiento; si vence → 503 reintentable (idempotente).
 */
export function createPartnerWebhook({ secretFor, store, now = () => Date.now(), storeTimeoutMs = 4_000 }) {
  return async function handle({ headers = {}, body = "" }) {
    const org = String(headers["x-cinet-org"] ?? "");
    const secret = /^[0-9a-f-]{36}$/i.test(org) ? secretFor(org) : null;
    const invalid = checkSignature(secret, headers, body, now());
    if (invalid) return reply(401, { error: invalid });
    const { event, error } = parseEvent(body);
    if (error) return reply(400, { error });
    try {
      const result = await withDeadline((signal) => store.insert(org, event, signal), storeTimeoutMs);
      return reply(200, { received: true, duplicate: result === "duplicate" });
    } catch (failure) {
      return failureReply(failure);
    }
  };
}

/** Comisión: ventas confirmadas que no tienen reembolso, por la tasa acordada (decimal). Sin confirmación no hay comisión. */
export function commissionFor(events, rate) {
  const refunded = new Set(events.filter((event) => event.kind === "sale_refunded").map((event) => event.refund_of));
  const sales = events.filter((event) => event.kind === "sale_confirmed" && !refunded.has(event.external_id));
  const gross = sales.reduce((total, event) => total + event.amount_cop, 0);
  return { sales: sales.length, gross, commission: Math.round(gross * rate) };
}

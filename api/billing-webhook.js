/* Vercel: POST /api/billing-webhook — eventos de suscripción de CINET Plus (ver server/billingWebhook.js).
   Variables solo de servidor: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BILLING_WEBHOOK_SECRET y
   BILLING_PROVIDER (nombre del emisor; por defecto "sandbox"). Sin ellas responde 503: no se simula nada.
   No hay pasarela real conectada: ningún evento de aquí implica un cobro.
   Plazos (N08/N23): cuerpo ≤ 32 KB en ≤ 5 s; almacenamiento ≤ 4 s. Fallo de plazo → 503 reintentable. */
import { createBillingWebhook } from "../server/billingWebhook.js";
import { failureReply, logWebhook, readBody } from "../server/partnerWebhook.js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.BILLING_WEBHOOK_SECRET;

const store = {
  async apply(provider, event, signal) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/apply_billing_event`, {
      method: "POST",
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
      body: JSON.stringify({ p_provider: provider, ...event }),
      signal,
    });
    if (!response.ok) throw new Error(`Supabase respondió ${response.status}`);
    return response.json();
  },
};

const handle = createBillingWebhook({ secret, provider: process.env.BILLING_PROVIDER || "sandbox", store });

export default async function handler(req, res) {
  const startedAt = Date.now();
  const send = ({ status, headers, body }, outcome) => {
    logWebhook("billing", outcome, status, startedAt);
    res.writeHead(status, headers);
    res.end(body);
  };
  if (req.method !== "POST") return send({ status: 405, headers: { allow: "POST" }, body: "" }, "method");
  if (!supabaseUrl || !serviceKey || !secret) return send({ status: 503, headers: { "content-type": "application/json" }, body: '{"error":"Cobros no configurados."}' }, "unconfigured");
  try {
    const result = await handle({ headers: req.headers, body: await readBody(req) });
    send(result, result.status === 200 ? "ok" : "rejected");
  } catch (error) {
    send(failureReply(error), "failed");
  }
}

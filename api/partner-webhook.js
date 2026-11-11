/* Vercel: POST /api/partner-webhook — ventas confirmadas por aliados (ver server/partnerWebhook.js).
   Variables solo de servidor: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y PARTNER_WEBHOOK_SECRETS
   ({"<id de organización>": "<secreto>"}). Sin ellas responde 503: no se simula nada. */
import { createPartnerWebhook, readBody } from "../server/partnerWebhook.js";

function secrets() {
  try {
    return JSON.parse(process.env.PARTNER_WEBHOOK_SECRETS || "{}");
  } catch {
    return {};
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const store = {
  async insert(org, event) {
    const response = await fetch(`${supabaseUrl}/rest/v1/attribution_events?on_conflict=org_id,external_id`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
        prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({ org_id: org, ...event }),
    });
    if (!response.ok) throw new Error(`Supabase respondió ${response.status}`);
    const rows = await response.json();
    return rows.length ? "inserted" : "duplicate";
  },
};

const handle = createPartnerWebhook({ secretFor: (org) => secrets()[org] ?? null, store });

export default async function handler(req, res) {
  const send = ({ status, headers, body }) => {
    res.writeHead(status, headers);
    res.end(body);
  };
  if (req.method !== "POST") return send({ status: 405, headers: { allow: "POST" }, body: "" });
  if (!supabaseUrl || !serviceKey) return send({ status: 503, headers: { "content-type": "application/json" }, body: '{"error":"Webhook no configurado."}' });
  try {
    send(await handle({ headers: req.headers, body: await readBody(req) }));
  } catch {
    send({ status: 500, headers: { "content-type": "application/json" }, body: '{"error":"No pudimos registrar el evento. Reintenta: es idempotente."}' });
  }
}

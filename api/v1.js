/* Vercel: /api/v1/<ruta> (vercel.json la reescribe a ?path=<ruta>). Ver server/api.js.
   Variables de servidor: SUPABASE_URL (o VITE_SUPABASE_URL), SUPABASE_PUBLISHABLE_KEY (o VITE_SUPABASE_PUBLISHABLE_KEY)
   y UPSTASH_REDIS_REST_URL/TOKEN. Usa solo la clave PUBLICABLE: cada consulta lleva el JWT de quien llama
   y la RLS decide; nunca service_role. Sin Redis falla cerrada (503). */
import { apiNodeHandler, createApi } from "../server/api.js";
import { readBody } from "../server/partnerWebhook.js";
import { clientIp, clientIpOptions, createUpstashRateLimiter } from "../server/tmdbProxy.js";

const env = process.env;
const limiter = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? createUpstashRateLimiter({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN, prefix: "cinet:api", perIpMax: 120, globalMax: 6_000 })
  : null;
const ipOptions = clientIpOptions(env);

export default apiNodeHandler(
  createApi({
    supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    supabaseKey: env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
    limiter,
  }),
  { readBody, clientIp: (req) => clientIp(req, ipOptions) },
);

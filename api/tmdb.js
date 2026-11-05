/* Función serverless de Vercel: /api/tmdb/<ruta> (vercel.json la reescribe a ?path=<ruta>).
   TMDB_READ_TOKEN es una variable de servidor: nunca lleva el prefijo VITE_. */
import { createTmdbProxy, createUpstashRateLimiter, nodeHandler } from "../server/tmdbProxy.js";

const sharedLimiter = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? createUpstashRateLimiter({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : async () => ({ unavailable: true });

export default nodeHandler(createTmdbProxy({ token: process.env.TMDB_READ_TOKEN, sharedLimiter }), {
  trustedProxyHops: Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "0", 10) || 0,
});

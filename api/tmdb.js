/* Función serverless de Vercel: /api/tmdb/<ruta> (vercel.json la reescribe a ?path=<ruta>).
   TMDB_READ_TOKEN es una variable de servidor: nunca lleva el prefijo VITE_.
   Usa la puerta común (createTmdbAccess): la misma cuota Redis que /api/og; sin Redis responde 503. */
import { clientIpOptions, createTmdbAccess, nodeHandler } from "../server/tmdbProxy.js";

export default nodeHandler(createTmdbAccess(process.env), clientIpOptions(process.env));

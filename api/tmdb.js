/* Función serverless de Vercel: /api/tmdb/<ruta> (vercel.json la reescribe a ?path=<ruta>).
   TMDB_READ_TOKEN es una variable de servidor: nunca lleva el prefijo VITE_. */
import { createTmdbProxy, nodeHandler } from "../server/tmdbProxy.js";

export default nodeHandler(createTmdbProxy({ token: process.env.TMDB_READ_TOKEN }));

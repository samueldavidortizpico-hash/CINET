/* Vercel: HTML de la SPA con la vista previa (Open Graph) de /movie, /plan, /invite y /duo/sala. Ver vercel.json. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createOgHandler } from "../server/ogMeta.js";
import { createTmdbProxy } from "../server/tmdbProxy.js";

const origin = process.env.APP_ORIGIN || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

export default createOgHandler({
  origin,
  tmdb: createTmdbProxy({ token: process.env.TMDB_READ_TOKEN }),
  // dist/index.html va con la función (vercel.json → functions.includeFiles).
  readShell: () => readFile(join(process.cwd(), "dist", "index.html"), "utf8"),
});

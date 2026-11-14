/* Vercel: HTML de la SPA con la vista previa (Open Graph) de /movie, /plan, /invite y /duo/sala. Ver vercel.json.
   TMDB pasa por la MISMA puerta que /api/tmdb (createTmdbAccess): cuota Redis compartida entre instancias,
   presupuesto propio de bots de vista previa y, sin Redis, vista genérica sin consultar al proveedor. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createOgHandler } from "../server/ogMeta.js";
import { createTmdbAccess } from "../server/tmdbProxy.js";

const origin = process.env.APP_ORIGIN || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

export default createOgHandler({
  origin,
  tmdb: createTmdbAccess(process.env),
  // dist/index.html va con la función (vercel.json → functions.includeFiles).
  readShell: () => readFile(join(process.cwd(), "dist", "index.html"), "utf8"),
});

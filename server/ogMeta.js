/* =========================================================
   Vista previa al compartir (Open Graph) generada en el servidor.
   - Títulos públicos: nombre, año, sinopsis y póster.
   - Planes, invitaciones y salas: SIEMPRE una vista genérica y noindex:
     ni nombres, ni asistentes, ni fechas, ni tokens en metadatos o en la CDN.
   - Todo valor se escapa antes de entrar al HTML.
   ========================================================= */

import { movies } from "../src/data/movies.js";

const DEFAULT = {
  title: "CINET — Buenas historias. Mejores planes.",
  description: "Elijan qué ver juntos y conviértanlo en un plan: Duo para 1 a 8 personas, salas desde cada teléfono y planes compartidos.",
  image: "/og-cinet.png",
};

const PRIVATE = [
  [/^\/(plan|invite)\/[^/]{1,120}$/, { title: "Te invitaron a un plan en CINET", description: "Abre el enlace para ver el plan y confirmar con tu cuenta." }],
  [/^\/duo\/sala\/[^/]{1,20}$/, { title: "Sala de Duo en CINET", description: "Entra con el código y vota desde tu teléfono qué ver. Nadie ve tu voto hasta el resultado." }],
];

const MAX_DESCRIPTION = 200;
const clip = (text) => {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > MAX_DESCRIPTION ? `${clean.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : clean;
};

export const escapeHtml = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Ficha pública: catálogo local o TMDB (a través del núcleo del proxy, con el token del servidor). */
async function publicTitle(id, tmdb) {
  const local = Object.hasOwn(movies, id) ? movies[id] : null;
  if (local) return { title: `${local.title}${local.year ? ` (${local.year})` : ""}`, description: clip(local.description), image: `/${local.poster}` };
  const match = /^tmdb-(movie|tv)-(\d{1,9})$/.exec(id);
  if (!match || !tmdb) return null;
  const response = await tmdb({ method: "GET", path: `/${match[1]}/${match[2]}`, query: new URLSearchParams({ language: "es-CO" }), ip: "og" });
  if (response.status !== 200) return null;
  const data = JSON.parse(response.body);
  const name = data.title ?? data.name;
  if (!name) return null;
  const year = (data.release_date ?? data.first_air_date ?? "").slice(0, 4);
  return {
    title: `${name}${year ? ` (${year})` : ""}`,
    description: clip(data.overview) || DEFAULT.description,
    image: data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : DEFAULT.image,
  };
}

/** Ruta de la app → metadatos. private = vista genérica que no debe indexarse. */
export async function ogFor(path, { tmdb } = {}) {
  const generic = PRIVATE.find(([pattern]) => pattern.test(path));
  if (generic) return { ...DEFAULT, ...generic[1], private: true };
  const movie = /^\/movie\/([\w-]{1,80})$/.exec(path);
  if (movie) {
    try {
      const found = await publicTitle(movie[1], tmdb);
      if (found) return { ...found, title: `${found.title} · CINET`, type: "video.movie", private: false };
    } catch {
      /* sin datos: vista por defecto */
    }
  }
  return { ...DEFAULT, private: false };
}

/** Inserta título, descripción y etiquetas OG/Twitter en el HTML de la SPA. */
export function injectMeta(html, meta, { origin, path }) {
  const absolute = (url) => (url.startsWith("/") ? `${origin}${url}` : url);
  const tags = [
    ["property", "og:type", meta.type ?? "website"],
    ["property", "og:site_name", "CINET"],
    ["property", "og:title", meta.title],
    ["property", "og:description", meta.description],
    ["property", "og:url", `${origin}${meta.private ? "/" : path}`],
    ["property", "og:image", absolute(meta.image)],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", meta.title],
    ["name", "twitter:description", meta.description],
    ["name", "twitter:image", absolute(meta.image)],
    ...(meta.private ? [["name", "robots", "noindex, nofollow"]] : []),
  ]
    .map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`)
    .join("\n    ");
  // Los reemplazos son FUNCIONES a propósito: con una cadena, String.replace interpreta $&, $' y $`
  // (escapeHtml no toca el "$") y una sinopsis de TMDB —editable por la comunidad— copiaría trozos del documento.
  return html
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, () => `<meta name="description" content="${escapeHtml(meta.description)}" />`)
    .replace("</head>", () => `    ${tags}\n  </head>`);
}

/**
 * Manejador HTTP (Vercel/Node). La ruta llega por ?path= (reescritura de vercel.json). El origen viene de la
 * configuración (APP_ORIGIN o VERCEL_URL), nunca de la cabecera Host.
 */
export function createOgHandler({ readShell, tmdb, origin }) {
  let shell;
  return async function handler(req, res) {
    const url = new URL(req.url, "http://localhost");
    const path = (url.searchParams.get("path") ?? "/").slice(0, 200);
    try {
      shell ??= await readShell();
    } catch {
      res.writeHead(503, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end("CINET no está disponible en este momento.");
      return;
    }
    const meta = await ogFor(path, { tmdb });
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": meta.private ? "public, max-age=0, s-maxage=300" : "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "x-robots-tag": meta.private ? "noindex, nofollow" : "all",
    });
    res.end(injectMeta(shell, meta, { origin, path }));
  };
}

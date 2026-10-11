/* Respaldo reproducible del catálogo descubierto en TMDB (no forma parte de `npm test`).
   Uso: npm run catalog:snapshot   (lee TMDB_READ_TOKEN de .env; no lo imprime)
   Escribe snapshots/catalog-AAAA-MM-DD.json (ignorado por git).

   Qué es: una copia fechada de metadatos (títulos, año, géneros, ids y rutas de póster) para
   recuperar las filas del inicio si TMDB no responde, o para comparar cambios.
   Qué NO es: cartelera, clasificación por edades ni disponibilidad en plataformas. No se incluyen
   próximos estrenos ni proveedores, para que nadie lo lea como «lo que hay hoy».
   Límites: pocas peticiones, en serie y con pausa. El uso comercial de TMDB requiere licencia
   (ver docs/COSTOS-Y-MERCADO.md); revisa sus términos antes de publicar o redistribuir este archivo. */
import { mkdirSync, writeFileSync } from "node:fs";
import { getCollection } from "../src/services/movieService.js";
import { isTmdbEnabled } from "../src/services/tmdbClient.js";

const COLLECTIONS = ["trending", "top-rated", "colombia", "popular-tv"];
const LIMIT = 20;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!isTmdbEnabled()) {
  console.error("Falta TMDB_READ_TOKEN en .env: no se genera un respaldo vacío ni con el catálogo local.");
  process.exit(1);
}

const collections = {};
for (const name of COLLECTIONS) {
  const { source, titles } = await getCollection(name, LIMIT);
  // getCollection cae al catálogo local si TMDB falla: eso no es un respaldo de TMDB.
  if (source !== "tmdb") {
    console.error(`«${name}» no llegó de TMDB (fuente: ${source}). Respaldo cancelado.`);
    process.exit(1);
  }
  collections[name] = titles.map(({ id, tmdbId, type, title, year, genreKeys, poster }) => ({ id, tmdbId, type, title, year, genreKeys, poster }));
  console.log(`${name}: ${titles.length} títulos`);
  await pause(500);
}

const generatedAt = new Date().toISOString();
const snapshot = {
  generatedAt,
  source: "TMDB",
  attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
  notice: "Respaldo de metadatos fechado. No es cartelera, clasificación ni disponibilidad actual.",
  collections,
};
mkdirSync("snapshots", { recursive: true });
const file = `snapshots/catalog-${generatedAt.slice(0, 10)}.json`;
writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Listo: ${file}`);

/* =========================================================
   Importar lo que ya viste desde un CSV de Letterboxd o IMDb.
   - El archivo se lee en el navegador; no se sube. Solo se consultan
     título y año (o el id de IMDb) para encontrar cada película.
   - Nada de scraping ni contraseñas de otros servicios: solo el CSV
     que la persona exporta y elige.
   - Importar dos veces no duplica; no se borra ni se sobrescribe nada.
   ========================================================= */

import { addToHistory, asHistory } from "./historyService.js";

export const CSV_LIMITS = { maxBytes: 2_000_000, maxRows: 5000, batch: 300 };

export class CsvError extends Error {}

/** RFC 4180: comillas, comillas dobles escapadas, saltos de línea dentro de comillas, CRLF y BOM. */
export function parseCsv(text) {
  const BOM = String.fromCharCode(0xfeff); // marca que Excel añade al guardar en UTF-8
  const source = String(text).startsWith(BOM) ? String(text).slice(1) : String(text);
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (quoted) throw new CsvError("El archivo tiene comillas sin cerrar.");
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

const FORMATS = {
  letterboxd: (header) => header.includes("Name") && header.includes("Year"),
  imdb: (header) => header.includes("Const") && header.includes("Title"),
};

/** Normaliza un título para comparar: sin tildes, mayúsculas ni signos. */
export const normalizeTitle = (title) =>
  String(title ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

const yearOf = (value) => {
  const year = Number(String(value ?? "").slice(0, 4));
  return year >= 1870 && year <= 2100 ? year : null;
};

function toEntry(record, format) {
  if (format === "letterboxd") {
    const stars = Number(record.Rating);
    return { title: record.Name?.trim(), year: yearOf(record.Year), imdbId: null, type: "movie", rating: stars > 0 ? Math.round(stars * 2) : null };
  }
  const type = /series|mini/i.test(record["Title Type"] ?? "") ? "tv" : "movie";
  const rating = Number(record["Your Rating"]);
  return {
    title: (record.Title ?? record["Original Title"])?.trim(),
    year: yearOf(record.Year ?? record["Release Date"]),
    imdbId: /^tt\d{7,10}$/.test(record.Const ?? "") ? record.Const : null,
    type,
    rating: rating > 0 ? rating : null,
  };
}

/** Texto del CSV → { format, entries } validado (tamaño, filas, formato) y sin repetidos. */
export function readCsv(text, limits = CSV_LIMITS) {
  if (new TextEncoder().encode(text).length > limits.maxBytes) throw new CsvError("El archivo pesa más de 2 MB.");
  const [header = [], ...rows] = parseCsv(text);
  const columns = header.map((cell) => cell.trim());
  const format = Object.keys(FORMATS).find((key) => FORMATS[key](columns));
  if (!format) throw new CsvError("No reconocemos el formato. Usa watched.csv o ratings.csv de Letterboxd, o ratings.csv de IMDb.");
  if (rows.length > limits.maxRows) throw new CsvError(`El archivo tiene más de ${limits.maxRows} filas.`);
  const seen = new Set();
  const entries = [];
  for (const cells of rows) {
    const entry = toEntry(Object.fromEntries(columns.map((name, index) => [name, cells[index] ?? ""])), format);
    if (!entry.title) continue;
    const key = entry.imdbId ?? `${normalizeTitle(entry.title)}|${entry.year ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }
  return { format, entries };
}

/**
 * Busca cada entrada en el catálogo. matched = una sola coincidencia exacta (id de IMDb, o título y año);
 * ambiguous = varias posibles (la persona elige); missing = ninguna. Nunca se adivina en silencio.
 */
export async function matchEntries(entries, { findByImdb, searchTitle, concurrency = 4, onProgress = () => {} }) {
  const results = new Array(entries.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < entries.length) {
      const index = next++;
      const entry = entries[index];
      try {
        const byId = entry.imdbId && findByImdb ? await findByImdb(entry.imdbId) : [];
        if (byId.length === 1) {
          results[index] = { entry, status: "matched", match: byId[0], options: byId };
        } else {
          const options = (await searchTitle(entry.title, entry.year, entry.type)).slice(0, 8);
          const exact = options.filter(
            (title) => normalizeTitle(title.title) === normalizeTitle(entry.title) && (!entry.year || yearOf(title.year) === entry.year)
          );
          results[index] =
            exact.length === 1
              ? { entry, status: "matched", match: exact[0], options: exact }
              : options.length
                ? { entry, status: "ambiguous", match: null, options: (exact.length ? exact : options).slice(0, 4) }
                : { entry, status: "missing", match: null, options: [] };
        }
      } catch {
        results[index] = { entry, status: "missing", match: null, options: [], failed: true };
      }
      onProgress(++done, entries.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
  return results;
}

/** Añade a «Ya vistas» lo emparejado y lo elegido en los dudosos. Repetir no duplica ni borra nada. */
export function applyImport(history, results, choices = {}) {
  const current = asHistory(history);
  const titles = results
    .map((result, index) => (result.status === "matched" ? result.match : result.options.find((option) => option.id === choices[index])))
    .filter(Boolean);
  const unique = [...new Map(titles.map((title) => [title.id, title])).values()];
  const already = unique.filter((title) => current.seen.includes(title.id)).length;
  return { history: addToHistory(current, "seen", unique), added: unique.length - already, already };
}

/** Buscadores reales: TMDB (vía el proxy) si está disponible; si no, el catálogo local de CINET. */
export async function catalogMatchers() {
  const [{ isTmdbEnabled, searchTitles, tmdbRequest }, { fromTmdb, getMovies }] = await Promise.all([import("./tmdbClient.js"), import("./movieService.js")]);
  const movies = await getMovies();
  const local = async (title) =>
    movies.filter((movie) => normalizeTitle(movie.title) === normalizeTitle(title) || normalizeTitle(movie.originalTitle) === normalizeTitle(title));
  if (!isTmdbEnabled()) return { findByImdb: null, searchTitle: local };
  // Si el servidor no tiene catálogo en vivo (no-token), se usa el local, como en el resto de CINET.
  const orLocal = (fallback) => (error) => {
    if (error.code === "no-token") return fallback();
    throw error;
  };
  return {
    findByImdb: (imdbId) =>
      tmdbRequest(`/find/${imdbId}`, { external_source: "imdb_id" }).then(
        (data) => [...(data.movie_results ?? []).map((raw) => fromTmdb(raw, "movie")), ...(data.tv_results ?? []).map((raw) => fromTmdb(raw, "tv"))],
        orLocal(() => [])
      ),
    searchTitle: (title, year, type = "movie") => {
      const params = year ? { [type === "tv" ? "first_air_date_year" : "year"]: year } : {};
      return searchTitles(type, title, params).then((page) => page.results.map((raw) => fromTmdb(raw, type)), orLocal(() => local(title)));
    },
  };
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { applyImport, CsvError, matchEntries, parseCsv, readCsv } from "./csvImport.js";

test("el parser respeta comillas, comillas dobles, saltos de línea internos, CRLF y BOM", () => {
  const text = String.fromCharCode(0xfeff) + 'Name,Year,Note\r\n"Crimes, Lies",1989,"Dijo ""wow""\nen dos líneas"\r\nUp,2009,\r\n\r\n';
  assert.deepEqual(parseCsv(text), [
    ["Name", "Year", "Note"],
    ["Crimes, Lies", "1989", 'Dijo "wow"\nen dos líneas'],
    ["Up", "2009", ""],
  ]);
  assert.throws(() => parseCsv('Name\n"sin cerrar'), CsvError);
});

test("Letterboxd e IMDb: formato, estrellas a 10, ids de IMDb y sin repetidos", () => {
  const letterboxd = readCsv("Date,Name,Year,Letterboxd URI,Rating\n2024-01-01,Up,2009,https://boxd.it/x,4.5\n2024-02-01,Up,2009,https://boxd.it/x,4\n2024-03-01,Dune,2021,https://boxd.it/y,");
  assert.equal(letterboxd.format, "letterboxd");
  assert.deepEqual(letterboxd.entries, [
    { title: "Up", year: 2009, imdbId: null, type: "movie", rating: 9 },
    { title: "Dune", year: 2021, imdbId: null, type: "movie", rating: null },
  ]);
  const imdb = readCsv('Const,Your Rating,Date Rated,Title,Title Type,Year\ntt0816692,10,2024-01-01,Interstellar,Movie,2014\ntt0903747,9,2024-01-02,"Breaking Bad",TV Series,2008\nbad,5,2024,Raro,Movie,1990');
  assert.equal(imdb.format, "imdb");
  assert.deepEqual(imdb.entries.map((entry) => [entry.imdbId, entry.type, entry.rating]), [["tt0816692", "movie", 10], ["tt0903747", "tv", 9], [null, "movie", 5]]);
});

test("límites y formatos desconocidos", () => {
  assert.throws(() => readCsv("a,b\n1,2"), /No reconocemos el formato/);
  assert.throws(() => readCsv("Name,Year\nUp,2009\nDune,2021", { maxBytes: 1e6, maxRows: 1 }), /más de 1 filas/);
  assert.throws(() => readCsv("x".repeat(20), { maxBytes: 10, maxRows: 10 }), /2 MB/);
});

test("emparejar: id de IMDb, título y año exactos, dudosos y no encontrados; nunca se adivina", async () => {
  const catalog = [
    { id: "up", title: "Up", year: "2009" },
    { id: "dune-1984", title: "Dune", year: "1984" },
    { id: "dune-2021", title: "Dune", year: "2021" },
    { id: "nosferatu-1922", title: "Nosferatu", year: "1922" },
    { id: "nosferatu-2024", title: "Nosferatu", year: "2024" },
  ];
  const results = await matchEntries(
    [
      { title: "Interstellar", year: 2014, imdbId: "tt0816692" },
      { title: "Dune", year: 2021 },
      { title: "Nosferatu", year: null },
      { title: "Película que no existe", year: 2001 },
      { title: "Úp", year: 2009 },
    ],
    {
      findByImdb: async (id) => (id === "tt0816692" ? [{ id: "interstellar", title: "Interstellar", year: "2014" }] : []),
      searchTitle: async (title) => catalog.filter((item) => item.title.toLowerCase() === title.toLowerCase().replace("ú", "u")),
    }
  );
  assert.deepEqual(results.map((result) => [result.status, result.match?.id ?? null]), [
    ["matched", "interstellar"],
    ["matched", "dune-2021"],
    ["ambiguous", null],
    ["missing", null],
    ["matched", "up"],
  ]);
  assert.deepEqual(results[2].options.map((option) => option.id), ["nosferatu-1922", "nosferatu-2024"]);

  const first = applyImport(undefined, results, { 2: "nosferatu-2024" });
  assert.deepEqual([first.added, first.already], [4, 0]);
  assert.deepEqual(first.history.seen.sort(), ["dune-2021", "interstellar", "nosferatu-2024", "up"]);
  const again = applyImport(first.history, results, { 2: "nosferatu-2024" });
  assert.deepEqual([again.added, again.already, again.history.seen.length], [0, 4, 4], "importar dos veces no duplica");
});

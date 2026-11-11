/* Open Graph: títulos públicos con datos, planes/invitaciones/salas genéricos, escapado y sin origen del Host. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createOgHandler, injectMeta, ogFor } from "./ogMeta.js";

const SHELL = '<!doctype html><html><head>\n<meta name="description" content="CINET" />\n<title>CINET</title>\n</head><body><div id="root"></div></body></html>';

function fakeTmdb(body, status = 200) {
  const calls = [];
  const tmdb = async (request) => {
    calls.push(request.path);
    return { status, body: JSON.stringify(body) };
  };
  return { tmdb, calls };
}

test("título público: catálogo local y TMDB (con escapado)", async () => {
  const local = await ogFor("/movie/interstellar");
  assert.match(local.title, /^Interstellar \(2014\) · CINET$/);
  assert.equal(local.image, "/images/interstellar.jpg");
  const { tmdb, calls } = fakeTmdb({ title: 'Lo "malo" <script>', release_date: "2024-05-01", overview: "x".repeat(400), poster_path: "/p.jpg" });
  const remote = await ogFor("/movie/tmdb-movie-123", { tmdb });
  assert.deepEqual(calls, ["/movie/123"]);
  assert.equal(remote.image, "https://image.tmdb.org/t/p/w780/p.jpg");
  assert.ok(remote.description.length <= 200);
  const html = injectMeta(SHELL, remote, { origin: "https://cinet.app", path: "/movie/tmdb-movie-123" });
  assert.ok(!html.includes("<script>"), "nada sin escapar");
  assert.match(html, /<title>Lo &quot;malo&quot; &lt;script&gt; \(2024\) · CINET<\/title>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/cinet.app\/movie\/tmdb-movie-123" \/>/);
  assert.equal((await ogFor("/movie/constructor")).title, "CINET — Buenas historias. Mejores planes.", "sin claves del prototipo");
});

test("planes, invitaciones y salas: vista genérica, noindex y sin consultar datos", async () => {
  const { tmdb, calls } = fakeTmdb({});
  for (const path of ["/plan/2b1c0d2e-0000-4000-8000-000000000000", "/invite/token-secreto-abc", "/duo/sala/ABC234"]) {
    const meta = await ogFor(path, { tmdb });
    assert.equal(meta.private, true, path);
    const html = injectMeta(SHELL, meta, { origin: "https://cinet.app", path });
    assert.ok(!html.includes("token-secreto") && !html.includes("2b1c0d2e") && !html.includes("ABC234"), "ni tokens, ni ids, ni códigos");
    assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
    assert.match(html, /og:url" content="https:\/\/cinet.app\/"/);
  }
  assert.deepEqual(calls, []);
});

test("el manejador usa el origen configurado, no la cabecera Host, y cachea según privacidad", async () => {
  const handler = createOgHandler({ readShell: async () => SHELL, origin: "https://cinet.app" });
  const respond = async (url) => {
    const out = {};
    await handler({ url, headers: { host: "evil.example" } }, { writeHead: (status, headers) => Object.assign(out, { status, headers }), end: (body) => (out.body = body) });
    return out;
  };
  const movie = await respond("/api/og?path=/movie/interstellar");
  assert.equal(movie.status, 200);
  assert.ok(!movie.body.includes("evil.example"));
  assert.match(movie.headers["cache-control"], /s-maxage=3600/);
  const plan = await respond("/api/og?path=/plan/abc");
  assert.equal(plan.headers["x-robots-tag"], "noindex, nofollow");
  const broken = createOgHandler({ readShell: async () => { throw new Error("sin build"); }, origin: "" });
  const out = {};
  await broken({ url: "/api/og?path=/" }, { writeHead: (status) => (out.status = status), end: () => {} });
  assert.equal(out.status, 503);
});

test("los patrones especiales de String.replace ($&, $', $`) en una sinopsis no alteran el HTML", () => {
  const html = injectMeta(SHELL, { title: "Peli $& $` $'", description: "Cuesta $' y $& pesos", image: "/p.jpg", private: false }, { origin: "https://cinet.app", path: "/movie/1" });
  assert.ok(html.includes("Cuesta $&#39; y $&amp; pesos"), "el texto entra literal, con su escapado");
  assert.equal((html.match(/<\/head>/g) ?? []).length, 1, "un solo cierre de head: nada del documento se copia dentro de los atributos");
  assert.equal((html.match(/<title>/g) ?? []).length, 1);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = async (path) => readFile(new URL(path, import.meta.url), "utf8");
const headersOf = async () => {
  const config = JSON.parse(await read("../vercel.json"));
  return new Map(config.headers.find((entry) => entry.source === "/(.*)").headers.map(({ key, value }) => [key.toLowerCase(), value]));
};

test("H-08: HSTS sin includeSubDomains/preload hasta verificar todos los subdominios", async () => {
  const hsts = (await headersOf()).get("strict-transport-security");
  assert.match(hsts, /^max-age=(\d+)$/);
  assert.ok(Number(/\d+/.exec(hsts)[0]) >= 31536000, "al menos un año");
});

/** Rewrite de Vercel "/:route(a|b/[^/]+)" → RegExp equivalente (solo la sintaxis que usa vercel.json). */
const toRegExp = (source) => new RegExp(`^${source.replace(/:\w+\*/g, ".*").replace(/:\w+\(/g, "(").replace(/:\w+/g, "[^/]+")}$`);

test("H-08: el fallback SPA cubre cada ruta del router y una ruta desconocida recibe HTTP 404", async () => {
  const config = JSON.parse(await read("../vercel.json"));
  const patterns = config.rewrites.map(({ source }) => toRegExp(source));
  const served = (path) => path === "/" || patterns.some((pattern) => pattern.test(path)); // "/" es index.html del filesystem
  const router = await read("../src/app/router.jsx");
  const paths = [...router.matchAll(/path: "([^"]+)"/g)].map((match) => match[1]).filter((path) => path !== "*");
  assert.ok(paths.length > 20);
  for (const path of paths) {
    const concrete = `/${path.replace(/^\//, "").replace(/:\w+/g, "abc123")}`;
    assert.ok(served(concrete), `${concrete} no tiene rewrite en vercel.json: Vercel respondería 404`);
  }
  for (const unknown of ["/ruta-inexistente", "/home/extra", "/admin/x/y", "/.env", "/wp-login.php"]) {
    assert.ok(!served(unknown), `${unknown} debe caer en 404.html (HTTP 404), no en index.html`);
  }
});

test("API07: Vercel declara cabeceras defensivas globales", async () => {
  const headers = await headersOf();
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.match(headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(headers.get("permissions-policy"), /camera=\(\)/);
});

test("N18: la CSP cubre los recursos reales, sin comodines generales ni unsafe-inline en scripts", async () => {
  const csp = (await headersOf()).get("content-security-policy");
  const directive = (name) => csp.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name} `)) ?? "";
  assert.match(directive("default-src"), /^default-src 'self'$/);
  assert.doesNotMatch(directive("script-src"), /unsafe-inline|unsafe-eval|\*/);
  assert.match(directive("connect-src"), /https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co/);
  assert.match(directive("img-src"), /https:\/\/image\.tmdb\.org/);
  assert.match(directive("font-src"), /https:\/\/fonts\.gstatic\.com/);
  assert.match(directive("style-src"), /https:\/\/fonts\.googleapis\.com/);
  assert.equal(directive("frame-src"), "frame-src https://www.youtube.com https://challenges.cloudflare.com");
  assert.match(directive("script-src"), / https:\/\/challenges\.cloudflare\.com$/, "Turnstile (CAPTCHA) es el único script externo");
  assert.match(csp, /object-src 'none'/);
  for (const name of ["default-src", "script-src", "style-src", "font-src", "img-src", "connect-src", "frame-src"]) assert.ok(!/\s\*(\s|$)/.test(directive(name)), `${name} sin comodín general`);
});

test("N18: el hash del script de tema en línea coincide con index.html (si cambia, la CSP lo bloquearía)", async () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(await read("../index.html"))[1];
  const hash = `'sha256-${createHash("sha256").update(script).digest("base64")}'`;
  assert.ok((await headersOf()).get("content-security-policy").includes(hash), `falta ${hash} en script-src`);
  assert.equal((await read("../index.html")).match(/<script(?![^>]*\bsrc=)[^>]*>/g).length, 1, "solo un script en línea");
});

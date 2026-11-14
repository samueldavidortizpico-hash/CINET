import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = async (path) => readFile(new URL(path, import.meta.url), "utf8");
const config = JSON.parse(await read("../vercel.json"));
const globalHeaders = new Map(config.headers.find((entry) => entry.source === "/(.*)").headers.map(({ key, value }) => [key.toLowerCase(), value]));

/** "default-src 'self'; img-src a b" → Map { default-src → ["'self'"], img-src → ["a","b"] } */
const directives = (policy) =>
  new Map(policy.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, ...values] = part.split(/\s+/);
    return [name, values];
  }));

// Único script externo permitido: Cloudflare Turnstile (CAPTCHA de Auth, auditoría H-04).
const TURNSTILE = "https://challenges.cloudflare.com";

test("API07: Vercel declara cabeceras defensivas globales", () => {
  assert.equal(globalHeaders.get("x-content-type-options"), "nosniff");
  assert.equal(globalHeaders.get("x-frame-options"), "DENY");
  assert.equal(globalHeaders.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(globalHeaders.get("permissions-policy"), /camera=\(\)/);
});

test("HSTS: el navegador no vuelve a abrir el sitio por http (sin includeSubDomains/preload hasta verificar subdominios)", () => {
  const values = config.headers.find((entry) => entry.source === "/(.*)").headers.filter(({ key }) => key.toLowerCase() === "strict-transport-security");
  assert.equal(values.length, 1, "una sola cabecera HSTS");
  const hsts = values[0].value;
  assert.match(hsts, /^max-age=\d{8,}$/, "al menos un año");
  assert.ok(Number(/max-age=(\d+)/.exec(hsts)[1]) >= 31_536_000);
});

test("CSP (modo informe): cierra lo peligroso y solo permite los orígenes que la app usa", () => {
  const policy = globalHeaders.get("content-security-policy-report-only");
  assert.ok(policy, "falta Content-Security-Policy-Report-Only (pásala a Content-Security-Policy cuando no haya violaciones)");
  const d = directives(policy);
  assert.deepEqual(d.get("default-src"), ["'self'"]);
  assert.deepEqual(d.get("object-src"), ["'none'"], "sin plugins");
  assert.deepEqual(d.get("base-uri"), ["'self'"], "nadie reescribe las URL relativas con <base>");
  assert.deepEqual(d.get("form-action"), ["'self'"]);
  assert.deepEqual(d.get("frame-ancestors"), ["'none'"], "no se puede incrustar CINET (equivale a X-Frame-Options)");
  const scripts = d.get("script-src");
  assert.ok(!scripts.includes("'unsafe-eval'"), "nada de eval");
  assert.ok(!scripts.includes("'unsafe-inline'"), "los scripts inline se permiten solo por hash");
  assert.ok(!scripts.some((value) => value === "*" || value === "https:" || (value.startsWith("http") && value !== TURNSTILE)), "scripts solo propios (y Turnstile)");
  for (const [name, values] of d) assert.ok(!values.includes("*"), `${name} no puede ser un comodín`);
});

test("CSP efectiva: cubre los recursos reales, sin comodines ni unsafe-inline en scripts", () => {
  const d = directives(globalHeaders.get("content-security-policy"));
  assert.deepEqual(d.get("default-src"), ["'self'"]);
  const scripts = d.get("script-src");
  assert.ok(!scripts.some((value) => /unsafe-inline|unsafe-eval|^\*$/.test(value)));
  assert.ok(!scripts.some((value) => value.startsWith("http") && value !== TURNSTILE), "Turnstile es el único script externo");
  assert.deepEqual(d.get("frame-src"), ["https://www.youtube.com", TURNSTILE]);
  assert.ok(d.get("connect-src").includes("https://*.supabase.co") && d.get("connect-src").includes("wss://*.supabase.co"));
  assert.ok(d.get("img-src").includes("https://image.tmdb.org"));
  assert.deepEqual(d.get("object-src"), ["'none'"]);
  assert.deepEqual(d.get("frame-ancestors"), ["'none'"]);
  for (const [name, values] of d) assert.ok(!values.includes("*"), `${name} sin comodín general`);
});

test("CSP: el script inline de index.html (tema antes del primer pintado) está permitido por su hash exacto en ambas políticas", async () => {
  const html = await read("../index.html");
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(inline.length, 1, "si añades otro script inline, súmale su hash a la CSP (o muévelo a un archivo)");
  // El navegador normaliza CRLF/CR a LF antes de calcular el hash (checkout de Windows vs. Linux/Vercel).
  const text = inline[0][1].replace(/\r\n?/g, "\n");
  const hash = `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
  for (const name of ["content-security-policy", "content-security-policy-report-only"]) {
    assert.ok(directives(globalHeaders.get(name)).get("script-src").includes(hash), `el hash de index.html cambió: usa ${hash} en script-src (${name})`);
  }
});

/** Rewrite de Vercel "/:route(a|b/[^/]+)" → RegExp equivalente (solo la sintaxis que usa vercel.json). */
const toRegExp = (source) => new RegExp(`^${source.replace(/:\w+\*/g, ".*").replace(/:\w+\(/g, "(").replace(/:\w+/g, "[^/]+")}$`);

test("H-08: el fallback SPA cubre cada ruta del router y una ruta desconocida recibe HTTP 404", async () => {
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

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const globalHeaders = new Map(config.headers.find((entry) => entry.source === "/(.*)").headers.map(({ key, value }) => [key.toLowerCase(), value]));

/** "default-src 'self'; img-src a b" → Map { default-src → ["'self'"], img-src → ["a","b"] } */
const directives = (policy) =>
  new Map(policy.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, ...values] = part.split(/\s+/);
    return [name, values];
  }));

test("API07: Vercel declara cabeceras defensivas globales", () => {
  assert.equal(globalHeaders.get("x-content-type-options"), "nosniff");
  assert.equal(globalHeaders.get("x-frame-options"), "DENY");
  assert.equal(globalHeaders.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(globalHeaders.get("permissions-policy"), /camera=\(\)/);
});

test("HSTS: el navegador no vuelve a abrir el sitio por http", () => {
  const hsts = globalHeaders.get("strict-transport-security");
  assert.match(hsts, /max-age=\d{8,}/, "al menos un año");
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
  assert.ok(!scripts.some((value) => value === "*" || value === "https:" || value.startsWith("http")), "scripts solo propios");
  for (const [name, values] of d) assert.ok(!values.includes("*"), `${name} no puede ser un comodín`);
});

test("CSP: el script inline de index.html (tema antes del primer pintado) está permitido por su hash exacto", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(inline.length, 1, "si añades otro script inline, súmale su hash a la CSP (o muévelo a un archivo)");
  // El navegador normaliza CRLF/CR a LF antes de calcular el hash (checkout de Windows vs. Linux/Vercel).
  const text = inline[0][1].replace(/\r\n?/g, "\n");
  const hash = `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
  const scripts = directives(globalHeaders.get("content-security-policy-report-only")).get("script-src");
  assert.ok(scripts.includes(hash), `el hash de index.html cambió: usa ${hash} en script-src de vercel.json`);
});

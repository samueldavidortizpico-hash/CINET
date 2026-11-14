/* N20 / N21 / N19: contrato de distribución (Android local), CI y dependencias. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("N20: la APK de distribución usa archivos locales: sin server.url ni cleartext en la configuración", async () => {
  const config = JSON.parse(await read("../capacitor.config.json"));
  assert.equal(config.webDir, "dist");
  assert.equal(config.server, undefined, "server.url solo se usa en desarrollo con --live-reload, nunca versionado");
  const manifest = await read("../android/app/src/main/AndroidManifest.xml");
  assert.doesNotMatch(manifest, /usesCleartextTraffic="true"/);
});

test("N21: CI corre en pull requests y ramas de trabajo con permisos mínimos y sin secretos", async () => {
  const ci = await read("../.github/workflows/ci.yml");
  assert.match(ci, /^\s*pull_request:/m);
  assert.match(ci, /push:\s*\n\s*branches:\s*\[[^\]]*"fix\/\*\*"/);
  assert.match(ci, /permissions:\s*\n\s*contents: read/);
  assert.doesNotMatch(ci, /secrets\./, "sin secretos de producción");
  for (const step of ["npm run lint", "npm test", "npm run build", "npm run test:e2e", "npm audit --omit=dev", "upload-artifact"]) assert.ok(ci.includes(step), step);
  assert.match(ci, /if: always\(\)\s*\n\s*uses: actions\/upload-artifact/, "conserva artefactos también cuando falla");
});

test("N19: package.json fija overrides acotados y no hay service_role en variables públicas", async () => {
  const pkg = JSON.parse(await read("../package.json"));
  assert.deepEqual(Object.keys(pkg.overrides ?? {}).sort(), ["minimatch", "rimraf"]);
  assert.doesNotMatch(await read("../.env.example"), /VITE_[A-Z_]*SERVICE_ROLE/);
});

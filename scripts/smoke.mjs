/* Smoke test HTTP contra un despliegue REAL (preview o producción). No usa credenciales de usuario.
   Uso: node scripts/smoke.mjs https://<despliegue>
   Si el preview tiene Vercel Authentication, define VERCEL_AUTOMATION_BYPASS_SECRET (Protection Bypass for Automation).
   Sale con código 1 si algo falla: el workflow deploy-smoke lo convierte en un check que bloquea la promoción. */
const base = new URL(process.argv[2] ?? process.env.SMOKE_URL ?? "");
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = bypass ? { "x-vercel-protection-bypass": bypass } : {};
const failures = [];

async function check(name, path, expect, init = {}) {
  const url = new URL(path, base);
  try {
    const response = await fetch(url, { redirect: "manual", ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(15_000) });
    const problems = expect(response) ?? [];
    console.log(`${problems.length ? "✖" : "✔"} ${name}: ${init.method ?? "GET"} ${url.pathname} → ${response.status}${problems.length ? ` (${problems.join("; ")})` : ""}`);
    if (problems.length) failures.push(name);
  } catch (error) {
    console.log(`✖ ${name}: ${error.name}`);
    failures.push(name);
  }
}
const status = (...codes) => (response) => (codes.includes(response.status) ? [] : [`esperaba ${codes.join("/")}`]);
const header = (response, name, pattern) => (pattern.test(response.headers.get(name) ?? "") ? [] : [`cabecera ${name}`]);

await check("página de inicio y cabeceras", "/", (response) => [
  ...status(200)(response),
  ...header(response, "strict-transport-security", /max-age=\d{8,}/),
  ...header(response, "content-security-policy", /frame-ancestors 'none'/),
  ...header(response, "x-content-type-options", /^nosniff$/),
]);
await check("ruta conocida de la SPA", "/login", status(200));
await check("ruta inexistente = HTTP 404", "/ruta-inexistente-smoke", status(404));
await check("API viva (Redis y Supabase configurados)", "/api/v1/health", status(200));
await check("API sin token = 401", "/api/v1/me", (response) => [...status(401)(response), ...header(response, "www-authenticate", /^Bearer/)]);
await check("API método no permitido = 405", "/api/v1/auth/register", (response) => [...status(405)(response), ...header(response, "allow", /POST/)]);
await check("API ruta inexistente = 404", "/api/v1/no-existe", status(404));
await check("API cuerpo no JSON = 415", "/api/v1/auth/login", status(415), { method: "POST", headers: { "content-type": "text/plain" }, body: "x" });
await check("catálogo TMDB por el proxy", "/api/tmdb/configuration", status(200));
if (base.protocol === "https:" && !/^(localhost|127\.)/.test(base.hostname)) {
  const http = new URL(base);
  http.protocol = "http:";
  await check("HTTP redirige a HTTPS", http.href, (response) => [...status(301, 308)(response), ...header(response, "location", /^https:\/\//)]);
}

if (failures.length) {
  console.log(`\n${failures.length} comprobación(es) fallaron: no promover este despliegue.`);
  process.exit(1);
}
console.log("\nSmoke OK.");

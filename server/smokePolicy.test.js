import { test } from "node:test";
import assert from "node:assert/strict";
import { createSmokePolicy } from "./smokePolicy.js";

const config = { url: "https://preview.example.test", bypass: "synthetic-bypass", trustedOrigins: "https://preview.example.test" };

test("Smoke: el secreto solo va a orígenes HTTPS explícitos y nunca en HTTP", () => {
  const policy = createSmokePolicy(config);
  assert.equal(policy.headersFor("/api/v1/health")["x-vercel-protection-bypass"], config.bypass);
  for (const target of ["http://preview.example.test/", "https://untrusted.example.test/", "https://preview.example.test.evil.test/", "https://preview.example.test:444/", "https://x:pass@preview.example.test/"]) assert.deepEqual(policy.headersFor(target), {});
  assert.equal(policy.headersFor("https://preview.example.test:443/")["x-vercel-protection-bypass"], config.bypass);
});

test("Smoke: URL inicial inválida o no confiable aborta antes de cualquier llamada", () => {
  for (const url of ["http://preview.example.test", "not-url", "https://untrusted.example.test", "https://user:password@preview.example.test", "https://preview.example.test:444", "https://preview.example.test?secret=x", "https://preview.example.test#fragment"]) assert.throws(() => createSmokePolicy({ ...config, url }));
  for (const trustedOrigins of ["", "https://*.vercel.app", "https://preview.example.test/path", "[false]", "[malformed"]) assert.throws(() => createSmokePolicy({ ...config, trustedOrigins }));
});

test("Smoke: CSV o JSON permiten solo los orígenes declarados y los despliegues públicos no necesitan secreto", () => {
  const policy = createSmokePolicy({ ...config, trustedOrigins: JSON.stringify(["https://preview.example.test/", "https://other.example.test:8443"]) });
  assert.equal(policy.headersFor("https://other.example.test:8443/")["x-vercel-protection-bypass"], config.bypass);
  assert.deepEqual(policy.headersFor("https://other.example.test/"), {});
  const publicPolicy = createSmokePolicy({ url: "https://public.example.test" });
  assert.deepEqual(publicPolicy.headersFor("/"), {});
});

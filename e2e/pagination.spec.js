import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const PASSWORD = "cinet-e2e-123";
const FIXTURE_KEY = "local-e2e-fixture-only";
const fixturePrefixes = [];
test.use({ serviceWorkers: "block" });

test.afterEach(async ({ request }) => {
  for (const { prefix, token } of fixturePrefixes.splice(0)) {
    await request.post("/__e2e/seed-plans", {
      headers: { authorization: `Bearer ${token}`, "x-e2e-test-key": FIXTURE_KEY },
      data: { deletePrefix: prefix },
    }).catch(() => {});
  }
});

async function signIn(page) {
  await page.goto("/login");
  await page.locator("#email").fill("historial@cinet.test");
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#signup-form [type=submit]").click();
  await expect(page).toHaveURL(/\/home$/);
}

async function accessToken(page) {
  return page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => /-auth-token$/.test(key));
    return entry ? JSON.parse(entry[1]).access_token : null;
  });
}

test("el historial compartido carga más de 200 planes sin huecos ni duplicados", async ({ page, request }) => {
  await signIn(page);
  const token = await accessToken(page);
  expect(token).toBeTruthy();

  const prefix = randomUUID().replaceAll("-", "").slice(0, 20);
  const seed = await request.post("/__e2e/seed-plans", {
    headers: { authorization: `Bearer ${token}`, "x-e2e-test-key": FIXTURE_KEY },
    data: { count: 205, prefix },
  });
  expect(seed.status()).toBe(201);
  fixturePrefixes.push({ prefix, token });
  const fixture = await seed.json();

  await page.goto("/my-plans");
  await expect(page.locator(".plan-card")).toHaveCount(200, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: fixture.first })).toHaveCount(0);
  const loadMore = page.getByRole("button", { name: "Cargar planes anteriores" });
  await expect(loadMore).toBeVisible();
  await loadMore.click();

  await expect(page.locator(".plan-card")).toHaveCount(205, { timeout: 15_000 });
  await expect(page.locator(".plan-card").last().getByRole("heading", { name: fixture.first })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cargar planes anteriores" })).toHaveCount(0);
  const names = await page.locator(".plan-card h3").allTextContents();
  expect(new Set(names).size).toBe(205);
  expect(names.at(0)).toBe(fixture.last);
  expect(names.at(-1)).toBe(fixture.first);
});

test("el botón de paginación conserva el resto del historial si la siguiente página falla", async ({ page, request }) => {
  await signIn(page);
  const token = await accessToken(page);
  const prefix = randomUUID().replaceAll("-", "").slice(0, 20);
  const seed = await request.post("/__e2e/seed-plans", {
    headers: { authorization: `Bearer ${token}`, "x-e2e-test-key": FIXTURE_KEY },
    data: { count: 205, prefix },
  });
  expect(seed.status()).toBe(201);
  fixturePrefixes.push({ prefix, token });

  await page.goto("/my-plans");
  await expect(page.locator(".plan-card")).toHaveCount(200, { timeout: 15_000 });
  // Supabase puede reintentar un 503. Este caso comprueba el fallo que llega a la app.
  await page.route("**/rest/v1/plans?*", (route) => route.fulfill({ status: 500, json: { message: "fixture offline" } }));
  await page.getByRole("button", { name: "Cargar planes anteriores" }).click();
  await expect(page.getByRole("alert")).toContainText("No pudimos conectar");
  await expect(page.locator(".plan-card")).toHaveCount(200);
  await expect(page.getByRole("button", { name: "Reintentar carga" })).toBeVisible();
});

test("la portada distingue una carga fallida de un historial vacío y permite reintentar", async ({ page }) => {
  const plansRequest = "**/rest/v1/plans?*";
  const loading = Promise.withResolvers();
  await page.route(plansRequest, async (route) => {
    await loading.promise;
    await route.fulfill({ status: 500, json: { message: "fixture offline" } });
  }, { times: 1 });

  const preview = page.locator("#mis-planes");
  try {
    await signIn(page);
    await preview.scrollIntoViewIfNeeded();
    await expect(preview.getByRole("status")).toHaveText("Cargando tus planes…");
    await expect(preview.getByText("Todavía no tienes planes")).toHaveCount(0);
  } finally {
    loading.resolve();
  }

  await expect(preview.getByRole("alert")).toHaveText("No pudimos actualizar tus planes.");
  await expect(preview.getByText("Todavía no tienes planes")).toHaveCount(0);
  await preview.getByRole("button", { name: "Reintentar" }).click();
  await expect(preview.getByText("Todavía no tienes planes")).toBeVisible();
  await expect(preview.getByRole("alert")).toHaveCount(0);
});

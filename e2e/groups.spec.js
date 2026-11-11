import { expect, test } from "@playwright/test";

/* Grupos guardados y «repetir plan» con dos navegadores, contra la SQL real (PGlite). */
const PASSWORD = "cinet-e2e-123";

async function signIn(page, email) {
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#signup-form [type=submit]").click();
}

test("grupo: invitar, sumar a un plan y repetirlo sin copiar respuestas", async ({ browser }) => {
  const ana = await (await browser.newContext()).newPage();
  await ana.goto("/login");
  await signIn(ana, "ana@cinet.test");
  await expect(ana).toHaveURL(/\/home$/);

  await ana.goto("/grupos");
  await ana.getByLabel("Nombre del grupo").fill("La familia");
  await ana.getByRole("button", { name: "Crear grupo" }).click();
  await expect(ana.getByRole("heading", { level: 1, name: "La familia" })).toBeVisible();
  await ana.getByRole("button", { name: /Invitar con un enlace/ }).click();
  const link = await ana.locator("#group-invite-link").inputValue();
  expect(link).toMatch(/\/grupos\/unirse\/[A-Za-z0-9_-]{20,}$/);

  const bea = await (await browser.newContext()).newPage();
  await bea.goto(link);
  await bea.getByRole("link", { name: "Iniciar sesión" }).click();
  await signIn(bea, "bea@cinet.test");
  await expect(bea.getByRole("heading", { level: 1, name: "La familia" })).toBeVisible();
  await bea.getByRole("button", { name: "Unirme al grupo" }).click();
  await expect(bea.locator(".room-status")).toHaveText("2 personas");

  // Ana organiza un plan y suma al grupo en un paso.
  await ana.goto("/functions?movie=interstellar");
  await ana.getByLabel("Cadena de cine").selectOption("Cinemark");
  await ana.locator("#date-grid button").first().click();
  await ana.getByLabel(/Hora propuesta/).fill("20:00");
  await ana.getByRole("button", { name: "Continuar →" }).click();
  await ana.getByLabel("Nombre del plan").fill("Cine en familia");
  await ana.getByRole("button", { name: /Crear plan/ }).click();
  await expect(ana).toHaveURL(/\/plan\/[0-9a-f-]{36}$/);
  await ana.getByLabel("Sumar a un grupo guardado").selectOption({ label: "La familia (2)" });
  await ana.getByRole("button", { name: "Sumar al plan" }).click();
  await expect(ana.locator(".attendee", { hasText: "Bea" })).toContainText("Sin responder");

  // Bea lo ve en el grupo, confirma y lo repite otro día: nadie arrastra su respuesta.
  await bea.reload();
  await bea.getByRole("link", { name: "Cine en familia" }).click();
  await bea.getByRole("button", { name: "✅ Sí, voy" }).click();
  await expect(bea.locator(".attendee", { hasText: "Bea" })).toContainText("Sí");
  await bea.getByLabel("Fecha").fill("2030-01-10");
  await bea.getByLabel("Hora propuesta").fill("19:30");
  await bea.getByRole("button", { name: "Repetir con las mismas personas" }).click();
  await expect(bea.getByText("🕐 Hora propuesta")).toBeVisible();
  await expect(bea.locator(".plan-details")).toContainText("19:30");
  await expect(bea.locator(".attendee", { hasText: "Ana" })).toContainText("Sin responder");
  await expect(bea.locator(".attendee", { hasText: "Bea" })).toContainText("Sí");

  await ana.goto(link.replace(/unirse\/.+$/, "").replace(/\/$/, ""));
  await ana.getByRole("link", { name: "La familia" }).click();
  await expect(ana.locator(".group-plans a", { hasText: "Cine en familia" })).toHaveCount(2);
});

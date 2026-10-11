import { expect, test } from "@playwright/test";

/* Plan compartido entre dos cuentas en navegadores separados, contra la SQL real (PGlite). */
const PASSWORD = "cinet-e2e-123";

async function signIn(page, email) {
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#signup-form [type=submit]").click();
}

test("Ana organiza, Bea entra con el enlace y confirma con su propia cuenta", async ({ browser }) => {
  const ana = await (await browser.newContext()).newPage();
  await ana.goto("/login");
  await signIn(ana, "ana@cinet.test");
  await expect(ana).toHaveURL(/\/home$/);

  await ana.goto("/functions?movie=interstellar");
  await ana.getByLabel("Cadena de cine").selectOption("Cine Colombia");
  await ana.locator("#date-grid button").first().click();
  await ana.getByLabel(/Hora propuesta/).fill("19:45");
  await ana.getByRole("button", { name: "Continuar →" }).click();
  await expect(ana.locator(".plan-mode-notice")).toHaveCount(0); // con cuenta no hay aviso de "solo en este navegador"
  await ana.getByLabel("Nombre del plan").fill("Interstellar en grupo");
  await ana.getByLabel(/Presupuesto aproximado/).fill("45.000");
  await ana.getByRole("button", { name: /Crear plan/ }).click();
  await expect(ana).toHaveURL(/\/plan\/[0-9a-f-]{36}$/);
  await expect(ana.getByRole("heading", { level: 1, name: "Interstellar en grupo" })).toBeVisible();
  await expect(ana.locator(".plan-details")).toContainText("$45.000 por persona · estimado");
  await expect(ana.getByText("🕐 Hora propuesta")).toBeVisible();

  await ana.getByRole("button", { name: /Crear y compartir enlace/ }).click();
  const link = await ana.locator("#invite-link").inputValue();
  expect(link).toMatch(/\/invite\/[A-Za-z0-9_-]{20,}$/);

  // Bea abre el enlace en otro navegador, inicia sesión y se une con su identidad.
  const bea = await (await browser.newContext()).newPage();
  await bea.goto(link);
  await expect(bea.getByRole("heading", { level: 1, name: "Te invitaron a un plan" })).toBeVisible();
  await bea.getByRole("link", { name: "Iniciar sesión" }).click();
  await signIn(bea, "bea@cinet.test");
  await expect(bea.getByRole("heading", { level: 1, name: "Interstellar en grupo" })).toBeVisible();
  await expect(bea.getByText("Ana te invita a ver")).toBeVisible();
  await bea.getByRole("button", { name: "Unirme al plan" }).click();
  await expect(bea).toHaveURL(/\/plan\/[0-9a-f-]{36}$/);
  await bea.getByRole("button", { name: "✅ Sí, voy" }).click();
  await expect(bea.locator(".attendee", { hasText: "Bea" })).toContainText("Sí");
  await expect(bea.getByRole("button", { name: /Crear y compartir enlace/ })).toHaveCount(0); // invitar es del organizador

  await ana.reload();
  await expect(ana.locator(".attendee", { hasText: "Bea" })).toContainText("Sí");
  // Encuesta de horarios: Ana propone, Bea marca con su cuenta, Ana elige.
  await ana.getByLabel("Fecha 1").fill("2030-03-01");
  await ana.getByLabel("Fecha 2").fill("2030-03-02");
  await ana.getByRole("button", { name: "Proponer 2 horarios" }).click();
  await expect(ana.getByRole("heading", { name: "¿Qué horario les sirve?" })).toBeVisible();
  await bea.reload();
  const saturday = bea.locator(".plan-poll-options li", { hasText: "2 de marzo" });
  await saturday.getByRole("checkbox").click();
  await expect(saturday).toContainText("1 puede: Bea");
  await expect(saturday.getByRole("button", { name: "Elegir este" })).toHaveCount(0); // elige quien organiza
  await ana.reload();
  await ana.locator(".plan-poll-options li", { hasText: "2 de marzo" }).getByRole("button", { name: "Elegir este" }).click();
  await expect(ana.locator(".plan-details")).toContainText("2 de marzo");
  await expect(ana.locator(".plan-poll-options")).toHaveCount(0);

  await ana.goto("/my-plans");
  await expect(ana.locator(".plan-card", { hasText: "Interstellar en grupo" })).toBeVisible();
});

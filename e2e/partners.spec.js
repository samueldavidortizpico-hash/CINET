import { expect, test } from "@playwright/test";

/* Aliados: solicitud → verificación por operador → función con fuente visible al público → cancelar la oculta. */
const PASSWORD = "cinet-e2e-123";

async function signedIn(browser, email) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#signup-form [type=submit]").click();
  await expect(page).toHaveURL(/\/home$/);
  return page;
}

test("un cine verificado publica una función y el público la ve con su fuente", async ({ browser }) => {
  const ana = await signedIn(browser, "ana@cinet.test");
  await ana.goto("/aliados");
  await ana.getByLabel("Nombre de la organización").fill("Cine Andes");
  await ana.getByLabel("Sitio oficial (https://)").fill("https://andes.example");
  await ana.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(ana.locator(".room-status")).toHaveText("Pendiente de verificación");

  const op = await signedIn(browser, "op@cinet.test");
  await op.goto("/admin");
  const request = op.locator(".admin-partners li", { hasText: "Cine Andes" });
  await request.getByRole("button", { name: "Verificar" }).click();
  await expect(op.locator(".admin-partners")).toContainText("No hay solicitudes pendientes.");

  await ana.reload();
  await ana.getByLabel("Nombre de la sede").fill("Andes Centro");
  await ana.getByLabel("Ciudad").fill("Bogotá");
  await ana.getByRole("button", { name: "Agregar sede" }).click();
  await ana.getByLabel(/Película o evento/).first().fill("Interst");
  await ana.getByRole("button", { name: /^Interstellar/ }).first().click();
  await ana.getByLabel("Sede", { exact: true }).selectOption({ label: "Andes Centro" });
  await ana.getByLabel("Fecha", { exact: true }).first().fill("2030-05-01");
  await ana.getByLabel("Hora (Bogotá)").fill("20:00");
  await ana.getByLabel("Formato").fill("IMAX");
  await ana.getByLabel("Precio (COP, opcional)").fill("18000");
  await ana.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(ana.locator(".partner-list li", { hasText: "Interstellar" })).toContainText("Publicada");

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/cine/interstellar");
  const listing = visitor.locator(".partner-listings li", { hasText: "Andes Centro" });
  await expect(listing).toContainText("IMAX");
  await expect(listing).toContainText("$18.000");
  await expect(listing).toContainText("Fuente: Cine Andes (lo publica el aliado)");
  await expect(listing.getByRole("link", { name: /Comprar en su sitio oficial/ })).toHaveAttribute("href", "https://andes.example");

  await ana.locator(".partner-list li", { hasText: "Interstellar" }).getByRole("button", { name: "Cancelar" }).click();
  await expect(ana.locator(".partner-list li", { hasText: "Interstellar" })).toContainText("Cancelada");
  await visitor.reload();
  await expect(visitor.getByRole("heading", { name: /cine la quieres ver/ })).toBeVisible();
  await expect(visitor.locator(".partner-listings")).toHaveCount(0);
});

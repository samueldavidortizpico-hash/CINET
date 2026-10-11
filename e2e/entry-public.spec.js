import { expect, test } from "@playwright/test";

/* Sin Supabase (proyecto local): la entrada no bloquea lo público y el centro legal no pide sesión. */

test("sin cuentas disponibles, la entrada lo dice y deja explorar sin cuenta", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Las cuentas no están disponibles ahora mismo.")).toBeVisible();
  await page.getByRole("link", { name: "Explorar sin cuenta →" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Acerca de" })).toHaveCount(0);

  await page.goto("/profile"); // la antigua landing de registro lleva al acceso
  await expect(page).toHaveURL(/\/login$/);
});

test("Legal y privacidad: público, con índice, fecha y enlaces desde la entrada", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Política de privacidad" }).click();
  await expect(page).toHaveURL(/\/legal\/privacidad$/);
  await expect(page.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeVisible();
  await expect(page.getByText(/Borrador en revisión/)).toBeVisible();
  await expect(page.locator("time[datetime='2026-10-11']")).toBeVisible();
  await page.getByRole("navigation", { name: "En esta página" }).getByRole("link", { name: "Medición anónima y consentimiento" }).click();
  await expect(page).toHaveURL(/#medicion$/);

  await page.goto("/legal");
  for (const name of ["Términos del servicio", "Política de privacidad", "Cancelaciones y reembolsos", "Créditos y fuentes"]) {
    await expect(page.locator(".legal-cards").getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  await page.goto("/legal/no-existe");
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
});

test("/about ya no existe: lleva a Créditos y fuentes con la atribución de TMDB y JustWatch", async ({ page }) => {
  await page.goto("/about");
  await expect(page).toHaveURL(/\/legal\/creditos$/);
  await expect(page.getByText("This product uses the TMDB API but is not endorsed or certified by TMDB.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "JustWatch" })).toBeVisible();
});

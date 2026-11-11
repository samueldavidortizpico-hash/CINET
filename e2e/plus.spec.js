import { expect, test } from "@playwright/test";

/* Plus en sandbox contra la SQL real (PGlite): el servidor decide, no hay cobro y cancelar no quita nada de inmediato. */
const PASSWORD = "cinet-e2e-123";

test("noche fija: sin Plus el servidor la niega; con la prueba se programa la siguiente; cancelar conserva el periodo", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("ana@cinet.test");
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#signup-form [type=submit]").click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto("/functions?movie=coco");
  await page.getByLabel("Cadena de cine").selectOption("Cinemark");
  await page.locator("#date-grid button").first().click();
  await page.getByLabel(/Hora propuesta/).fill("19:30");
  await page.getByRole("button", { name: "Continuar →" }).click();
  await page.getByLabel("Nombre del plan").fill("Viernes de cine");
  await page.getByRole("button", { name: /Crear plan/ }).click();
  await expect(page).toHaveURL(/\/plan\/[0-9a-f-]{36}$/);
  const planUrl = page.url();

  // Sin Plus: el servidor responde CN402 y el control sigue mostrando lo guardado.
  await page.getByLabel("Se repite").selectOption("week");
  await expect(page.getByRole("alert")).toContainText("La noche fija es parte de CINET Plus");
  await expect(page.getByLabel("Se repite")).toHaveValue("");

  await page.goto("/plus");
  await expect(page.getByRole("heading", { name: "Pruébalo 30 días" })).toBeVisible();
  await page.getByRole("button", { name: "Activar la prueba" }).click();
  await expect(page.getByRole("heading", { name: /Tienes Plus/ })).toBeVisible();
  await expect(page.locator(".plus-status")).toContainText("no se cobró nada");

  await page.goto(planUrl);
  await page.getByLabel("Se repite").selectOption("week");
  await expect(page.getByRole("button", { name: "Programar la siguiente" })).toBeVisible();
  await page.getByRole("button", { name: "Programar la siguiente" }).click();
  await expect(page).not.toHaveURL(planUrl);
  await expect(page).toHaveURL(/\/plan\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Viernes de cine" })).toBeVisible();
  await expect(page.getByLabel("Se repite")).toHaveValue("week");

  await page.goto("/plus");
  await page.getByRole("button", { name: "Cancelar la prueba" }).click();
  await expect(page.getByRole("heading", { name: /Plus cancelado/ })).toBeVisible();
  await expect(page.locator(".plus-status")).toContainText("Sigue activo hasta");

  await page.getByRole("button", { name: "Me interesa a ese precio" }).click();
  await expect(page.getByRole("status").filter({ hasText: "no te suscribe a nada" })).toBeVisible();
});

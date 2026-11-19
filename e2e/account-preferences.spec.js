import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

/* Gustos por cuenta: se guardan, se descargan, se reutilizan en una sala y no pasan a otra cuenta del mismo navegador. */
const PASSWORD = "cinet-e2e-123";

async function signIn(page, email) {
  await page.goto("/profile"); // sin sesión lleva al acceso y, al entrar, vuelve al perfil
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#signup-form [type=submit]").click();
  await expect(page).toHaveURL(/\/profile/);
}

test("gustos privados por cuenta en el mismo navegador", async ({ page }) => {
  await signIn(page, "ana@cinet.test");
  const panel = page.locator(".account-prefs");
  await panel.locator(".duo-fieldset", { hasText: "Te apetece" }).getByRole("checkbox", { name: "Comedia", exact: true }).check();
  await panel.locator(".duo-fieldset", { hasText: "Prefieres evitar" }).getByRole("checkbox", { name: "Terror", exact: true }).check();
  await panel.getByRole("button", { name: "Guardar mis gustos" }).click();
  await expect(panel.getByRole("button", { name: "Descargar (.json)" })).toBeVisible();

  await page.reload();
  await expect(panel.locator(".duo-fieldset", { hasText: "Te apetece" }).getByRole("checkbox", { name: "Comedia" })).toBeChecked();

  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Descargar (.json)" }).click();
  const exported = JSON.parse(await readFile(await (await download).path(), "utf8"));
  expect(exported.data).toEqual({ region: "CO", providers: [], genres: ["comedy"], rejectedGenres: ["horror"], maxRuntime: 0 });

  // En una sala nueva, sus gustos de la sala parten de los de la cuenta.
  await page.goto("/duo/sala");
  await page.getByRole("button", { name: "Abrir sala" }).click();
  await expect(page.getByText("Partimos de los gustos guardados en tu cuenta")).toBeVisible();
  await expect(page.locator(".room-prefs .duo-fieldset").first().getByRole("checkbox", { name: "Comedia" })).toBeChecked();

  // Favoritos e historial Duo también deben volver al cambiar de cuenta.
  await page.goto("/movie/interstellar");
  await page.getByRole("button", { name: /Añadir a favoritos/ }).click();
  await page.getByRole("button", { name: /Marcar como vista/ }).click();
  await expect(page.getByRole("button", { name: /En favoritos/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Ya la vi/ })).toHaveAttribute("aria-pressed", "true");

  // Bea entra en el mismo navegador: no ve nada de Ana.
  await page.goto("/profile");
  await page.getByRole("button", { name: /Tu cuenta/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await signIn(page, "bea@cinet.test");
  await expect(panel.getByRole("button", { name: "Guardar mis gustos" })).toBeVisible();
  await expect(panel.locator(".duo-fieldset", { hasText: "Te apetece" }).getByRole("checkbox", { name: "Comedia" })).not.toBeChecked();
  await expect(panel.getByRole("button", { name: "Descargar (.json)" })).toHaveCount(0);
  await page.goto("/movie/interstellar");
  await expect(page.getByRole("button", { name: /Añadir a favoritos/ })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: /Marcar como vista/ })).toHaveAttribute("aria-pressed", "false");

  await page.goto("/profile");
  await page.getByRole("button", { name: /Tu cuenta/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await signIn(page, "ana@cinet.test");
  await page.goto("/movie/interstellar");
  await expect(page.getByRole("button", { name: /En favoritos/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Ya la vi/ })).toHaveAttribute("aria-pressed", "true");
});

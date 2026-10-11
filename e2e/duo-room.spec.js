import { expect, test } from "@playwright/test";

/*
 * Salas de Duo con navegadores independientes (cada uno con su sesión), contra la SQL real
 * en PGlite (e2e/support/fake-supabase.mjs). No hay Realtime: «volver a la pestaña» relee la sala.
 */
const PASSWORD = "cinet-e2e-123";
const refresh = (page) => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

async function signIn(page, email) {
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#signup-form [type=submit]").click();
}

async function openRoom(browser) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await signIn(page, "ana@cinet.test");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/duo/sala");
  await page.getByRole("button", { name: "Abrir sala" }).click();
  await expect(page).toHaveURL(/\/duo\/sala\/[A-HJ-NP-Z2-9]{6}$/);
  return { page, code: page.url().split("/").pop() };
}

async function voteAll(page, { vetoLast = false } = {}) {
  const groups = page.getByRole("group", { name: /^Tu voto para/ });
  const count = await groups.count();
  for (let index = 0; index < count; index++) {
    const choice = index === 0 ? "Sí" : vetoLast && index === count - 1 ? "Veto" : "No";
    const button = groups.nth(index).getByRole("button", { name: choice, exact: true });
    await button.click();
    // El último voto de la última persona cierra la ronda y la baraja desaparece.
    if (index < count - 1) await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  return count;
}

test("dos personas eligen en una sala, cada una desde su navegador", async ({ browser }) => {
  const { page: ana, code } = await openRoom(browser);
  await expect(ana.getByRole("heading", { level: 1, name: `Sala ${code}` })).toBeVisible();
  await expect(ana.getByRole("img", { name: `Código QR para entrar a la sala ${code}` })).toBeVisible();

  // Bea abre el enlace sin sesión, entra con su cuenta y vuelve a la sala.
  const bea = await (await browser.newContext()).newPage();
  await bea.goto(`/duo/sala/${code}`);
  await bea.getByRole("link", { name: "Iniciar sesión" }).click();
  await signIn(bea, "bea@cinet.test");
  await expect(bea).toHaveURL(new RegExp(`/duo/sala/${code}$`));
  await bea.getByRole("button", { name: "Entrar a la sala" }).click();
  await expect(bea.getByRole("heading", { level: 1, name: `Sala ${code}` })).toBeVisible();

  for (const page of [ana, bea]) {
    await page.locator(".room-prefs .duo-fieldset").first().getByText("Comedia", { exact: true }).click();
    await page.getByRole("button", { name: /guardar mis gustos/ }).click();
    await expect(page.getByText("Tus gustos están guardados")).toBeVisible();
  }

  await refresh(ana);
  await expect(ana.getByText("2 de 2 con gustos listos")).toBeVisible();
  await ana.getByRole("button", { name: "Armar baraja y votar" }).click();
  await expect(ana.getByRole("heading", { name: /Ronda 1/ })).toBeVisible();
  await refresh(bea);
  await expect(bea.getByRole("heading", { name: /Ronda 1/ })).toBeVisible();

  const deck = await voteAll(ana, { vetoLast: true });
  expect(deck).toBeGreaterThanOrEqual(2);
  await refresh(bea);
  await expect(bea.locator(".room-progress")).toContainText("Listo"); // de Ana solo se ve el progreso
  await voteAll(bea); // el último voto cierra la ronda en el servidor

  await expect(bea.getByRole("heading", { name: /¡Coincidencia! Las 2 personas dijeron que sí/ })).toBeVisible();
  await refresh(ana);
  await expect(ana.getByRole("heading", { name: /¡Coincidencia! Las 2 personas dijeron que sí/ })).toBeVisible();
  await expect(ana.locator(".room-tallies li").last()).toContainText("🚫 vetado");
  await expect(ana.locator(".room-tallies li").last().getByRole("button", { name: "Elegir esta" })).toHaveCount(0);
  await ana.locator(".room-tallies li.is-winner").getByRole("button", { name: "Elegir esta" }).click();
  await expect(ana.getByText("Van a ver esta.")).toBeVisible();
  await refresh(bea);
  await expect(bea.getByText("Van a ver esta.")).toBeVisible();
  await expect(bea.getByRole("link", { name: /Plan en casa/ })).toBeVisible();
});

test("un invitado sin cuenta se une con su nombre, pero no abre salas", async ({ browser }) => {
  const { code } = await openRoom(browser);
  const gus = await (await browser.newContext()).newPage();
  await gus.goto(`/duo/sala/${code}`);
  await gus.getByLabel("O entra como invitado con tu nombre").fill("Gus");
  await gus.getByRole("button", { name: "Entrar como invitado" }).click();
  await expect(gus.getByLabel("Cómo te verán en la sala")).toHaveValue("Gus");
  await gus.getByRole("button", { name: "Entrar a la sala" }).click();
  await expect(gus.locator(".room-members")).toContainText("Gus (tú)");
  await gus.goto("/duo/sala");
  await expect(gus.getByText("Como invitado puedes unirte a salas, pero no abrirlas.")).toBeVisible();
});

test("un código inventado no revela ninguna sala", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await signIn(page, "bea@cinet.test");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/duo/sala/ZZZZ22");
  await page.getByRole("button", { name: "Entrar a la sala" }).click();
  await expect(page.getByRole("alert")).toHaveText("No hay ninguna sala con ese código. Revísalo con quien la abrió.");
});

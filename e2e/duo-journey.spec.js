import process from "node:process";
import { expect, test } from "@playwright/test";

/*
 * Duo en modo local (catálogo de CINET, sin TMDB ni Supabase): las seis escenas con datos reales del
 * catálogo. Prueba clics, teclado, recarga a mitad de ronda y movimiento reducido; no prueba FPS ni
 * lectores de pantalla.
 */
const answer = (page, label) => page.getByRole("group", { name: /^¿Qué (te|le) parece/ }).getByRole("button", { name: label, exact: true });
const session = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("cinehub-duo-session")));

/** Escena 1 → 3 con dos personas: Ana responde películas y marca acción; Luis, acción y comedia. */
async function prepareNight(page) {
  await page.goto("/duo");
  await page.getByRole("button", { name: /Una cita/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "¿Cómo se ve su noche?" })).toBeVisible();
  await expect(page.locator(".duo-entry-stub")).toContainText("2");
  await page.getByText("En grupo", { exact: true }).click();
  await expect(page.locator(".duo-entry .duo-seat-row li")).toHaveCount(4);
  await page.getByText("En pareja", { exact: true }).click();
  await expect(page.locator(".duo-entry .duo-seat-row li")).toHaveCount(2);
  await page.getByRole("button", { name: /Mostrar nuestros gustos/ }).click();

  // Escena 2 · Ana: calibración por pósteres con deshacer y revisar.
  await page.getByLabel("Nombre").fill("Ana");
  await expect(page.getByRole("heading", { level: 3, name: "Interstellar" })).toBeVisible();
  await answer(page, "Me encanta").click();
  await answer(page, "No es para mí").click();
  await answer(page, "Ya la vi").click();
  const strip = page.getByRole("list", { name: "Tus respuestas" }).getByRole("listitem");
  await expect(strip).toHaveCount(3);
  await page.getByRole("button", { name: "↶ Deshacer" }).click();
  await expect(strip).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 3, name: "Coco" })).toBeVisible(); // se vuelve a preguntar la deshecha
  await answer(page, "No la conozco").click();
  await page.getByRole("button", { name: "Interstellar: Me encanta. Cambiar respuesta" }).click();
  await expect(answer(page, "Me encanta")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Dejarla como estaba" }).click();
  await page.getByRole("button", { name: /Géneros y actores/ }).click();
  await page.getByRole("button", { name: /^Acción: sin marcar/ }).click();
  await page.getByRole("button", { name: /Turno de Persona 2/ }).click();

  // Luis: sin calibración (la vía rápida sigue funcionando).
  await page.getByLabel("Nombre").fill("Luis");
  await page.getByRole("button", { name: /Géneros y actores/ }).click();
  await page.getByRole("button", { name: /^Acción: sin marcar/ }).click();
  await page.getByRole("button", { name: /^Comedia: sin marcar/ }).click();
  await page.getByRole("button", { name: "Continuar →" }).click();
  await page.getByRole("button", { name: /Ver lo que tienen en común/ }).click();

  // Escena 3 · coincidencias declaradas y límites aparte.
  await expect(page.getByRole("heading", { level: 2, name: "Esto es lo que los une" })).toBeVisible();
  await expect(page.locator(".duo-map-center")).toContainText("acción");
  await expect(page.getByRole("group", { name: "Límites que se cumplen siempre" })).toContainText("hasta 2 h 10 min");
  await expect(page.getByRole("list", { name: "Películas que le encantan a Ana" }).getByRole("img", { name: "Interstellar" })).toBeVisible();
  await page.getByRole("button", { name: "Ver finalistas →" }).click();
}

async function voteAll(page, count, key = null) {
  for (let card = 0; card < count; card++) {
    await expect(page.locator(".duo-round-count")).toHaveText(`${card + 1} / ${count}`);
    if (key) await page.keyboard.press(key);
    else await page.getByRole("dialog").getByRole("button", { name: "Sí", exact: true }).click();
  }
}

test("Duo completo: gustos con películas → finalistas → ronda reanudable → revelación → elección → plan", async ({ page }) => {
  await prepareNight(page);

  // Escena 4 · finalistas con papeles y diferencias.
  const finalists = page.locator(".duo-finalist");
  await expect(finalists.first()).toBeVisible();
  const count = await finalists.count();
  expect(count).toBeGreaterThanOrEqual(2);
  await expect(finalists.first().locator(".duo-role")).toHaveText("Punto de encuentro");
  for (const diff of await page.locator(".duo-diff").all()) await expect(diff).toContainText("Duración");
  expect((await session(page)).finalists).toHaveLength(count);

  // Escena 5 · ronda: Ana vota con botones, Luis con teclado; recargar a mitad la retoma.
  await page.getByRole("button", { name: new RegExp(`^Votar entre ${count}`) }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Turno de Ana" })).toBeVisible();
  await dialog.getByRole("button", { name: "Listo, a votar" }).click();
  await voteAll(page, count);
  await expect(dialog.getByRole("heading", { name: "Turno de Luis" })).toBeVisible();
  await dialog.getByRole("button", { name: "Listo, a votar" }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".duo-round-count")).toHaveText(`2 / ${count}`);

  const before = (await session(page)).round;
  await page.reload();
  await expect(page.getByRole("dialog").getByText("Vota Luis")).toBeVisible();
  await expect(page.locator(".duo-round-count")).toHaveText(`2 / ${count}`);
  expect((await session(page)).round).toMatchObject({ id: before.id, deck: before.deck, person: 1, card: 1 });

  for (let card = 1; card < count; card++) {
    await expect(page.locator(".duo-round-count")).toHaveText(`${card + 1} / ${count}`);
    await page.keyboard.press("ArrowRight");
  }
  // Revelación breve y omitible: el resultado ya está calculado.
  await page.getByRole("dialog").getByRole("button", { name: "Ver resultado" }).click();
  await expect(page.getByRole("dialog").getByText("💞 ¡MATCH! TODOS DIJERON SÍ")).toBeVisible();
  const winner = (await session(page)).round.result;
  expect(before.deck).toContain(winner);
  await page.getByRole("dialog").getByRole("button", { name: /^Elegir «/ }).click();

  // Escena 6 · organizar: hora propuesta con fin estimado, recuerdo revisable y paso al plan.
  await expect(page.getByText("ESCENA 6 · ORGANIZAR")).toBeVisible();
  expect((await session(page)).final).toBe(winner);
  await page.getByLabel("¿A qué hora empiezan? (opcional)").fill("20:30");
  await expect(page.getByText(/Terminarían hacia las \d\d:\d\d: estimado con .* de película, sin pausas\. Es una hora propuesta, no una función confirmada\./)).toBeVisible();
  await expect(page.locator(".duo-memory blockquote")).toHaveText(/^Esta noche vemos «.+»/);
  await expect(page.locator(".duo-memory blockquote")).not.toContainText("Ana");
  await page.getByText("Incluir nuestros nombres").click();
  await expect(page.locator(".duo-memory blockquote")).toHaveText(/^Ana y Luis vamos a ver «/);
  await page.getByRole("link", { name: /Una noche en casa/ }).click();
  await expect(page).toHaveURL(new RegExp(`/functions\\?movie=${winner}&mode=home&time=20:30$`));
});

test("una ronda nueva no hereda votos; sin movimiento no hay revelación", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepareNight(page);
  const count = await page.locator(".duo-finalist").count();
  await page.getByRole("button", { name: new RegExp(`^Votar entre ${count}`) }).click();
  const dialog = page.getByRole("dialog");
  for (const name of ["Ana", "Luis"]) {
    await expect(dialog.getByRole("heading", { name: `Turno de ${name}` })).toBeVisible();
    await dialog.getByRole("button", { name: "Listo, a votar" }).click();
    await voteAll(page, count, "ArrowLeft");
  }
  await expect(dialog.getByText("SIN COINCIDENCIA")).toBeVisible(); // todos dijeron no: no se inventa consenso
  await expect(dialog.getByRole("button", { name: "Ver resultado" })).toHaveCount(0);
  const first = (await session(page)).round;

  await dialog.getByRole("button", { name: "Otra ronda (sin estos votos)" }).click();
  await expect(dialog.getByRole("heading", { name: "Turno de Ana" })).toBeVisible();
  const second = (await session(page)).round;
  expect(second.id).not.toBe(first.id);
  expect(second.votes).toEqual({});
  expect(second.deck).toEqual(first.deck);
});

test("«Menos movimiento» se aplica a toda la página y se recuerda", async ({ page }) => {
  await page.goto("/duo");
  await page.getByRole("button", { name: /Un rato para mí/ }).click();
  await page.getByRole("checkbox", { name: "Menos movimiento" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Menos movimiento" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
});

test("una plataforma sin disponibilidad comprobada no se da por cumplida; ampliarla queda marcado", async ({ page }) => {
  await page.goto("/duo");
  await page.getByRole("button", { name: /Un rato para mí/ }).click();
  await page.getByText("Ajustes de la noche").click();
  await page.getByRole("button", { name: "Netflix" }).click();
  await page.getByRole("button", { name: "Ir directo a finalistas" }).click();
  await expect(page.getByText(/No encontramos películas para ti/)).toBeVisible();
  await expect(page.getByText(/no pudimos comprobar si están en sus plataformas/)).toBeVisible();
  await page.getByRole("button", { name: "Incluir sin comprobar disponibilidad" }).click();
  await expect(page.locator(".duo-finalist").first()).toBeVisible();
  await expect(page.locator(".duo-flag").first()).toHaveText("Ampliado: disponibilidad sin comprobar en sus plataformas.");
  await expect(page.locator(".duo-diff").first()).toContainText("Disponibilidad por confirmar");
});

/*
 * Capturas auténticas de las seis escenas en 390/834/1440 px (solo con DUO_CAPTURE=1; se guardan en
 * docs/evidencia/duo-avanzado). Además comprueba: sin desbordamiento horizontal y sin errores de consola.
 */
for (const width of [390, 834, 1440]) {
  test(`capturas de las escenas a ${width} px`, async ({ page }) => {
    test.skip(!process.env.DUO_CAPTURE, "solo bajo demanda: DUO_CAPTURE=1");
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && !/503|Failed to load resource/.test(message.text()) && errors.push(message.text()));
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    const shot = async (name) => {
      await page.waitForTimeout(450);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${name}: sin desbordamiento horizontal`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `docs/evidencia/duo-avanzado/despues-${width}-${name}.png` });
    };
    await page.goto("/duo");
    await page.getByRole("button", { name: /Una cita/ }).click();
    await shot("1-preparar");
    await page.getByRole("button", { name: /Mostrar nuestros gustos/ }).click();
    await page.getByLabel("Nombre").fill("Ana");
    await answer(page, "Me encanta").click();
    await answer(page, "No es para mí").click();
    await shot("2-gustos");
    await page.getByRole("button", { name: /Géneros y actores/ }).click();
    await page.getByRole("button", { name: /^Acción: sin marcar/ }).click();
    await page.getByRole("button", { name: /Turno de Persona 2/ }).click();
    await page.getByLabel("Nombre").fill("Luis");
    await page.getByRole("button", { name: /Géneros y actores/ }).click();
    await page.getByRole("button", { name: /^Acción: sin marcar/ }).click();
    await page.getByRole("button", { name: "Continuar →" }).click();
    await page.getByRole("button", { name: /Ver lo que tienen en común/ }).click();
    await shot("3-coincidencias");
    await page.getByRole("button", { name: "Ver finalistas →" }).click();
    await expect(page.locator(".duo-finalist").first()).toBeVisible();
    await shot("4-finalistas");
    const count = await page.locator(".duo-finalist").count();
    await page.getByRole("button", { name: new RegExp(`^Votar entre ${count}`) }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Listo, a votar" }).click();
    await shot("5-decidir");
    for (let card = 0; card < count * 2; card++) {
      if (card === count) await page.getByRole("dialog").getByRole("button", { name: "Listo, a votar" }).click();
      await expect(page.locator(".duo-round-count")).toHaveText(`${(card % count) + 1} / ${count}`);
      await page.keyboard.press("ArrowRight");
    }
    await page.getByRole("dialog").getByRole("button", { name: "Ver resultado" }).click();
    await shot("5b-resultado");
    await page.getByRole("dialog").getByRole("button", { name: /^Elegir «/ }).click();
    await page.getByLabel("¿A qué hora empiezan? (opcional)").fill("20:30");
    await shot("6-organizar");
    expect(errors).toEqual([]);
  });
}

test("después de la fecha: «¿La vieron? ¿Les gustó?» es opcional, local y saca la película de Duo", async ({ page }) => {
  // Plan local real (mismo recorrido que la app) y luego su fecha pasa al pasado.
  await page.goto("/functions?movie=interstellar&time=20:30");
  await expect(page.getByLabel(/Hora propuesta/)).toHaveValue("20:30"); // la hora que traen de Duo llega como propuesta
  await page.getByLabel("Cadena de cine").selectOption("Cinemark");
  await page.locator("#date-grid button").first().click();
  await page.getByRole("button", { name: "Continuar →" }).click();
  await page.getByLabel("Nombre del plan").fill("Noche de Interstellar");
  await page.getByLabel("Tu nombre").fill("Ana");
  await page.getByRole("button", { name: /Crear plan/ }).click();
  await expect(page).toHaveURL(/\/plan\//);
  await expect(page.getByRole("heading", { name: "¿La vieron? ¿Les gustó?" })).toHaveCount(0); // aún no pasó

  await page.evaluate(() => {
    const plans = JSON.parse(localStorage.getItem("cinehub-plans"));
    plans[0] = { ...plans[0], dateISO: "2026-01-10", startsAt: undefined };
    localStorage.setItem("cinehub-plans", JSON.stringify(plans));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "¿La vieron? ¿Les gustó?" })).toBeVisible();
  await page.getByRole("button", { name: "Sí, la vimos" }).click();
  await page.getByRole("button", { name: "Sí, nos gustó" }).click();
  await expect(page.getByRole("button", { name: "Sí, nos gustó" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".plan-memory blockquote")).toHaveText(/^Vimos «Interstellar» el 10 de enero\. Nos gustó\.$/);
  await expect(page.locator(".plan-memory blockquote")).not.toContainText("Ana");
  const seen = await page.evaluate(() => JSON.parse(localStorage.getItem("cinehub-duo-history")).seen);
  expect(seen).toContain("interstellar");
});

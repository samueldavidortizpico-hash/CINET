import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

// Recorrido principal en modo local (sin TMDB ni Supabase): película → propuesta de salida → plan → confirmación.
test("organizar una salida al cine sin cuentas ni catálogo en vivo", async ({ page }) => {
  const external = [];
  page.on("request", (request) => {
    if (/themoviedb\.org|supabase\.co/.test(request.url())) external.push(request.url());
  });

  await page.goto("/movie/interstellar");
  await page.getByRole("link", { name: /Organizar salida al cine/ }).click();
  await expect(page).toHaveURL(/\/functions\?movie=interstellar/);

  // Propuesta honesta: cadena oficial + sede opcional + fecha + hora propuesta (no hay funciones inventadas).
  await page.getByLabel("Cadena de cine").selectOption("Cinemark");
  await page.getByLabel("Sede propuesta (opcional)").fill("Andino");
  await expect(page.getByRole("link", { name: /Consultar cartelera en Cinemark/ })).toHaveAttribute("href", "https://www.cinemark.com.co/");
  await page.locator("#date-grid button").first().click();
  await page.getByLabel(/Hora propuesta/).fill("20:30");
  await page.getByRole("button", { name: "Continuar →" }).click();

  await expect(page).toHaveURL(/\/create-plan/);
  await page.getByLabel("Nombre del plan").fill("Cine del viernes");
  await page.getByLabel("Tu nombre").fill("Ana");
  await page.getByRole("button", { name: /Crear plan/ }).click();

  await expect(page).toHaveURL(/\/plan\//);
  await expect(page.getByRole("heading", { level: 1, name: "Cine del viernes" })).toBeVisible();
  await expect(page.getByText("Cinemark · Andino")).toBeVisible();
  await expect(page.getByText("🕐 Hora propuesta")).toBeVisible();
  await expect(page.getByRole("link", { name: /Consultar funciones en Cinemark \(sitio oficial\)/ })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Añadir a mi calendario/ }).click();
  const ics = await (await download).path().then((path) => import("node:fs/promises").then((fs) => fs.readFile(path, "utf8")));
  expect(ics).toMatch(/DTSTART:\d{8}T013000Z/); // 20:30 en Bogotá = 01:30 UTC del día siguiente
  expect(ics).toContain("LOCATION:Cinemark · Andino");

  await page.getByRole("button", { name: "🤔 Tal vez" }).click();
  await expect(page.locator(".attendee", { hasText: "Ana" })).toContainText("Tal vez");

  await page.goto("/my-plans");
  await expect(page.locator(".plan-card", { hasText: "Cine del viernes" })).toBeVisible();
  await expect(page.getByText("Estos planes viven solo en este navegador")).toBeVisible();

  // Resumen del año: cifras propias; compartir solo lleva cifras.
  await page.getByRole("link", { name: "Tu año en CINET" }).click();
  await expect(page.locator(".recap-stats")).toContainText("1plan");
  await expect(page.locator(".recap-preview")).toHaveText(/^Mi \d{4} en CINET: 1 plan/);
  await expect(page.locator(".recap-preview")).not.toContainText("Ana");

  expect(external).toEqual([]);
});

test("importar un CSV de Letterboxd: coincide, no inventa y no duplica", async ({ page }) => {
  const csv = "Date,Name,Year,Letterboxd URI,Rating\n2024-01-01,Iron Man,2008,https://boxd.it/a,4\n2024-01-02,\"Thor: Ragnarok\",2017,https://boxd.it/b,\n2024-01-03,Una que no existe,1999,https://boxd.it/c,3\n2024-01-04,Iron Man,2008,https://boxd.it/a,4\n";
  const upload = { name: "watched.csv", mimeType: "text/csv", buffer: Buffer.from(csv) };
  await page.goto("/importar");
  await page.getByLabel(/Archivo CSV/).setInputFiles(upload);
  await expect(page.getByText("3 títulos de Letterboxd")).toBeVisible(); // la fila repetida no cuenta
  await page.getByRole("button", { name: /Buscar 3 títulos/ }).click();
  await expect(page.getByRole("heading", { name: "2 coinciden · 0 por elegir · 1 sin encontrar" })).toBeVisible();
  await page.getByRole("button", { name: "Añadir 2 a «Ya vistas»" }).click();
  await expect(page.getByRole("heading", { name: /Listo: 2 títulos nuevos/ })).toBeVisible();

  await page.reload(); // otra vez el mismo archivo: nada nuevo
  await page.getByLabel(/Archivo CSV/).setInputFiles(upload);
  await page.getByRole("button", { name: /Buscar 3 títulos/ }).click();
  await page.getByRole("button", { name: "Añadir 2 a «Ya vistas»" }).click();
  await expect(page.getByRole("heading", { name: /Listo: 0 títulos nuevos .*\(2 ya estaban\)/ })).toBeVisible();

  await page.getByLabel(/Archivo CSV/).setInputFiles({ name: "otro.csv", mimeType: "text/csv", buffer: Buffer.from("a,b\n1,2\n") });
  await expect(page.getByRole("alert")).toContainText("No reconocemos el formato");
});

test("una invitación sin cuentas configuradas explica qué pasa", async ({ page }) => {
  await page.goto("/invite/token-de-prueba");
  await expect(page.getByRole("heading", { level: 1, name: "Invitación a un plan" })).toBeVisible();
  await expect(page.getByText("Las cuentas no están disponibles")).toBeVisible();
});

test("Duo deja elegir quiénes ven: solo, en pareja o en grupo", async ({ page }) => {
  await page.goto("/duo");
  await page.getByRole("button", { name: /Preparar mi plan/ }).click();
  await expect(page.getByText("¿Quiénes ven hoy?")).toBeVisible();

  // Las opciones son tarjetas <label> con el radio dentro: se pulsa la tarjeta, como haría una persona.
  await page.getByText("En grupo", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /En grupo/ })).toBeChecked();
  await expect(page.getByRole("group", { name: "Personas en el grupo" })).toContainText("4 personas");
  await page.getByRole("button", { name: "Una persona más" }).click();
  await expect(page.locator(".duo-seat-row li")).toHaveCount(5);

  // Turnos justos: opcional, solo con más de una persona, y queda guardado en el navegador.
  await page.getByText("En pareja", { exact: true }).click();
  await page.getByText("Ajustes de la noche").click();
  await page.locator(".duo-fieldset", { hasText: "Turnos justos" }).getByText("Desactivados").click();
  await expect(page.getByRole("button", { name: "Reiniciar turnos" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".duo-fieldset", { hasText: "Turnos justos" }).getByRole("checkbox")).toBeChecked();

  await page.getByText("Solo yo", { exact: true }).click();
  await expect(page.locator(".duo-seat-row li")).toHaveCount(1);
  await expect(page.getByText("Turnos justos")).toHaveCount(0);
});

test("Duo entiende una frase, muestra lo entendido y deja corregirlo", async ({ page }) => {
  await page.goto("/duo");
  const input = page.getByLabel("Cuéntanos qué quieren ver, con tus palabras");
  const start = page.getByRole("button", { name: /Empezar con esto/ });

  await input.fill("hola, ¿qué tal?");
  await expect(page.getByText(/No reconocí criterios/)).toBeVisible();
  await expect(start).toBeDisabled();

  await input.fill("somos 3, una comedia corta en Netflix, nada de terror");
  const understood = page.locator(".duo-ask-understood");
  for (const part of ["3 personas", "Te apetece: comedia", "Nada de: terror", "Hasta 1 h 40 min", "En Netflix"]) {
    await expect(understood.getByText(part, { exact: true })).toBeVisible();
  }
  await start.click();

  // Queda como punto de partida editable, no como decisión tomada.
  await expect(page.getByText("¿Quiénes ven hoy?")).toBeVisible();
  await expect(page.locator(".duo-seat-row li")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Netflix" })).toHaveAttribute("aria-pressed", "true");
  await page.getByText("En pareja", { exact: true }).click();
  await expect(page.locator(".duo-seat-row li")).toHaveCount(2);
});

test("sin conexión CINET abre desde la caché y la caché no guarda datos privados", async ({ page, context }) => {
  await page.goto("/home");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // ya controlada: los archivos del build pasan por el service worker
  await expect(page.locator("main")).not.toBeEmpty();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Sin conexión a internet/)).toBeVisible();
  await expect(page.getByRole("link", { name: /CINET/ }).first()).toBeVisible();

  const cached = await page.evaluate(async () => {
    const lists = await Promise.all((await caches.keys()).map(async (key) => (await (await caches.open(key)).keys()).map((request) => new URL(request.url))));
    return lists.flat().map((url) => ({ origin: url.origin, path: url.pathname }));
  });
  expect(await page.evaluate(() => caches.keys()), "la caché lleva la versión del build").toEqual([expect.stringMatching(/^cinet-[0-9a-f]{12}$/)]);
  expect(cached.map((item) => item.path)).toContain("/index.html");
  expect(cached.filter((item) => item.origin !== new URL(page.url()).origin || /^\/(api|rest|auth|realtime|storage)\//.test(item.path))).toEqual([]);
  await context.setOffline(false);
});

import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

/* Auditoría 2026-11-07 en navegador real (modo local, sin TMDB ni Supabase):
   V36 sesión Duo dañada tras recargar · V38/V39 foco del modal del tráiler con reproductor cargado y fallido. */

test("V36: un actor con nombre objeto no tumba Duo, sobrevive a la recarga y no borra favoritas", async ({ page }) => {
  await page.goto("/home");
  await page.evaluate(() => {
    localStorage.setItem("cinehub-favorites", JSON.stringify(["interstellar", "dune"]));
    localStorage.setItem(
      "cinehub-duo-session",
      JSON.stringify({ step: "person-0", reached: 1, people: [{ name: "Ana", actors: [{ id: 111, name: { corrupt: "object" } }, { id: 222, name: "Actriz" }] }, {}] })
    );
  });
  for (const attempt of ["primera carga", "tras recargar"]) {
    if (attempt === "tras recargar") await page.reload();
    else await page.goto("/duo");
    await expect(page.getByText("Unexpected Application Error")).toHaveCount(0);
    await expect(page.getByText(/Objects are not valid as a React child/)).toHaveCount(0);
    await expect(page.locator("body")).toContainText(/Duo|DUO/);
  }
  const resume = page.getByRole("button", { name: "Continuar la sesión" });
  if (await resume.isVisible()) await resume.click();
  await expect(page.getByText(/descartamos datos dañados \(actores\)/)).toBeVisible();
  await expect(page.getByText("Actriz✕")).toBeVisible();
  await expect(page.getByText("corrupt")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("cinehub-favorites"))).toBe(JSON.stringify(["interstellar", "dune"]));
});

for (const player of ["cargado", "fallido"]) {
  test(`V38/V39: el foco queda dentro del tráiler (reproductor ${player}) y vuelve al botón al cerrar`, async ({ page }) => {
    await page.route("https://www.youtube.com/**", (route) =>
      player === "cargado"
        ? route.fulfill({ contentType: "text/html", body: "<!doctype html><button>Reproducir</button><button>Pantalla completa</button>" })
        : route.abort()
    );
    await page.goto("/movie/interstellar");
    const opener = page.locator("#trailer-button");
    await opener.click();
    const dialog = page.locator("dialog.trailer-overlay[open]");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar tráiler" })).toBeFocused();

    // Fuera del diálogo todo es inerte: ni Tab ni Shift+Tab llegan al logo, al menú ni al botón de origen.
    const insideAfter = async (key, presses) => {
      for (let index = 0; index < presses; index += 1) {
        await page.keyboard.press(key);
        const inside = await page.evaluate(() => {
          const active = document.activeElement;
          const open = document.querySelector("dialog.trailer-overlay[open]");
          return Boolean(open && active && (open.contains(active) || active === document.body));
        });
        expect(inside, `${key} #${index + 1}`).toBe(true);
      }
    };
    await insideAfter("Tab", 6);
    await insideAfter("Shift+Tab", 6);
    await expect(page.locator(".logo-brand:focus, header a:focus")).toHaveCount(0);
    // El fondo no responde mientras el diálogo está abierto.
    expect(await page.evaluate(() => document.querySelector("#trailer-button").matches(":focus"))).toBe(false);

    await page.getByRole("button", { name: "Cerrar tráiler" }).focus();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog.trailer-overlay[open]")).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(page.locator("dialog.trailer-overlay")).toHaveAttribute("aria-label", "Tráiler de la película");
  });
}

// N18: la CSP de vercel.json, aplicada como cabecera real a cada documento, no produce violaciones.
test.describe("N18 (sin service worker: sus respuestas no pasan por page.route)", () => {
test.use({ serviceWorkers: "block" });
test("N18: navegación, login, Duo, ficha y tráiler funcionan bajo la CSP de vercel.json sin violaciones", async ({ page }) => {
  const { readFile } = await import("node:fs/promises");
  const config = JSON.parse(await readFile("vercel.json", "utf8"));
  const csp = config.headers.find((entry) => entry.source === "/(.*)").headers.find(({ key }) => key === "Content-Security-Policy").value;
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document" || !route.request().url().startsWith("http://localhost")) return route.fallback();
    const response = await route.fetch();
    // La extensión de VS Code «Console Ninja» inyecta scripts en el servidor de preview local: no son de CINET.
    const body = (await response.text()).replace(/<script>try\{\(0,eval\)\([\s\S]*?<\/script>/g, "");
    await route.fulfill({ response, body, headers: { ...response.headers(), "content-security-policy": csp, "content-length": String(Buffer.byteLength(body)) } });
  });
  await page.route("https://www.youtube.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><p>player</p>" }));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "" }));
  const violations = [];
  await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (event) => (window.__csp ??= []).push(`${event.violatedDirective} ${event.blockedURI} ${event.sourceFile}:${event.lineNumber} ${String(event.sample).slice(0, 80)}`)));
  for (const path of ["/", "/login", "/home", "/movies", "/duo", "/movie/interstellar", "/plan/abc"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    violations.push(...(await page.evaluate(() => window.__csp ?? [])).map((item) => `${path}: ${item}`));
  }
  await page.goto("/movie/interstellar");
  await page.locator("#trailer-button").click();
  await expect(page.locator("dialog.trailer-overlay[open]")).toBeVisible();
  await page.waitForTimeout(500);
  violations.push(...(await page.evaluate(() => window.__csp ?? [])).map((item) => `trailer: ${item}`));
  expect(violations).toEqual([]);
  // Un script en línea no autorizado SÍ se bloquea.
  const blocked = await page.evaluate(() => new Promise((resolve) => {
    document.addEventListener("securitypolicyviolation", () => resolve(true), { once: true });
    const script = document.createElement("script");
    script.textContent = "window.__injected = true";
    document.head.append(script);
    setTimeout(() => resolve(false), 1000);
  }));
  expect({ blocked, ran: await page.evaluate(() => window.__injected) }).toEqual({ blocked: true, ran: undefined });
  expect(await page.evaluate(() => window.__injected)).toBeUndefined();
});
});

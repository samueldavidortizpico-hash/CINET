import { expect, test } from "@playwright/test";

/* Entrada de la app contra el Supabase de pruebas (PGlite + adaptador de Auth). Un mock no demuestra Auth remota. */
const PASSWORD = "cinet-e2e-123";
const heading = (page) => page.getByRole("heading", { level: 1, name: "Qué bueno verte." });

async function signIn(page, email, password = PASSWORD) {
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entrar a CINET" }).click();
}

test("primera apertura: bienvenida una vez por sesión, omitible y sin pedir acceso con sesión", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Buenas historias. Mejores planes.")).toBeVisible();
  await expect(page.locator(".site-header")).toHaveCount(0); // sin navbar ni footer
  await page.getByRole("button", { name: "Omitir" }).click();
  await expect(heading(page)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Iniciar sesión" })).toHaveAttribute("aria-selected", "true");

  await page.reload(); // misma sesión del navegador: no repite la bienvenida
  await expect(heading(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Omitir" })).toHaveCount(0);

  await signIn(page, "ana@cinet.test", "incorrecta");
  await expect(page.getByRole("alert")).toHaveText(/Correo o contraseña incorrectos/);
  await signIn(page, "ana@cinet.test");
  await expect(page).toHaveURL(/\/home$/);

  await page.goto("/"); // sesión restaurada: directo al contenido
  await expect(page).toHaveURL(/\/home$/);
  await page.reload();
  await expect(page.getByRole("button", { name: /Tu cuenta: Ana/ })).toBeVisible();
});

test("la bienvenida termina sola y respeta menos movimiento", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(heading(page)).toBeVisible({ timeout: 4000 });
  await context.close();
});

test("ojo de contraseña: alterna sin perder el valor y no envía el formulario", async ({ page }) => {
  await page.goto("/login");
  const password = page.locator("#password");
  await password.fill("secreta123");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("secreta123");
  await expect(page.getByRole("alert")).toHaveCount(0); // no se envió
  await page.getByRole("button", { name: "Ocultar contraseña" }).press("Enter"); // también con teclado
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("secreta123");

  await page.getByRole("tab", { name: "Iniciar sesión" }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Crear cuenta" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toHaveCount(2);
  await expect(page.locator("#password")).toHaveAttribute("autocomplete", "new-password");

  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page.locator("#name")).toBeFocused(); // foco en el primer error
  await expect(page.locator("#name-error")).toBeVisible();
  await page.locator("#name").fill("Dani");
  await page.locator("#email").fill("dani@cinet.test");
  await page.locator("#password").fill("secreta123");
  await page.locator("#password-confirm").fill("otra-cosa");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page.locator("#password-confirm-error")).toHaveText(/no coinciden/);
  await page.locator("#password-confirm").fill("secreta123");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  // El Supabase de pruebas no admite registros nuevos: se muestra el error real traducido.
  await expect(page.getByRole("alert")).toHaveText(/registro de cuentas nuevas está cerrado/);
});

test("ruta protegida → acceso → vuelve al destino; roles en el panel", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/después volverás a donde estabas/)).toBeVisible();
  await signIn(page, "ana@cinet.test");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/admin"); // usuaria sin rol admin
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: /Tu cuenta/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: "Administración" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  const op = await (await page.context().browser().newContext()).newPage();
  await op.goto("/login");
  await signIn(op, "op@cinet.test");
  await op.getByRole("button", { name: /Tu cuenta/ }).click();
  await op.getByRole("link", { name: "Administración" }).click();
  await expect(op).toHaveURL(/\/admin$/);
  await expect(op.getByRole("dialog")).toBeHidden();
});

test("panel del avatar: abre, Escape devuelve el foco, cierra al navegar y cierra sesión", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, "bea@cinet.test");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  const avatar = page.getByRole("button", { name: /Tu cuenta: Bea/ });
  await avatar.click();
  await expect(avatar).toHaveAttribute("aria-expanded", "true");
  const panel = page.getByRole("dialog", { name: "Bea" });
  await expect(panel.getByRole("link", { name: /Dashboard/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(avatar).toBeFocused();
  await expect(avatar).toHaveAttribute("aria-expanded", "false");

  await avatar.click();
  await panel.getByRole("link", { name: /Dashboard/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(panel).toBeHidden();

  await avatar.click();
  await panel.getByRole("button", { name: "Cerrar panel de cuenta" }).click();
  await expect(panel).toBeHidden();

  await avatar.click();
  await panel.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(heading(page)).toBeVisible();
  await expect(page.getByText("Bea")).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("móvil 390 px: el panel es una hoja inferior que cubre el contenido", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/login");
  await signIn(page, "ana@cinet.test");
  await page.getByRole("button", { name: /Tu cuenta/ }).click();
  const dialog = page.getByRole("dialog");
  await expect.poll(() => dialog.evaluate((element) => element.getAnimations().length)).toBe(0); // termina de subir
  const box = await dialog.boundingBox();
  expect(Math.round(box.x)).toBe(0);
  expect(Math.round(box.width)).toBe(390);
  expect(Math.round(box.y + box.height)).toBe(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.mouse.click(195, 40); // toque fuera (sobre el fondo)
  await expect(page.getByRole("dialog")).toBeHidden();
  await context.close();
});

test("recuperar contraseña y crear una nueva desde el enlace", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page).toHaveURL(/\/recuperar$/);
  await page.getByLabel("Correo electrónico").fill("cleo@cinet.test");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status").filter({ hasText: "te llegará un enlace" })).toBeVisible();

  const { link } = await (await request.get("/__e2e/recovery-link?email=cleo@cinet.test")).json();
  await page.goto(link);
  await expect(page.getByRole("heading", { level: 1, name: "Crea una contraseña nueva." })).toBeVisible();
  const fresh = page.locator("#new-password");
  await fresh.fill("nueva-clave-1");
  await page.getByRole("button", { name: "Mostrar contraseña" }).first().click();
  await expect(fresh).toHaveAttribute("type", "text");
  await expect(fresh).toHaveValue("nueva-clave-1");
  await page.locator("#new-password-confirm").fill("nueva-clave-2");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.locator("#new-password-confirm-error")).toHaveText(/no coinciden/);
  await page.locator("#new-password-confirm").fill("nueva-clave-1");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.getByRole("button", { name: /Tu cuenta/ }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, "cleo@cinet.test");
  await expect(page.getByRole("alert")).toHaveText(/incorrectos/);
  await signIn(page, "cleo@cinet.test", "nueva-clave-1");
  await expect(page).toHaveURL(/\/home$/);
});

test("enlace de recuperación inválido: error recuperable", async ({ page }) => {
  await page.goto("/nueva-contrasena#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  await expect(page.getByRole("alert")).toContainText("El enlace no es válido o ya caducó");
  await page.getByRole("link", { name: "Pedir otro enlace" }).click();
  await expect(page).toHaveURL(/\/recuperar$/);
});

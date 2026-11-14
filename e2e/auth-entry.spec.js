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
  // Confirmación de correo activa (H-04): no hay sesión hasta abrir el enlace y se vuelve a "Iniciar sesión".
  await expect(page.getByText(/Te enviamos un correo a/)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Iniciar sesión" })).toHaveAttribute("aria-selected", "true");
});

test("ruta protegida → acceso → vuelve al destino; roles en el panel", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/después volverás a donde estabas/)).toBeVisible();
  await signIn(page, "ana@cinet.test");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/admin"); // usuaria con app_role = user en el JWT
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Acceso restringido" })).toBeVisible();
  await expect(page.getByText(/error 403/)).toBeVisible();
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


test("URLs de acceso: pestañas, recarga, atrás y adelante conservan la vista", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Crear cuenta" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: /Iniciar sesi/ }).click();
  await page.goBack();
  await expect(page.locator("#name")).toBeVisible();
  await page.goForward();
  await expect(page.locator("#name")).toHaveCount(0);
  await page.goto("/registro");
  await expect(page.locator("#name")).toBeVisible();
});

test("carga real: bloquea envíos duplicados y permite reintentar tras un error", async ({ page }) => {
  let attempts = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route("**/auth/v1/token?grant_type=password", async (route) => {
    attempts++;
    await gate;
    await route.continue();
  });
  await page.goto("/login");
  await signIn(page, "ana@cinet.test", "incorrecta");
  await expect(page.locator(".auth-form")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: /Entrando/ })).toBeDisabled();
  await page.locator(".auth-form").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await page.screenshot({ path: "audit/login-loading-1440.png" });
  expect(attempts).toBe(1);
  release();
  await expect(page.getByRole("alert")).toContainText("incorrectos");
  await signIn(page, "ana@cinet.test");
  await expect(page).toHaveURL(/\/home$/);
});

test("sesión caducada sin refresh válido vuelve al login y conserva el destino", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, "ana@cinet.test");
  await expect(page).toHaveURL(/\/home$/);
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (!key.endsWith("-auth-token")) continue;
      const session = JSON.parse(localStorage.getItem(key));
      session.expires_at = 1;
      session.refresh_token = "expired-test-session";
      localStorage.setItem(key, JSON.stringify(session));
    }
  });
  await page.goto("/dashboard?section=saved#plans");
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, "ana@cinet.test");
  await expect(page).toHaveURL(/\/dashboard\?section=saved#plans$/);
});

test("login adaptable sin desbordamiento, con capturas y movimiento reducido", async ({ page }) => {
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/login");
    await expect(heading(page)).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(document.getAnimations().filter((a) => a.effect.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
    });
    await page.screenshot({ path: `audit/login-${width}.png`, fullPage: true });
    await page.locator("#email").fill("correo-invalido");
    await page.getByRole("button", { name: "Entrar a CINET" }).click();
    await expect(page.locator("#email-error")).toContainText("válido");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `audit/login-validation-${width}.png`, fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(heading(page)).toBeVisible();
  expect(await page.locator(".auth-story").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});

test("alias públicos, acceso directo, recarga y 404", async ({ page }) => {
  for (const path of ["/catalogo", "/peliculas", "/planes", "/duo"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/ruta-inexistente-auditoria");
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
});

test("nombre con HTML se muestra como texto y no ejecuta scripts", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, "ana@cinet.test");
  await expect(page).toHaveURL(/\/home$/);
  const session = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.endsWith("-auth-token"));
    return JSON.parse(localStorage.getItem(key));
  });
  const payload = "<img src=x onerror=window.xssAudit=1>";
  const url = `/rest/v1/profiles?id=eq.${session.user.id}`;
  const headers = { Authorization: `Bearer ${session.access_token}`, apikey: "e2e-publishable-key" };
  const [original] = await (await page.request.get(`${url}&select=display_name`, { headers })).json();
  try {
    const response = await page.request.patch(url, { headers, data: { display_name: payload } });
    expect(response.ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("button", { name: `Tu cuenta: ${payload}` })).toBeVisible();
    expect(await page.evaluate(() => window.xssAudit)).toBeUndefined();
  } finally {
    const restored = await page.request.patch(url, { headers, data: { display_name: original.display_name } });
    expect(restored.ok()).toBeTruthy();
  }
});

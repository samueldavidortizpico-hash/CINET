import { defineConfig, devices } from "@playwright/test";

const LOCAL = Number(process.env.CINET_E2E_LOCAL_PORT) || 4173;
const ROOMS = Number(process.env.CINET_E2E_ROOMS_PORT) || 4176;
const NODE = `"${process.execPath}"`;
const VITE = "node_modules/vite/bin/vite.js";
const NO_SECRETS = { TMDB_READ_TOKEN: "", VITE_TMDB_READ_TOKEN: "", VITE_TMDB_API_URL: "", VITE_ANALYTICS_ENDPOINT: "" };

/**
 * Dos entornos, ninguno con secretos reales:
 * - local: sin TMDB ni Supabase (las variables vacías ganan a .env): recorrido determinista.
 * - rooms: Supabase de pruebas sobre PGlite con las migraciones reales (e2e/support/fake-supabase.mjs).
 */
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { locale: "es-CO", timezoneId: "America/Bogota", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  projects: [
    { name: "local", testIgnore: /duo-room|shared-plan|account-preferences|groups|partners|plus|auth-entry/, use: { baseURL: `http://localhost:${LOCAL}` } },
    { name: "accounts", testMatch: /duo-room|shared-plan|account-preferences|groups|partners|plus|auth-entry/, use: { baseURL: `http://localhost:${ROOMS}` } },
  ],
  webServer: [
    {
      command: `${NODE} ${VITE} preview --port ${LOCAL} --strictPort`,
      url: `http://localhost:${LOCAL}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { ...NO_SECRETS, VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" },
    },
    {
      command: `${NODE} e2e/support/fake-supabase.mjs node_modules/.cache/cinet-e2e-rooms`,
      url: `http://localhost:${ROOMS}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { ...NO_SECRETS, VITE_SUPABASE_URL: `http://localhost:${ROOMS}`, VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-publishable-key", FAKE_SUPABASE_PORT: String(ROOMS) },
    },
  ],
});

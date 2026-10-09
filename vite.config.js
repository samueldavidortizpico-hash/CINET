import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createTmdbProxy, nodeHandler } from "./server/tmdbProxy.js";

/*
 * GitHub Pages no conoce las rutas de React Router: al refrescar /movie/dune
 * responde con 404.html. Si 404.html es una copia de index.html, la SPA carga
 * igual y el router resuelve la ruta profunda.
 */
function spaFallback() {
  return {
    name: "spa-fallback-404",
    apply: "build",
    closeBundle() {
      const dist = resolve(import.meta.dirname, "dist");
      if (!existsSync(resolve(dist, "index.html"))) return; // el build falló antes: que se vea ese error
      copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
    },
  };
}

/**
 * /api/tmdb en `npm run dev` y `npm run preview`: el mismo proxy que la función de Vercel.
 * El token se lee aquí, en Node (TMDB_READ_TOKEN; en desarrollo acepta el antiguo VITE_TMDB_READ_TOKEN),
 * y nunca llega al bundle: el cliente solo conoce la ruta /api/tmdb.
 */
function tmdbDevProxy(token) {
  // Sin return: si configureServer devuelve una función, Vite la ejecuta como gancho posterior.
  const mount = (server) => {
    server.middlewares.use("/api/tmdb", nodeHandler(createTmdbProxy({ token })));
  };
  return { name: "tmdb-dev-proxy", configureServer: mount, configurePreviewServer: mount };
}

/** El build falla si un secreto del servidor aparece en el JavaScript o CSS generado. */
function secretGuard(secrets) {
  const values = secrets.filter((value) => value && value.length >= 12);
  return {
    name: "secret-guard",
    apply: "build",
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        const text = file.type === "chunk" ? file.code : typeof file.source === "string" ? file.source : "";
        if (values.some((value) => text.includes(value))) {
          this.error(`Un secreto del servidor apareció en ${file.fileName}. Revisa los usos de import.meta.env (src/utils/env.js).`);
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, ""); // "": también variables sin prefijo VITE_
  return {
    // Vercel sirve el sitio en la raíz; las rutas profundas las resuelve vercel.json.
    base: "/",
    plugins: [
      react(),
      spaFallback(),
      tmdbDevProxy(env.TMDB_READ_TOKEN || env.VITE_TMDB_READ_TOKEN),
      secretGuard([env.TMDB_READ_TOKEN, env.VITE_TMDB_READ_TOKEN, env.SUPABASE_SERVICE_ROLE_KEY, env.SUPABASE_SECRET_KEY]),
    ],
    // `npm run dev` / `npm run preview` abren el navegador directo en la URL correcta.
    server: { open: true },
    preview: { open: true },
  };
});

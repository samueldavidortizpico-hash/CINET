import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages publica el sitio en https://<org>.github.io/<repositorio>/
const REPO_NAME = "CINET";

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
      copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
    },
  };
}

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [react(), spaFallback()],
  // `npm run dev` / `npm run preview` abren el navegador directo en la URL correcta.
  server: { open: true },
  preview: { open: true },
});

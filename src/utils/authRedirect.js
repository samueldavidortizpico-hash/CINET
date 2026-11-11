/* =========================================================
   Destino después de autenticarse (invitación, plan, ruta protegida).
   - Solo rutas internas: nada de "//otro-dominio" ni URLs absolutas.
   - Las pantallas de acceso nunca son destino (evita bucles).
   - Si el registro pide confirmar el correo, el destino se guarda aquí
     para retomarlo cuando el enlace del correo abra la app (otra pestaña).
   ========================================================= */

import { readStorage, writeStorage } from "./storage.js";

const PENDING_KEY = "cinet-auth-next";
const AUTH_PATHS = new Set(["/", "/login", "/register", "/recuperar", "/nueva-contrasena"]);

// Origen ficticio solo para resolver la ruta como lo hace el navegador y ver si se queda en el sitio.
const PROBE_ORIGIN = "https://cinet.invalid";

/** Ruta interna segura o null. */
export function safeNext(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  // El navegador elimina tabulaciones y saltos de línea al analizar una URL: "/\t/evil.com" pasa a ser "//evil.com".
  // Enumerar caracteres siempre deja alguno fuera; la comprobación fiable es resolverla y exigir el mismo origen.
  try {
    if (new URL(path, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return null;
  } catch {
    return null;
  }
  // Y no se guarda nada con caracteres de control (se recorre en vez de usar una regex: ESLint prohíbe controles en ellas).
  for (const char of path) {
    const code = char.codePointAt(0);
    if (code <= 0x1f || code === 0x7f) return null;
  }
  const pathname = path.split(/[?#]/)[0];
  return AUTH_PATHS.has(pathname) ? null : path;
}

export const rememberNext = (path) => writeStorage(PENDING_KEY, safeNext(path));
export const pendingNext = () => safeNext(readStorage(PENDING_KEY, null));
export const clearPendingNext = () => writeStorage(PENDING_KEY, null);

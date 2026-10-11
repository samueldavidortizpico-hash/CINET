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

/** Ruta interna segura o null. */
export function safeNext(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  const pathname = path.split(/[?#]/)[0];
  return AUTH_PATHS.has(pathname) ? null : path;
}

export const rememberNext = (path) => writeStorage(PENDING_KEY, safeNext(path));
export const pendingNext = () => safeNext(readStorage(PENDING_KEY, null));
export const clearPendingNext = () => writeStorage(PENDING_KEY, null);

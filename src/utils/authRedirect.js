/* =========================================================
   Destino después de autenticarse (invitación, plan, ruta protegida).
   - Solo rutas internas: nada de "//otro-dominio" ni URLs absolutas.
   - Las pantallas de acceso nunca son destino (evita bucles).
   - Si el registro pide confirmar el correo, el destino se guarda aquí
     para retomarlo cuando el enlace del correo abra la app (otra pestaña).
   ========================================================= */

import { readStorage, writeStorage } from "./storage.js";

const PENDING_KEY = "cinet-auth-next";
const AUTH_PATHS = new Set(["/", "/login", "/register", "/registro", "/recuperar", "/nueva-contrasena"]);

/** Ruta interna segura o null. */
export function safeNext(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  if ([...path].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) return null;
  try {
    const url = new URL(path, "https://cinet.invalid");
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
    if (url.origin !== "https://cinet.invalid" || pathname.includes("\\") || pathname.startsWith("//") || AUTH_PATHS.has(pathname.toLowerCase())) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export const rememberNext = (path) => writeStorage(PENDING_KEY, safeNext(path));
export const pendingNext = () => safeNext(readStorage(PENDING_KEY, null));
export const clearPendingNext = () => writeStorage(PENDING_KEY, null);

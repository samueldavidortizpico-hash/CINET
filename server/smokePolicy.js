/* La URL del evento o la entrada manual no es una autoridad para recibir secretos. */
function httpsUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("URL de smoke no válida."); }
  if (url.protocol !== "https:" || url.hostname.includes("*") || url.username || url.password || url.search || url.hash) throw new Error("Smoke exige una URL HTTPS sin credenciales ni parámetros.");
  return url;
}

function trustedSet(raw) {
  let entries;
  try { entries = String(raw).trim().startsWith("[") ? JSON.parse(raw) : String(raw).split(",").filter((item) => item.trim()); } catch { throw new Error("SMOKE_TRUSTED_ORIGINS no es válido."); }
  if (!Array.isArray(entries) || entries.some((item) => typeof item !== "string")) throw new Error("SMOKE_TRUSTED_ORIGINS exige orígenes explícitos.");
  return new Set(entries.map((entry) => {
    const url = httpsUrl(entry.trim());
    if (url.pathname !== "/") throw new Error("La lista de confianza solo admite orígenes sin rutas.");
    return url.origin;
  }));
}

export function createSmokePolicy({ url, bypass = "", trustedOrigins = "" }) {
  const base = httpsUrl(url);
  const trusted = trustedSet(trustedOrigins);
  if (bypass && !trusted.has(base.origin)) throw new Error("El destino de smoke no está en SMOKE_TRUSTED_ORIGINS. No se enviará el secreto.");
  return {
    base,
    headersFor(target) {
      const destination = new URL(target, base);
      // Incluye HTTP en la prueba de redirección, pero jamás el secreto en esa petición.
      return bypass && destination.protocol === "https:" && !destination.username && !destination.password && trusted.has(destination.origin)
        ? { "x-vercel-protection-bypass": bypass }
        : {};
    },
  };
}

/** URL absoluta de una ruta de la app (respeta el base de GitHub Pages). */
export function appUrl(path) {
  return new URL(`${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`, window.location.origin).href;
}

/**
 * Comparte con la hoja nativa del sistema o, si no existe, copia al portapapeles.
 * @returns {Promise<"shared" | "copied" | "cancelled" | "failed">}
 */
export async function shareOrCopy({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch {
      return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText([text, url].filter(Boolean).join("\n\n"));
    return "copied";
  } catch {
    return "failed";
  }
}

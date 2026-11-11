/* =========================================================
   URLs que vienen de la base de datos (p. ej. el sitio oficial que declara un aliado).

   La restricción SQL solo exige que empiecen por https://; el analizador de URL del navegador es más
   estricto. Una fila que pase la base pero no `new URL()` lanzaba una excepción durante el render y dejaba
   inservible la página que la mostraba (la cola de /admin, por ejemplo). Estas funciones NUNCA lanzan.
   ========================================================= */

function parseHttps(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname ? url : null;
  } catch {
    return null;
  }
}

/** Hostname de una URL https válida, o null. */
export function safeHostname(value) {
  return parseHttps(value)?.hostname ?? null;
}

/**
 * href seguro para un <a>: solo https y sin usuario:clave embebidos
 * (https://banco.com@sitio-malo.example muestra un nombre y lleva a otro). O null.
 */
export function safeHttpsUrl(value) {
  const url = parseHttps(value);
  return url && !url.username && !url.password ? url.href : null;
}

const withoutWww = (host) => host.replace(/^www\./, "");

/**
 * La cadena de cine conocida a la que pertenece una URL, o null. Compara el dominio EXACTO (sin «www.»):
 * `cinecolombia.com.sitio-falso.example` o `https://cinecolombia.com@sitio-falso.example` no cuentan.
 * `chains` es una lista de { url, ... } (p. ej. CINEMA_CHAINS); así la función sigue siendo pura.
 */
export function officialChainFor(value, chains) {
  const href = safeHttpsUrl(value);
  const host = href && safeHostname(href);
  if (!host) return null;
  return chains.find((chain) => {
    const chainHost = safeHostname(chain.url);
    return chainHost !== null && withoutWww(chainHost) === withoutWww(host);
  }) ?? null;
}

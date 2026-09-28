/* Plataformas de streaming del selector "Ver película" y de Duo.
   Para activar una: status "available" + url real. La interfaz se adapta sola.
   tmdbIds: ids de proveedor en TMDB (/watch/providers): suscripción, variantes con anuncios
   canales de la marca dentro de Amazon/Apple y su tienda de alquiler/compra
   (Amazon Video 10, Apple TV Store 2). Verificados con /watch/providers?watch_region=CO. */

export const PLATFORMS = [
  { id: "netflix", name: "Netflix", status: "coming-soon", url: null, brand: "#E50914", tmdbIds: [8, 1796] },
  { id: "disney", name: "Disney+", status: "coming-soon", url: null, brand: "#2187D9", tmdbIds: [337] },
  { id: "prime", name: "Prime Video", status: "coming-soon", url: null, brand: "#00A8E1", tmdbIds: [119, 9, 10] },
  { id: "max", name: "HBO Max", status: "coming-soon", url: null, brand: "#002BE7", tmdbIds: [1899, 384, 1825] },
  { id: "appletv", name: "Apple TV+", status: "coming-soon", url: null, brand: "#c8c8c8", tmdbIds: [350, 2, 2243] },
  { id: "paramount", name: "Paramount+", status: "coming-soon", url: null, brand: "#0064FF", tmdbIds: [531, 582, 1853] },
  { id: "mgm", name: "MGM+", status: "coming-soon", url: null, brand: "#C5A028", tmdbIds: [34, 2141, 2142] },
  { id: "crunchyroll", name: "Crunchyroll", status: "coming-soon", url: null, brand: "#F47521", tmdbIds: [283, 1968] },
];

/** Tipos de oferta de /watch/providers (getTitleWatchProviders → offers). */
export const OFFER_TYPES = [
  ["subscription", "Streaming"],
  ["free", "Gratis"],
  ["rent", "Alquiler"],
  ["buy", "Compra"],
];

export const STATUS_LABELS = {
  available: "Disponible",
  "coming-soon": "Próximamente",
  unavailable: "No disponible",
};

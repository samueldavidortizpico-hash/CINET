/* =========================================================
   Service worker de CINET: abre la app sin conexión y acelera lo estático.
   Guarda SOLO archivos públicos del propio sitio: el index.html del build,
   /assets (con hash), /images, iconos y manifest. Nunca guarda /api, Supabase
   (auth, datos, realtime), TMDB ni otros dominios: lo privado no toca la caché.
   Las páginas siempre van primero a la red; sin red, se usa el app shell.
   VERSION la escribe el build (vite.config.js, swVersion) para invalidar cachés viejas.
   ========================================================= */

const VERSION = "__CINET_BUILD__";
const CACHE = `cinet-${VERSION}`;
const SHELL = new URL("index.html", self.registration.scope).href;
const STATIC = /\/(assets|images)\/|\/(favicon\.svg|manifest\.webmanifest|icon-[\w-]+\.png|og-cinet\.png)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(SHELL, { cache: "reload" }))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("cinet-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Red primero; la respuesta de una página (con metadatos de un plan o invitación) no se guarda.
    event.respondWith(fetch(request).catch(() => caches.match(SHELL)));
    return;
  }
  if (!STATIC.test(url.pathname)) return;

  // Archivos con hash o públicos: caché primero; si no está, red y se guarda.
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
      }
      return response;
    })),
  );
});

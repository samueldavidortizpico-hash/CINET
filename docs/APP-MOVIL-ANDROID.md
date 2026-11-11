# CINET en el celular: PWA hoy, Android con Capacitor después

Preparado el 10 de octubre de 2026. **No se instaló Capacitor, no se generó APK ni se publicó en tiendas**: este documento deja verificado lo que existe y el orden exacto para el siguiente paso, reutilizando el build de React/Vite sin reescribir la app.

## 1. Lo que ya existe (verificado en el código y con E2E local)

| Pieza | Estado | Evidencia |
| --- | --- | --- |
| Manifest instalable | `public/manifest.webmanifest`: nombre, `display: standalone`, colores, `start_url` y `scope` | `index.html` lo enlaza; `apple-touch-icon` incluido |
| Iconos | 192, 512 y 512 *maskable* | `public/icon-*.png` |
| Shell offline | `public/sw.js`, solo en producción; guarda archivos públicos del propio sitio y **nunca** `/api`, Supabase, TMDB ni páginas de planes | E2E `plan-journey.spec.js` («sin conexión CINET abre desde la caché…»); al cerrar sesión se borran las cachés `cinet-*` |
| Instalar como opción | `useInstallPrompt` (evento `beforeinstallprompt`): botón «Instalar CINET en este dispositivo» **después de elegir** en Duo; en iOS no aparece (no se finge) | No probado en un teléfono real |
| Acciones sin red | El aviso de «sin conexión» existe; no hay cola de acciones offline: **nada se presenta como sincronizado** si no lo está | Votos y sesión de Duo son locales por diseño; salas, planes de cuenta e invitaciones requieren red |

## 2. Por qué Capacitor y no reescribir

Capacitor empaqueta el mismo `dist/` de Vite dentro de una app Android y da acceso a capacidades del dispositivo (botón atrás, enlaces, compartir nativo). Mantiene React, React Router, Supabase y el proxy TMDB en el servidor. Una interfaz nativa aparte solo se justificaría si aparecen necesidades que esto no resuelve.

## 3. Bloqueos a resolver ANTES de empaquetar

1. **Backend HTTPS absoluto.** Dentro de la app no hay origen web propio: `/api/tmdb` relativo no llega al servidor. Construir con `VITE_TMDB_API_URL=https://<dominio-de-producción>/api/tmdb` (el cliente ya lo admite: `src/utils/env.js`, `tmdbClient.js`) y permitir el origen de la app (`https://localhost` en Android) en CORS del proxy (`server/tmdbProxy.js`, `api/tmdb.js`), sin abrirlo a cualquier origen.
2. **Enlaces de invitación.** `appUrl()` (`src/utils/share.js:3`) usa `window.location.origin`: en la app sería `https://localhost` y las invitaciones, salas y grupos compartidos quedarían rotos. Cambiarlo a un origen público configurado (`VITE_PUBLIC_ORIGIN`, el mismo de `APP_ORIGIN` del servidor) y configurar **Android App Links** (`/.well-known/assetlinks.json` en el dominio) para que `/invite/:token`, `/duo/sala/:code` y `/grupos/unirse/:token` abran la app si está instalada y la web si no.
3. **Autenticación.** `emailRedirectTo` (`src/services/authService.js:58`) también usa `window.location.origin`. Usar el origen público + App Links y añadir esas URL a *Redirect URLs* de Supabase Auth. Comprobar que la sesión persiste al cerrar y abrir la app, y que «Cerrar sesión» borra cachés y estado local como en la web.
4. **Service worker.** No registrarlo dentro de la app nativa (los archivos ya van empaquetados); mantenerlo en la web.
5. **Botón atrás y teclado.** Con `@capacitor/app`, el botón atrás debe cerrar diálogos (ronda de Duo, historial) antes de navegar; revisar que el teclado no tape los campos (nombre, hora, código de sala).
6. **Pruebas en dispositivos reales:** una gama baja y una actual; red lenta; recargar a mitad de una ronda; abrir una invitación con la app instalada y sin ella.

## 4. Pasos (para cuando se autorice; no ejecutados)

```bash
npm install @capacitor/core @capacitor/android @capacitor/app
npm install -D @capacitor/cli
npx cap init CINET <id-de-paquete> --web-dir=dist
npx cap add android
npm run build && npx cap sync android
npx cap open android   # Android Studio: ejecutar en dispositivo
```

Comprobar antes de añadir dependencias que las versiones sean compatibles con Vite 8 y React 19, y medir el tamaño del APK.

## 5. Publicación (requiere decisión y cuentas de la persona responsable)

- Google Play: registro de desarrollador con pago único de US$25 más verificación de identidad (según la fuente oficial citada en la propuesta; verificar al registrarse). Ficha, política de privacidad, clasificación de contenido y prueba cerrada antes de producción.
- iOS después: requiere macOS y Xcode (o compilación en la nube) y Apple Developer (US$99/año según la fuente citada). Safari no ofrece `beforeinstallprompt`: en iOS la PWA se instala desde «Compartir → Añadir a pantalla de inicio».
- Cobros dentro de la app: una suscripción digital (Plus) sigue las reglas de pago de cada tienda; una entrada de cine física no. Nada de cobros está activado (ver `COSTOS-Y-MERCADO.md`).
- Licencia de datos: el uso comercial de TMDB requiere acuerdo; para producción está decidido pasar a una API de pago. Publicar en tiendas no acredita ninguna licencia.

## 6. Orden recomendado

PWA instalable (hecho) → piloto con grupos reales y dos ocasiones → resolver §3 → Android con Capacitor en prueba cerrada → iOS.

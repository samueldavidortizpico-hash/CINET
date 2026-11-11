# Rendimiento CINET — seguimiento 2026-11-05

## Línea base y resultado local

Build de producción completado localmente. JS principal: 306.75 kB (98.65 kB gzip); CSS: 254.98 kB (47.19 kB gzip). La referencia previa de esta misma pasada fue JS 304.65 kB (97.72 kB gzip) y CSS 254.98 kB (47.19 kB gzip). La diferencia del JS es +2.10 kB sin atribución aislada entre cambios de código y actualización de dependencias.

No se midieron tiempos por ruta, Core Web Vitals, red móvil, consumo de memoria ni dispositivos. Por ello no se declara mejora de rendimiento global.

## Controles añadidos

- TMDB cache con máximo de 200 entradas.
- Cola de trabajo con límite de 100.
- Cache offline acotada por TTL de 30 días y máximo 100 entradas.
- Búsqueda evita aplicar respuestas viejas al estado de consulta actual.

## Medición pendiente

Capturar misma versión/build en runner y navegador de referencia: tamaño comprimido por chunk, solicitudes por flujo, tiempo a resultados, memoria después de búsquedas repetidas, cola bajo ráfaga, ruta inicial y Duo. Establecer presupuestos solo tras baseline comparable. No se midió dispositivo Android físico.
# Seguimiento de rendimiento — 2026-11-05

- `npm run build` local PASS en 1.78 s durante esta observación (240 módulos). No es medición de Core Web Vitals ni perfil en dispositivo.
- La prueba unitaria de cuota procesó 10,001 IP sintéticas en ~1.44 s; mide el algoritmo en proceso, no latencia/escala de Upstash ni concurrencia distribuida.
- El script E2E construye dos bundles Vite; se corrigió para configurar solo rooms con Supabase fake. El runner de prueba no cerró naturalmente durante esta sesión y no se puede reportar duración E2E estable.
- No se ejecutó PostgreSQL real, CI Linux, carga HTTP, medición de memoria ni navegador móvil.

## Cierre de mediciones

El build final repitió correctamente en clon limpio; la suite Playwright recorrió 30 escenarios y omitió 3 capturas. No se midió carga, navegador móvil, CI Linux ni PostgreSQL real; no extrapolar los tiempos unitarios a producción.
- Validación Android: sync PASS; assembleDebug BLOCKED antes de compilar por SDK no configurado.

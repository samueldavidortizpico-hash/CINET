# Analítica de producto de CINET

Contrato de medición implementado en `src/services/analytics.js` (pruebas: `src/services/analytics.test.js`).

## Principios

- **Sin endpoint no se mide nada.** Si `VITE_ANALYTICS_ENDPOINT` está vacío, `track()` no envía nada, no se muestra el aviso y no se simulan métricas.
- **Con endpoint, solo con consentimiento.** La primera visita muestra un aviso ("Aceptar" / "No, gracias"). En el pie hay un botón para cambiar de opinión en cualquier momento.
- **Retirar el consentimiento** borra de inmediato el identificador anónimo de ese navegador (`cinet-analytics-id`); los eventos siguientes no se envían.
- **Lista cerrada.** Solo se envían los eventos y propiedades de la tabla; cualquier otro nombre o propiedad se descarta en el cliente (`sanitize`). Los valores solo pueden ser booleanos, números o textos cortos.
- **Nunca se envía:** email, nombre visible, id de cuenta, tokens o enlaces de invitación, títulos o géneros elegidos, gustos, votos individuales ni texto libre.

## Eventos

| Evento | Propiedades | Cuándo |
|---|---|---|
| `duo_started` | `group_size`, `mode` | Se crea una sesión nueva de Duo |
| `preferences_completed` | `group_size` | Se llega a resultados tras completar los gustos de todas las personas |
| `calibration_completed` | `answers` (cuántas respuestas, nunca cuáles) | Se llega a resultados con películas de calibración respondidas |
| `shortlist_shown` | `finalists` (0–3) | Se fijan las finalistas de una tanda |
| `title_chosen` | `group_size`, `source` (`card` en un teléfono, `round` al cerrar una ronda) | Se elige el título final en Duo |
| `plan_created` | `mode` (`cinema`/`home`), `shared` (cuenta o local) | Se crea un plan |
| `invite_created` | — | Quien organiza crea un enlace de invitación |
| `invite_accepted` | — | Alguien se une a un plan con un enlace |
| `rsvp_changed` | `rsvp` (`yes`/`maybe`/`no`) | Cambia una confirmación |
| `official_booking_clicked` | `chain` (id de cadena) | Se abre el sitio oficial de una cadena de cine |
| `room_joined` | — | Alguien se une a una sala de Duo con el código |
| `round_started` | `group_size`, `candidates` | El anfitrión abre una ronda de votación |
| `round_completed` | `group_size`, `result` (`match`/`top`/`none` cuando cierra el anfitrión) | Se cierra una ronda (lo envía solo quien la cerró) |
| `partner_listing_clicked` | `kind` (`showtime`/`event`) | Se abre la compra oficial de un aliado (un clic no es una venta) |
| `sponsored_offer_clicked` | — | Se abre una oferta marcada «Patrocinado» |
| `plus_price_answer` | `price_cop`, `answer` (`interested`/`too_expensive`) | Respuesta a la prueba de precio de `/plus` (no es una compra ni una suscripción) |
| `plus_sandbox_started` | — | Alguien activa la prueba de Plus (sandbox, sin cobro) |
| `plan_completed_reported` | — | Primera respuesta voluntaria a «¿La vieron?» después de la fecha del plan (autoinforme, no asistencia verificada) |

## Envío

`POST` JSON a `VITE_ANALYTICS_ENDPOINT` (con `navigator.sendBeacon` y respaldo `fetch keepalive`):

```json
{ "event": "plan_created", "props": { "mode": "cinema", "shared": true }, "anonymous_id": "uuid-aleatorio", "at": "2026-10-09T20:30:00.000Z" }
```

El endpoint debe aceptar CORS desde el dominio de la app y no debe guardar la IP completa ni el user-agent completo.

## Retención y borrado (política propuesta, la confirma quien opere el servicio)

- Eventos crudos: 13 meses; después solo agregados (conteos por día y evento).
- Borrado: al retirar el consentimiento el id local se elimina y los eventos anteriores ya no pueden asociarse a ese navegador. Pendiente: mostrar el `anonymous_id` en el perfil para poder pedir el borrado de los eventos ya enviados.
- No se cruzan los eventos con cuentas de Supabase.

## Métricas que permite

- Activación de Duo: `duo_started` → `preferences_completed` → `title_chosen`.
- Viralidad de planes: `plan_created (shared)` → `invite_created` → `invite_accepted` → `rsvp_changed`.
- Intención de compra: `official_booking_clicked` por cadena (base para conversaciones con cines; no es atribución de venta).

## Estado

- Verificado localmente: contrato, saneamiento, consentimiento y no-envío sin endpoint (pruebas unitarias).
- Pendiente: elegir y desplegar el endpoint (proveedor o función propia), y aplicar la política de retención en el servidor.

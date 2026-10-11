# Costos y salida al mercado — documento de preparación

> **Estado: PREPARACIÓN.** Ningún precio, licencia, SLA, certificación ni alianza de este documento está
> confirmado. Donde dice «por cotizar» o «[por definir]» no hay cifra porque no la tenemos. Las decisiones de
> negocio y la revisión legal son de personas, no de este repositorio.

## 1. Qué usa CINET hoy (verificado en el código)

| Pieza | Para qué | Estado | Costo |
|---|---|---|---|
| **TMDB API** | Catálogo, pósters, búsqueda, proveedores, certificaciones | Token de desarrollo, solo en servidor (`/api/tmdb`) | Uso comercial: **requiere acuerdo con TMDB; por cotizar** |
| **Supabase** | Auth (incl. anónima), Postgres con RLS, Realtime, Storage (avatares) | Proyecto creado; migraciones de esta fase **sin aplicar** | Según plan elegido; **por cotizar** con el uso real |
| **Vercel** | Sitio estático + funciones (`/api/tmdb`, `/api/og`, webhooks) | Configurado (`vercel.json`) | Según plan y uso; **por cotizar** |
| **Google Fonts** | Inter y Outfit | En uso | Sin costo directo; revisar privacidad (carga desde Google) |
| **Pasarela de pagos** | Cobro de Plus | **No hay ninguna conectada** | Comisión por transacción: **por cotizar** |
| **Analítica** | Embudo con consentimiento (`docs/ANALITICA.md`) | Sin proveedor; endpoint por configurar | Depende del proveedor elegido |

### TMDB (bloqueante para lanzar)

- El desarrollo usa la API de TMDB; para producción se planea pasar a una API de pago (decisión ya tomada).
- Antes de lanzar: confirmar con TMDB (o el proveedor que lo reemplace) las condiciones de uso comercial, cuota,
  caché permitida, atribución y redistribución. Hasta entonces, el respaldo `npm run catalog:snapshot` es solo
  para continuidad interna y no se publica.
- La atribución «This product uses the TMDB API but is not endorsed or certified by TMDB.» debe seguir visible
  mientras se use TMDB.
- Cambiar de proveedor toca `server/tmdbProxy.js` (lista de rutas permitidas) y `src/services/tmdbClient.js`.

### Pasarela de pagos (antes de cobrar Plus)

Candidatas a evaluar en Colombia (sin preferencia ni contacto hecho): Wompi, Mercado Pago, PayU, ePayco.
Criterios: suscripciones recurrentes, PSE y tarjetas, webhooks firmados, manejo de reembolsos y contracargos,
facturación electrónica, comisión y tiempos de desembolso. El adaptador elegido debe traducir sus eventos al
contrato normalizado de `server/billingWebhook.js`; la lógica de derechos ya está en la base.

## 2. Modelo de ingresos (hipótesis a validar)

| Fuente | Estado | Qué falta |
|---|---|---|
| **CINET Plus** (organizador): noche fija hoy; coorganizar y personalización en diseño | Sandbox sin cobro (`/plus`) | Pasarela, términos, impuestos, política de cancelación y reembolso |
| **Precio de Plus** | COP 9.900/mes es **hipótesis**; se mide con la prueba de precio de `/plus` (`plus_price_answer`) | Suficientes respuestas con consentimiento; entrevistas |
| **Comisión de boletas** con cines aliados | Webhook de ventas confirmadas listo (`/api/partner-webhook`) | Convenio firmado (ver `docs/PILOTO-CINES.md`) |
| **Ofertas patrocinadas** de aliados | Bloque «Patrocinado» separado del ranking | Política comercial y de publicidad revisada |
| **Comida / combos** | Solo enlace oficial del cine | Acuerdo; no se muestra integración inexistente |
| **Reportes de tendencias** | Backlog | Demanda real, anonimización revisada y consentimiento; nunca perfiles individuales |

Lo gratuito no cambia con Plus: Duo de 1 a 8, salas, invitaciones, votación, modo familia, grupos y repetir
a mano.

### Duo: lo gratuito y lo que Plus podría ofrecer (propuesta del 2026-10-10, nada activado)

| Siempre gratis | Candidato a Plus (EN DISEÑO, validar antes de construir o cobrar) | Por qué lo pagaría quien organiza |
| --- | --- | --- |
| Decidir con 1–8 personas, calibración por películas, finalistas, ronda y sala | Grupos recurrentes con Duo precargado y «Repetir la noche» automática | Ahorra rearmar la configuración cada semana |
| Límites, veto, modo familia y todas las restricciones de seguridad | Colecciones del grupo (pendientes, ciclos temáticos) | Organiza una temporada, no una noche |
| Invitar, confirmar, calendario `.ics` y encuesta de horarios | Personalización de invitaciones y del recuerdo de la noche | Presentación cuidada para ocasiones especiales |
| Feedback «¿La vieron?» y recuerdo propio | Historial privado de noches con valoraciones | Memoria del grupo |

No se cobra por votar, invitar, por más personas dentro de 1–8 ni por seguridad. Ninguna función «EN DISEÑO»
se anuncia como disponible. La prueba de precio y las entrevistas del piloto deciden qué existe.

**Costo de una búsqueda de Duo:** ahora se mide en la propia pantalla («Cómo buscamos»: títulos revisados,
detalle comprobado, consultas nuevas y reutilizadas, tiempo). Presupuesto de diseño: hasta 40 títulos con
detalle (≈80 consultas) más las páginas de discover, en tandas que se detienen al tener 12 válidos. **Falta
la línea base con TMDB real** para convertirlo en costo por sesión y por mes; no hay cifra inventada.

## 3. Costos operativos a estimar (sin cifras inventadas)

| Rubro | Cómo estimarlo |
|---|---|
| Base de datos y Auth | Usuarios activos mensuales, planes y salas por semana, tamaño de avatares |
| Realtime | Salas simultáneas × personas × minutos; planes abiertos al mismo tiempo |
| Funciones serverless | Peticiones a `/api/tmdb` (ya con caché en CDN por tipo de dato, `s-maxage` en `server/tmdbProxy.js`) y `/api/og` |
| Catálogo | Llamadas a la API de pago elegida según su tarifa |
| Soporte | Canal, horario y responsable; no prometer tiempos de respuesta sin equipo |
| Moderación | Nombres de grupos/planes y fichas de aliados (verificación manual en `/admin`) |
| Legal y contable | Términos, privacidad, facturación electrónica, impuestos de suscripciones digitales |

## 4. Obligaciones antes de abrir al público (por revisar con asesoría legal)

- **Datos personales (Colombia, Ley 1581 de 2012 y normas relacionadas):** política de tratamiento, aviso de
  privacidad, autorización, derechos de las personas (consulta, corrección, supresión), encargados (Supabase,
  Vercel, proveedor de analítica) y transferencias internacionales. La app ya permite borrar gustos guardados y
  pide consentimiento para analítica; eso no equivale a cumplimiento.
- **Menores:** el modo familia filtra por certificación; no es control parental ni verificación de edad.
- **Consumo y suscripciones:** información previa del precio, renovación, cancelación y derecho de retracto
  cuando aplique. No habilitar pruebas gratuitas que se conviertan en cobro sin definición autorizada.
- **Publicidad:** etiquetado de contenido patrocinado (ya implementado como «Patrocinado»).
- **Marcas:** CINET no usa marcas de cines ni plataformas como aval; los logos de plataformas se muestran solo
  para indicar disponibilidad informada por el catálogo.

## 5. Salida al mercado (borrador)

1. **Producto listo para piloto:** aplicar migraciones en Supabase, habilitar Auth anónima, configurar variables
   de servidor en Vercel, rotar el token de TMDB expuesto y probar Realtime con dos teléfonos reales.
2. **Piloto cerrado (4–6 semanas):** grupos de amigos y familias en una ciudad; medir decisión en Duo,
   planes confirmados y repetición a 14 días (ver hipótesis en `docs/PILOTO-CINES.md`).
3. **Piloto con una sede de cine:** solo con convenio firmado; cartelera publicada por el cine.
4. **Plus:** activar el sandbox para el grupo piloto; con la prueba de precio y entrevistas, decidir precio y
   pasarela; luego términos y cobro real.
5. **Canales:** invitaciones (cada plan trae gente nueva), salas compartidas, enlaces con vista previa (OG).

## 6. Decisiones pendientes (de negocio)

- Proveedor de catálogo de pago y su contrato.
- Pasarela y condiciones de Plus (precio, impuestos, cancelación, reembolsos).
- Responsable de tratamiento de datos y canal de atención.
- Ciudad y grupos del piloto; cine aliado (si lo hay).

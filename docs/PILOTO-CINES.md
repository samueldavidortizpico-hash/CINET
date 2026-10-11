# Piloto con cines — documento de preparación

> **Estado: PREPARACIÓN.** No hay convenio, acuerdo ni contacto con ningún cine. Este documento es un borrador
> para revisión humana (negocio y legal) antes de cualquier conversación. Nada aquí es un contrato aprobado.

## 1. Propuesta de valor para el cine

CINET resuelve el paso que hoy se pierde entre «¿vamos a cine?» y la compra: un grupo elige película (Duo o una
sala desde cada teléfono), arma el plan, confirma quién va y entonces compra en el sitio oficial del cine.

Para una sede piloto eso significa:

- **Demanda de grupo antes de la compra:** planes con personas confirmadas para una función o un día.
- **Su cartelera donde se decide:** funciones publicadas por el propio cine aparecen en la ficha del título con su
  nombre como fuente y su enlace oficial de compra. CINET no vende boletas ni promete cupos.
- **Medición separada y honesta:** impresiones, clics a su sitio, planes creados y ventas confirmadas por el cine son
  eventos distintos. Un clic nunca se cuenta como venta.

## 2. Alcance del piloto (propuesto)

- **Una sede**, una ciudad, 6 semanas.
- **Datos que aporta el cine:** funciones (título, sala/formato, idioma, hora con zona, precio si lo quiere publicar,
  enlace de compra). Se cargan en el panel `/aliados` (fuente «manual», con autor y hora) o, si el cine lo prefiere,
  por un adaptador de su API en una segunda fase.
- **Opcional:** confirmación de ventas atribuidas por webhook firmado (`/api/partner-webhook`), con un código de plan
  que la persona usa al comprar. Sin esa confirmación no hay venta ni comisión.

## 3. Lo que ya está construido (verificado localmente, no desplegado)

| Pieza | Dónde | Garantía |
|---|---|---|
| Solicitud y verificación de aliados | `/aliados`, `/admin`, `request_organization`, `verify_organization` | Verificar solo habilita publicar; un operador decide |
| Sedes, funciones, eventos y ofertas | `venues`, `listings`, `offers` (RLS por organización) | Un aliado no ve ni modifica lo de otro |
| Auditoría | `org_audit` (trigger) | Quién publicó, cambió o canceló, y cuándo |
| Cartelera pública | `/cine/:id` (`showtimeService`) | Solo funciones futuras, vigentes y no canceladas, con fuente y actualización |
| Ofertas patrocinadas | `offers` | Etiqueta «Patrocinado», bloque aparte, no tocan el ranking |
| Ventas confirmadas | `server/partnerWebhook.js`, `attribution_events` | HMAC por aliado, ventana de 5 min, idempotente, reembolsos anulan comisión |

Pendiente para producción: aplicar migraciones en Supabase, configurar `SUPABASE_SERVICE_ROLE_KEY` y
`PARTNER_WEBHOOK_SECRETS` en el servidor, y probar el webhook desplegado con el cine.

## 4. Reglas de medición (propuestas)

| Evento | Qué es | Qué NO es |
|---|---|---|
| Impresión | La función se mostró en una ficha | Interés confirmado |
| Clic a compra oficial (`partner_listing_clicked`) | Alguien abrió el sitio del cine | Una venta |
| Plan creado con esa función/película | Intención de grupo | Asistencia |
| Venta confirmada (`sale_confirmed` por webhook) | El cine confirma una compra atribuida | — |
| Reembolso (`sale_refunded`) | Anula la venta original para comisión | — |

Las cifras de analítica requieren consentimiento de la persona (ver `docs/ANALITICA.md`); las ventas las aporta el
cine. Hipótesis a validar (no promesas): ≥ 10 % de planes de cine terminan en clic al sitio oficial; ≥ 30 % de grupos
repiten en 14 días.

## 5. Guía de entrevista (30 min, antes de proponer nada)

1. ¿Cómo deciden hoy los grupos qué ver y cuándo? ¿Qué parte se les pierde?
2. ¿Qué datos de funciones pueden compartir y con qué frecuencia se actualizan?
3. ¿Les interesa recibir demanda de grupo (planes con personas confirmadas)? ¿En qué formato?
4. ¿Cómo atribuirían una compra a CINET (código de plan, cupón, enlace con parámetro)?
5. ¿Quién sería responsable de cargar y corregir funciones?
6. ¿Qué no debería hacer CINET nunca con su marca o sus datos?

## 6. Responsabilidades (borrador)

- **Cine:** exactitud de horarios, precios y enlaces que publica; cancelar funciones que no van; custodiar su secreto
  de webhook.
- **CINET:** mostrar solo lo publicado y vigente, con fuente; no afirmar disponibilidad; proteger datos de las
  personas; no vender perfiles individuales; auditoría disponible para el cine.
- **Ambos:** acordar por escrito la tasa de comisión (si la hay), el tratamiento de reembolsos y la duración.

## 7. Borrador de acuerdo — SOLO PARA REVISIÓN HUMANA

- Objeto: piloto de 6 semanas de publicación de cartelera y medición de demanda de grupo.
- Sin exclusividad. Sin costo para el cine durante el piloto (a confirmar por negocio).
- Comisión: [por definir] sobre ventas confirmadas por el cine vía webhook, descontando reembolsos.
- Datos: el cine recibe métricas agregadas; nunca datos personales de quienes usan CINET sin base legal y
  consentimiento.
- Salida: cualquiera de las partes puede terminar el piloto con aviso; CINET retira la cartelera del cine.
- Revisión legal obligatoria (protección de datos, consumidor, publicidad) antes de firmar.

## 8. Clubes y eventos

Organizadores verificados pueden publicar **eventos** (`listings.kind = 'event'`) con la misma vigencia, fuente y
auditoría. Una ficha publicada no concede derechos de exhibición: proyecciones públicas y eventos tienen requisitos
propios (licencias, aforo, permisos) que resuelve cada organizador.

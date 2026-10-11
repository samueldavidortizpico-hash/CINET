# Legal y privacidad — decisiones pendientes (documento interno)

Fecha: 2026-10-11 · Estado: **borradores, sin revisión jurídica**.
Textos publicados en `/legal` desde `src/data/legal.js`. Cada página muestra «Borrador en revisión: todavía no tiene
aprobación jurídica» y la fecha de actualización (`LEGAL_UPDATED`). Este documento no es asesoría legal.

## Cómo se redactaron

Solo se describe lo que el código hace hoy. Fuentes revisadas:

| Tema | Evidencia en el repositorio |
|---|---|
| Cuentas, invitados | `src/services/authService.js` (Supabase Auth, `signInAnonymously`), `supabase/config.toml` (`enable_anonymous_sign_ins = false` en local) |
| Perfil y rol | `supabase/migrations/20260929024739_create_profiles.sql` (rol solo desde SQL; `on delete cascade`) |
| Foto de perfil pública | `supabase/AVATARS.md` («El bucket debe seguir público») |
| Gustos privados, exportar/borrar | `20261011120000_user_preferences.sql`, `src/services/preferencesRepository.js`, `PreferencesPanel.jsx` |
| Planes, invitaciones, salir del plan | `20261009120000_shared_plans.sql` (`leave_plan`), `PlanPage.jsx` («Salir del plan») |
| Votos de salas | `20261010120000_duo_rooms.sql` (cada quien lee solo sus votos; gustos al anfitrión sin nombres) |
| Grupos | `20261012120000_groups.sql`, `GroupsPage.jsx` («Salir del grupo») |
| Encuesta de horarios | `20261013120000_plan_time_poll.sql` (votos visibles para el plan) |
| Aliados y ventas atribuidas | `20261014120000_partners.sql` (`attribution_events`: importe y referencia, sin datos de pago) |
| Cobros | `20261015120000_plus_sandbox.sql` y `api/billing-webhook.js`: **no hay pasarela**, sandbox apagado por defecto |
| Medición | `src/services/analytics.js`, `docs/ANALITICA.md` (solo con endpoint y consentimiento) |
| Navegador | claves `cinehub-*` / `cinet-*` en `src/hooks` y `src/services` (favoritas, Duo, planes locales, tema…) |
| Proveedores | Supabase, Vercel (`api/`), TMDB (proxy `api/tmdb.js`; imágenes directas de `image.tmdb.org`), YouTube (`TrailerModal.jsx`), Google Fonts (`index.html`) |
| Modo familia | `src/data/duo.js` (`FAMILY_LEVELS`: filtro por certificación de TMDB) |

## Decisiones que necesitan una persona responsable

1. **Responsable del tratamiento**: nombre o razón social, identificación, domicilio. Hoy solo consta «proyecto
   académico de la Universidad de La Sabana».
2. **Canal de contacto** para soporte y solicitudes de datos (correo o formulario real) y plazo de respuesta.
3. **Marco aplicable**: confirmar con asesoría jurídica la normativa de protección de datos y de consumo que aplica
   (en Colombia, por ejemplo, el régimen de habeas data y el Estatuto del Consumidor) y si hace falta autorización
   expresa para el tratamiento. No se verificaron fuentes oficiales en esta intervención; por eso los borradores no
   citan artículos ni plazos.
4. **Edad mínima** para crear cuenta y tratamiento de datos de menores.
5. **Conservación**: plazos para cuentas inactivas, planes pasados, salas cerradas, registros técnicos y eventos de
   medición (la propuesta de 13 meses de `docs/ANALITICA.md` no está aprobada).
6. **Borrado y exportación completos**: hoy no hay botón para borrar la cuenta ni exportar todo. Decidir si se
   implementa autoservicio o un procedimiento manual (borrar en Supabase Auth elimina el perfil por cascada; revisar
   qué ocurre con planes que la persona organiza).
7. **Suspensión de cuentas**: criterios y procedimiento (no existe hoy).
8. **Transferencias internacionales y región** de Supabase y Vercel.
9. **Avisos de cambios** a los términos para quienes ya tienen cuenta.
10. **Foto de perfil pública**: decidir si se mantiene el bucket público o se pasa a URLs firmadas.
11. **Invitados anónimos**: si se habilitan en producción, revisar el texto (hoy dice «si el servicio lo habilita»).

## Cobros: qué falta antes de activar pagos

No hay cobros activos (verificado: sin pasarela, `billing_config.sandbox` apagado por defecto, el webhook responde 503
sin secretos). La página «Cancelaciones y reembolsos» lo dice así y remite las compras externas a cada proveedor.
Antes de cobrar hay que definir y publicar: precio e impuestos, renovación, cómo cancelar, acceso hasta fin de periodo
(el modelo de datos ya conserva el acceso hasta `current_period_end`), reembolsos y retracto conforme a la ley
aplicable verificada en fuentes oficiales, canal de solicitud y proveedor de pagos con sus condiciones.

## Aceptación

**No se registra aceptación** de términos ni de privacidad: el formulario de registro solo enlaza a los borradores.
Cuando los textos estén aprobados, si se decide registrar aceptación: guardar versión (`LEGAL_UPDATED` o un número de
versión) y fecha por cuenta en la base, mostrar la casilla en el registro y pedir de nuevo la aceptación cuando la
versión cambie; verificar su persistencia con una prueba.

## «Acerca de» retirado

Se eliminaron `AboutPage.jsx`, `src/data/about.js` y `about.css` (contenido de equipo y proyecto). `/about` redirige a
`/legal/creditos`, que conserva la atribución obligatoria de TMDB («This product uses the TMDB API but is not endorsed
or certified by TMDB.») y la de JustWatch. Las atribuciones en `DuoResults`, `MovieExtras` y `WatchModal` no cambian.

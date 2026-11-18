# Paginación del historial compartido

El historial de planes y las listas de grupos no deben descargarse completas. Cada consulta devuelve una página fija y un cursor keyset que permite continuar desde el último registro sin depender de offsets.

## Contrato

- `listPlans(userId, cursor?)` devuelve `{ items, nextCursor, hasMore }` en orden cronológico ascendente. La interfaz muestra los más recientes primero y añade los anteriores al final cuando se solicita otra página.
- `listGroups(userId, cursor?)` devuelve grupos en orden de creación ascendente.
- `groupPlans(groupId, userId, cursor?)` devuelve planes de grupo en el orden original por fecha de inicio ascendente.
- La primera consulta pide una fila centinela por encima del límite. La centinela indica si existe otra página, pero no se muestra ni se usa como cursor.
- Los cursores contienen la fecha normalizada a UTC con precisión de microsegundos y el UUID. El UUID deshace empates de fecha, por lo que el límite de página no salta registros cuando varias filas comparten el mismo `created_at` o `starts_at`.
- Los tamaños máximos se definen en el repositorio, nunca en parámetros controlados por el navegador. RLS sigue filtrando cada solicitud como antes.

## Interfaz

`/my-plans` conserva el orden más reciente primero y muestra «Cargar planes anteriores» mientras el servidor tenga más resultados. La carga conserva los resultados ya visibles si falla, explica el error y deja reintentar.

`/grupos` y `/grupos/:id` cargan sus siguientes páginas bajo demanda. Un fallo al pedir otra página conserva los grupos o planes cargados y habilita el mismo botón para reintentar.

Al unir páginas se descartan IDs ya presentes. Esto cubre los casos en los que una recarga o una respuesta concurrente cambió el límite entre páginas mientras la persona seguía en la vista.

## Verificación

`src/utils/keysetCursor.test.js` comprueba validación de cursores, orden ascendente y descendente, desempate por UUID, tamaño centinela, filtros de grupo, propagación de errores y unión sin duplicados. `e2e/pagination.spec.js` carga 205 planes de prueba y comprueba que la página siguiente recupera los cinco más antiguos sin repetir los 200 iniciales; también simula un fallo después de cargar la primera página.

El fixture `POST /__e2e/seed-plans` solo existe en el servidor PGlite de Playwright. Requiere la clave efímera configurada por `playwright.config.js` y una sesión de prueba real; no se incluye en el servidor de producción ni en el bundle.

## Límites

- Las páginas no son instantáneas de base de datos: nuevas inserciones pueden aparecer al refrescar. El desempate y la deduplicación mantienen una secuencia estable sin duplicar las filas que ya están en pantalla.
- `hasMore` solo indica que hay más filas visibles para esa cuenta y esos filtros RLS; no revela cuántas filas privadas existen.
- No se aumenta `max_rows` de PostgREST y no se solicita un historial ilimitado.

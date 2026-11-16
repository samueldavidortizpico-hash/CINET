# Evaluación y estabilización de Duo

Fecha: 15 de noviembre de 2026. Base examinada: `ac7869c6fbfda64a1679287feea8ed1ab9f488a9`, con cambios de trabajo en `devlop`. Pruebas locales y proveedores simulados; ninguna consulta al TMDB real.

## Resultados implementados

1. El motor rechaza títulos sin prueba de clasificación cuando el perfil exige modo familia. Antes, `getDuoCandidates` filtraba por clasificación, pero una llamada directa a `rankTitles` con `family: kids` aceptaba una película sin dato de clasificación. Ahora la fuente transmite qué país y lista exacta verificó discover y el motor exige una prueba compatible. Series en modo familia continúan sin resultados porque ese filtro no está soportado por discover TV. Un dato desconocido no se clasifica como apto.
2. La maratón de series descarta antes de elegir la primera cualquier episodio que no quepa en el presupuesto total. Antes, con 60 minutos, una serie mejor puntuada de episodios de 100 minutos ocultaba a otra de episodios de 30 y devolvía cero entradas. Ahora devuelve dos episodios de la segunda; se comprueba con estilos temático, equilibrado y variado.
3. Las fuentes de candidatos se ordenan canónicamente antes de recortarlas. Antes, invertir ocho participantes cambiaba las cuatro consultas de actores de `[100,101,102,103]` a `[104,105,106,107]`. Las combinaciones de géneros equivalentes en distinto orden se deduplican y los empates se resuelven de forma estable. Se conserva el presupuesto de cuatro fuentes de actores y cuatro de parejas; esto elimina dependencia del orden, pero **no garantiza representar a ocho intérpretes distintos**. Ampliar o rotar ese presupuesto requiere una decisión de producto y medición de tráfico.
4. `diversify` precalcula géneros y asientos por candidato dentro de cada llamada y evita asignar arrays y Sets en cada comparación. Se conserva el algoritmo voraz cuadrático y su resultado, sin caché global ni modificación de pesos. Una regresión compara el orden completo contra la implementación de referencia con empates, sagas, alternativas, ocho personas y géneros repetidos o nulos; también muta un título entre llamadas para descartar caché obsoleta.

No se modificaron los pesos `WEIGHTS`, quórum, penalización de popularidad/recencia, criterio de vistas, gustos imprescindibles ni preferencias negativas. No se modificaron pantallas, hooks de favoritos/historial ni estilos.

## Contrato de datos para el desarrollador 1

Las firmas y las respuestas existentes permanecen. Se añade un campo **opcional de procedencia**, no un dato que deba construir la UI:

```js
title.filtered.family = {
  country: "US",                 // el país consultado por discover
  certifications: ["G", "PG"]  // la lista exacta usada en la consulta
};
```

Lo emite `duoService.fetchSources` cuando `discoverParams` incluyó clasificación. Se conserva al enriquecer y deduplicar candidatos. El motor admite una lista de origen no vacía que sea subconjunto de la permitida por el perfil actual y con el mismo país. Una lista más amplia, otro país o la ausencia de dato se rechaza. Cambiar el perfil a una clasificación más estricta exige recuperar candidatos compatibles; no se debe copiar esta marca a mano desde un título cualquiera. Es procedencia de datos de cliente, **no una firma criptográfica ni una frontera de autorización del servidor**.

En rechazo se incorpora `rejectedBy.family`. El componente de vacío actual ignora motivos no reconocidos y no se rompe; si el desarrollador 1 desea un mensaje específico, puede presentar «No pudimos comprobar una clasificación compatible para estos títulos». No debe ofrecer una relajación automática de este requisito ni presentar porcentajes de compatibilidad.

Para CO se conserva la referencia MPA de EE. UU. definida por el producto, con su aviso de sistema de referencia. No se inventó un sistema de clasificación colombiano ni se interpretó ausencia de clasificación como contenido infantil.

## Cobertura de evaluación

Las nuevas pruebas abarcan grupos de 1, 2, 3 y 8 personas, gustos compartidos, negativas, duración desconocida/excedida, plataforma desconocida/vacía, catálogo vacío e historial. Se verifican las seis permutaciones de tres participantes y rotaciones de ocho, comparando puntuación, desglose, orden y papeles de finalistas; los motivos pueden cambiar su orden textual al cambiar el orden de los nombres. En recuperación remota simulada se comparan las URLs completas con ocho participantes, inversión y rotación.

La suite previa conserva sus pruebas de gustos incompatibles, calibración positiva/negativa, historial vacío, películas/series, temporadas, finalistas, equidad por turnos y regeneración sin duplicados. «No es para mí» de calibración es una señal personal que penaliza parecidos, mientras que un género rechazado o un título rechazado del historial es una exclusión; no se cambiaron esas reglas de producto.

Ejecución focalizada al finalizar este bloque:

```text
node --test src/services/recommender.test.js src/services/duoService.test.js src/services/family.test.js
46 correctas, 0 fallidas, 0 omitidas
git diff --check
sin errores
```

La integración debe completar los checks globales y E2E del árbol final. Estas cifras no sustituyen ni anticipan los resultados de otros cambios simultáneos.

## Rendimiento observado

Medición offline de `rankTitles` y `pickFinalists` sobre títulos sintéticos y ocho personas, con el mismo generador de catálogos, reloj de criterios fijo y Node `v24.20.0`. «Regeneración» significa repetir el cálculo de ranking y finalistas; no incluye una nueva búsqueda de red, render React, interacción del dado ni latencia de dispositivo. La máquina estaba compartida con otras verificaciones, por lo que no se presenta como SLA ni como comparación estadística controlada.

| Catálogo | Primera antes ms | Repetición antes ms | Primera después ms | Repetición después ms |
| --- | ---: | ---: | ---: | ---: |
| 100 | 53,23 | 25,33 | 15,92 | 6,25 |
| 500 | 506,45 | 906,92 | 72,62 | 58,75 |
| 1000 | 1764,43 | 1892,11 | 191,70 | 212,15 |
| 2000 | 9315,45 | 11560,82 | 926,77 | 849,43 |

La reducción de asignaciones responde a una necesidad medida: miles de candidatos tardaban segundos en el cálculo original. El resultado se comprueba por equivalencia contra referencia, no por asumir que una respuesta más rápida es de mejor calidad. El crecimiento sigue siendo O(n²); para catálogos mucho mayores conviene medir una estrategia de selección parcial antes de cambiar el contrato de la lista completa.

Reproducción sin red:

```text
node scripts/duo-evaluate.mjs
node scripts/duo-evaluate.mjs --sizes=100,500,1000,2000
```

El script comprueba invariantes y emite resultados JSON. Usa catálogos ficticios, no hace peticiones y admite tamaños acotados hasta 5000. No mide exactitud predictiva, satisfacción real ni un porcentaje de compatibilidad. La comprobación sobre popularidad solo demuestra el caso concreto de dos títulos idénticos en los demás criterios; no extrapola calidad a todo el catálogo.

## Archivos de este bloque

- `src/services/recommender.js`
- `src/services/recommender.test.js`
- `src/services/duoService.js`
- `src/services/duoService.test.js`
- `scripts/duo-evaluate.mjs`
- `docs/DUO-EVALUACION-2026-11-15.md`

## Pendientes y límites

- Validar datos y disponibilidad reales del proveedor en staging autorizado. La marca de discover indica el filtro aplicado; no certifica que los metadatos de TMDB sean infalibles o actuales.
- Definir si cuatro fuentes de actores son suficientes para grupos grandes. La selección estable evita un sesgo por posición, pero tiene cobertura parcial explícita.
- Medir en teléfono la interacción completa y la recuperación por red, además del cálculo puro aquí evaluado.
- La clasificación sigue siendo una restricción del producto y un sistema de referencia, no una garantía parental universal.

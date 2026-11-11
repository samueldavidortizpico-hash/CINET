import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import { DEFAULT_DUO_SESSION } from "../../data/duo.js";
import { buildProfile, scoreTitle } from "../../services/recommender.js";

// Render de componentes reales, aislado y sin peticiones: no sustituye QA en navegador.
const server = await createServer({ server: { middlewareMode: true, open: false }, appType: "custom", logLevel: "error" });
after(() => server.close());
const { default: Shortlist } = await server.ssrLoadModule("/src/components/duo/DuoShortlist.jsx");
const { default: Mode } = await server.ssrLoadModule("/src/components/duo/DuoModeStep.jsx");
const { default: Final } = await server.ssrLoadModule("/src/components/duo/DuoFinal.jsx");
const { ToastContext } = await server.ssrLoadModule("/src/context/ToastContext.jsx");
const noop = () => {};
const profile = buildProfile(DEFAULT_DUO_SESSION);
const item = (type = "movie", patch = {}) => {
  const title = { id: "example", title: "Historia de prueba", type, genreKeys: ["comedy"], runtime: 90, rating: 7, ...patch };
  return { title, ...scoreTitle(title, profile), relaxed: [] };
};
const render = (component) => renderToStaticMarkup(h(MemoryRouter, null, component));

test("la comparación real distingue desconocido, ausencia de oferta, filtro de TMDB y alternativa sin anunciar match", () => {
  const renderPick = (candidate, role = "meet") =>
    render(h(Shortlist, { finalists: [{ item: candidate, role, why: ["Motivo comprobable."] }], names: ["Ana", "Luis"], votes: {}, favorites: { isFavorite: () => false, toggleFavorite: noop }, onVote: noop, onChoose: noop }));
  const html = renderPick(item());
  assert.match(html, /Disponibilidad por confirmar/);
  assert.match(html, /Punto de encuentro/);
  assert.match(html, /aria-label="Una finalista"/);
  assert.match(html, /Solo hay una que cumple sus límites .* no rellenamos/, "con una sola, lo dice en vez de inventar dos más");
  assert.match(html, /Detalles, tráiler y dónde verla/);
  assert.match(html, /Votos en este dispositivo/);
  assert.doesNotMatch(html.replace(/src="[^"]*"/g, ""), /¡Match!|Todos dijeron sí|%/, "sin consenso ni porcentajes inventados (fuera de las URL de imagen)");
  assert.match(renderPick(item("movie", { providers: [] })), /Sin suscripción registrada/);
  assert.match(renderPick(item("movie", { providers: undefined, filtered: { providers: true } })), /según el filtro de TMDB/);
  assert.match(renderPick(item("movie", { runtime: null, runtimeCap: 130 })), /menos de 2 h 10 min \(según TMDB\)/, "una cota no se muestra como duración exacta");
  const alternative = { ...item(), relaxed: ["oneSided"], reasons: ["Es una alternativa: encaja con los gustos de Ana, no con los de Luis."] };
  assert.match(renderPick(alternative, "alt"), /Es una alternativa/);
});

test("la configuración ofrece recorrido rápido para películas y series, conserva maratón guiada", () => {
  const props = { onChange: noop, onGroupSize: noop, onNext: noop, onQuick: noop };
  for (const mode of ["movie", "tv", "marathon"]) {
    const html = render(h(Mode, { ...props, session: { ...DEFAULT_DUO_SESSION, mode } }));
    assert.match(html, /Mostrar nuestros gustos/);
    assert.equal(html.includes("Ir directo a finalistas"), mode !== "marathon");
    assert.match(html, /Ánimo de la sesión/);
    assert.match(html, /ADMITE/, "la entrada de la sesión muestra las butacas reales");
  }
});

test("el cierre lleva película a casa o cine y mantiene las series en el plan de casa", () => {
  const renderFinal = (type) => render(h(ToastContext.Provider, { value: { showToast: noop } }, h(Final, { item: item(type), names: ["Ana", "Luis"], onSeen: noop, onBack: noop, onNew: noop })));
  const movie = renderFinal("movie");
  assert.match(movie, /Una noche en casa/);
  assert.match(movie, /Una salida al cine/);
  assert.match(movie, /functions\?movie=example&amp;mode=home/);
  assert.match(movie, /cartelera oficial/);
  assert.doesNotMatch(renderFinal("tv"), /Una salida al cine/);
});

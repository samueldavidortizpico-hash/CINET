import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DUO_SESSION } from "../data/duo.js";
import { describeQuery, parseQuery, sessionFromQuery } from "./naturalQuery.js";

test("entiende personas, formato, géneros, «nada de», duración y plataforma", () => {
  const parsed = parseQuery("Una comedia corta para ver en pareja en Netflix, nada de terror ni suspenso");
  assert.deepEqual(parsed, {
    people: 2, mode: null, liked: ["comedy"], rejected: ["horror", "thriller"], maxRuntime: 100, providers: ["netflix"], mood: null, family: null,
  });
  assert.deepEqual(describeQuery(parsed), ["En pareja", "Te apetece: comedia", "Nada de: terror, suspenso", "Hasta 1 h 40 min", "En Netflix"]);
});

test("frases trampa: «solo comedia», «máximo 2 horas», números y series", () => {
  const onlyComedy = parseQuery("solo comedia, máximo 2 horas");
  assert.equal(onlyComedy.people, null, "«solo comedia» no es «una persona»");
  assert.deepEqual([onlyComedy.liked, onlyComedy.maxRuntime, onlyComedy.providers], [["comedy"], 120, []], "«máximo» no es HBO Max");
  assert.deepEqual([parseQuery("somos 5 amigos, una serie de misterio").people, parseQuery("somos 5 amigos, una serie de misterio").mode], [5, "tv"]);
  assert.equal(parseQuery("para 2 horas algo de acción").people, null, "«para 2 horas» no son 2 personas");
  assert.equal(parseQuery("somos 20").people, 8, "tope de Duo");
  assert.deepEqual(parseQuery("animada para ver con los niños, sin miedo"), {
    people: 3, mode: null, liked: ["animation"], rejected: ["horror"], maxRuntime: null, providers: [], mood: null, family: "kids",
  });
  assert.deepEqual(describeQuery(parseQuery("hola, ¿qué tal?")), [], "si no entiende nada, lo dice");
});

test("los criterios van a la persona 1 y el «no» filtra para todos; nadie más recibe gustos", () => {
  const session = sessionFromQuery({ ...DEFAULT_DUO_SESSION, providers: ["disney"] }, parseQuery("somos 3, algo de acción sin terror, máximo 2 horas"));
  assert.equal(session.people.length, 3);
  assert.deepEqual([session.people[0].genres, session.people[0].rejectedGenres, session.people[0].maxRuntime], [["action"], ["horror"], 120]);
  assert.deepEqual(session.people[1].genres, [], "los acompañantes marcan sus propios gustos");
  assert.deepEqual(session.providers, ["disney"], "sin plataforma nueva, se conservan las elegidas");
});

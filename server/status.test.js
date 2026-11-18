import { test } from "node:test";
import assert from "node:assert/strict";
import { createStatusHandler } from "./status.js";

async function request(url) {
  const response = { headers: {}, writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = body; } };
  await createStatusHandler(() => "<main>CINET</main>")({ url }, response);
  return response;
}

test("/status/200 devuelve la app con estado HTTP 200", async () => {
  const response = await request("/status/200");
  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /text\/html/);
  assert.equal(response.body, "<main>CINET</main>");
});

test("/status/301 indica redirección permanente hacia /status/200", async () => {
  const response = await request("/status/301");
  assert.equal(response.status, 301);
  assert.equal(response.headers.location, "/status/200");
});

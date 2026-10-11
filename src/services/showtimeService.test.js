import { test } from "node:test";
import assert from "node:assert/strict";
import { isCurrent, toShowtime } from "./showtimeService.js";

const row = {
  id: "l1", org_id: "o1", venue_id: "v1", kind: "showtime", title_id: "interstellar", title: { title: "Interstellar" },
  starts_at: "2030-05-01T01:00:00Z", time_zone: "America/Bogota", format: "IMAX", language: "Subtitulada", price_cop: 18000,
  official_url: "https://andes.example/f", source: "manual", status: "scheduled", valid_until: "2030-05-01T01:00:00Z", updated_at: "2026-10-10T15:00:00Z",
};

test("el contrato trae exhibidor, sede, hora con zona, fuente y actualización", () => {
  const showtime = toShowtime(row, new Map([["v1", { name: "Andes Centro", city: "Bogotá" }]]), new Map([["o1", { name: "Cine Andes" }]]));
  assert.equal(showtime.exhibitor, "Cine Andes");
  assert.deepEqual([showtime.venue, showtime.city], ["Andes Centro", "Bogotá"]);
  assert.equal(showtime.time, "20:00", "01:00 UTC = 20:00 en Bogotá");
  assert.deepEqual([showtime.source, showtime.updatedAt, showtime.price], ["manual", "2026-10-10T15:00:00Z", 18000]);
  assert.equal(toShowtime({ ...row, price_cop: null }).price, null, "sin precio no se inventa uno");
});

test("vencida o cancelada no se muestra", () => {
  const now = new Date("2026-10-10T00:00:00Z");
  const showtime = toShowtime(row);
  assert.equal(isCurrent(showtime, now), true);
  assert.equal(isCurrent({ ...showtime, status: "cancelled" }, now), false);
  assert.equal(isCurrent(showtime, new Date("2030-05-02T00:00:00Z")), false);
  assert.equal(isCurrent({ ...showtime, validUntil: "2026-10-09T00:00:00Z" }, now), false, "datos vencidos aunque la función sea futura");
});

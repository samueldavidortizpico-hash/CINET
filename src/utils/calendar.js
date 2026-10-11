/* Exportar un plan a calendario (.ics, RFC 5545). Descargar el archivo no programa recordatorios. */

import { to24h } from "../services/planService.js";

const pad = (value) => String(value).padStart(2, "0");
const utcStamp = (date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

/** Desfase (ms) de una zona IANA en un instante, según Intl. */
function zoneOffset(instant, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, Number(part.value)])
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - instant;
}

/** "2026-10-17" + "20:30" en una zona IANA → instante real (dos pasadas: cubre cambios de horario). */
export function zonedInstant(dateISO, time, timeZone = "America/Bogota") {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hours, minutes);
  const first = wall - zoneOffset(wall, timeZone);
  return new Date(wall - zoneOffset(first, timeZone));
}

const escapeText = (text) => String(text ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Pliega líneas de más de 75 octetos sin partir caracteres UTF-8. */
function fold(line) {
  const encoder = new TextEncoder();
  const out = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** Inicio del plan: instante guardado (planes de cuenta) o fecha + hora local (planes del navegador). */
export function planStart(plan) {
  if (plan.startsAt) return new Date(plan.startsAt);
  const time = to24h(plan.time);
  return plan.dateISO && time ? zonedInstant(plan.dateISO, time, plan.timeZone ?? "America/Bogota") : null;
}

/** Plan → texto .ics, o null si aún no tiene fecha y hora. Sin asistentes ni datos de otras personas. */
export function planToIcs(plan, { url = "", now = new Date() } = {}) {
  const start = planStart(plan);
  if (!start || Number.isNaN(start.getTime())) return null;
  const runtime = Number(plan.movie?.runtime) || 120;
  const minutes = runtime + (plan.mode === "home" ? 15 : 30); // margen: avances en el cine, acomodarse en casa
  const end = new Date(start.getTime() + minutes * 60_000);
  const place = [plan.cinema?.name, plan.cinema?.location].filter(Boolean).join(" · ");
  const note =
    plan.mode === "home"
      ? `Plan en casa para ver ${plan.movie?.title ?? "una película"}.`
      : `Salida al cine para ver ${plan.movie?.title ?? "una película"}. La hora la propuso quien organiza: confirma la función y el precio en el sitio oficial del cine.`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CINET//Planes//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${plan.id}@cinet`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeText(plan.name || "Plan de CINET")}`,
    place && `LOCATION:${escapeText(place)}`,
    `DESCRIPTION:${escapeText([note, plan.message, url].filter(Boolean).join("\n"))}`,
    url && `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** Descarga el .ics del plan (en el navegador). */
export function downloadIcs(plan, options) {
  const text = planToIcs(plan, options);
  if (!text) return false;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  link.download = `${(plan.name || "plan-cinet").normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "plan-cinet"}.ics`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  return true;
}

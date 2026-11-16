/* Cursores opacos de transferencia. La fecha se conserva con microsegundos:
   convertirla a Date.toISOString() perdería precisión y saltaría registros. */
export const DATA_PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const invalid = () => Object.assign(new Error("Cursor de paginación no válido."), { code: "CN422" });

function validInstant(raw) {
  if (typeof raw !== "string" || !INSTANT.test(raw)) return false;
  const [year, month, day, hour, minute, second] = raw.slice(0, 19).split(/[-T:]/).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return false;
  if (!raw.endsWith("Z")) {
    const [offsetHour, offsetMinute] = raw.slice(-5).split(":").map(Number);
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return false;
  }
  return Number.isFinite(Date.parse(raw));
}

function validate(value, { integerId = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || !validInstant(value.createdAt)
      || typeof value.id !== "string" || !(integerId ? /^[1-9]\d{0,18}$/.test(value.id) && BigInt(value.id) <= 9223372036854775807n : UUID.test(value.id))) throw invalid();
  return { createdAt: value.createdAt, id: value.id };
}

export function encodeCursor(value, options) {
  const cursor = validate(value, options);
  return btoa(JSON.stringify({ v: 1, ...cursor })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeCursor(raw, options) {
  if (typeof raw !== "string" || !/^[\w-]{1,300}$/.test(raw)) throw invalid();
  try {
    const value = JSON.parse(atob(raw.replaceAll("-", "+").replaceAll("_", "/")));
    if (value.v !== 1 || Object.keys(value).sort().join(",") !== "createdAt,id,v") throw invalid();
    return validate(value, options);
  } catch { throw invalid(); }
}

/** Cada RPC impone 50 elementos en servidor; el cliente no envía un límite. */
export async function readDataPage(db, name, args = {}, { cursor = null, integerId = false } = {}) {
  const after = cursor == null ? null : decodeCursor(cursor, { integerId });
  const { data, error } = await db.rpc(name, {
    ...args,
    p_cursor_at: after?.createdAt ?? null,
    p_cursor_id: after?.id ?? null,
  });
  if (error) throw error;
  if (!data || !Array.isArray(data.items) || data.items.length > DATA_PAGE_SIZE) throw new Error("Respuesta de paginación no válida.");
  return { items: data.items, nextCursor: data.nextCursor == null ? null : encodeCursor(data.nextCursor, { integerId }) };
}

/** Compatibilidad con consumidores de arrays. Un error no publica una lista parcial como completa.
    Las páginas pueden pedirse/reintentarse por separado con el mismo cursor. */
export async function collectDataPages(fetchPage, key = (item) => item.id) {
  const items = [];
  const seen = new Set();
  const cursors = new Set();
  let cursor = null;
  do {
    const page = await fetchPage(cursor);
    for (const item of page.items) {
      const identity = key(item);
      if (seen.has(identity)) continue;
      seen.add(identity);
      items.push(item);
    }
    cursor = page.nextCursor;
    if (cursor != null && cursors.has(cursor)) throw new Error("El servidor repitió un cursor de paginación.");
    if (cursor != null) cursors.add(cursor);
  } while (cursor != null);
  return items;
}

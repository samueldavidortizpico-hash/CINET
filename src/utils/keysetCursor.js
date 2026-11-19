const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = new Set(["created_at", "starts_at"]);
const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,6}))?(?:Z|[+-]\d{2}:\d{2})$/i;

export function makeKeysetCursor(row, column) {
  if (!COLUMNS.has(column)) throw new TypeError("Columna de cursor no permitida.");
  if (column === "starts_at" && row?.[column] == null && UUID.test(String(row?.id ?? ""))) {
    return { value: null, id: String(row.id).toLowerCase() };
  }
  const sourceValue = String(row?.[column] ?? "");
  const timestampMatch = sourceValue.match(ISO_TIMESTAMP);
  const timestamp = Date.parse(sourceValue);
  if (!timestampMatch || !Number.isFinite(timestamp) || !UUID.test(String(row?.id ?? ""))) {
    throw new TypeError("La fila no contiene una fecha y un id válidos para paginar.");
  }
  // Date conserva milisegundos, pero PostgreSQL puede devolver microsegundos. Retener los dígitos
  // sub-ms evita que un cursor redondeado se salte filas creadas en la misma milésima.
  const fraction = timestampMatch[1] ?? "";
  const utc = new Date(timestamp).toISOString();
  const subMilliseconds = fraction.length > 3 ? fraction.slice(3) : "";
  const value = subMilliseconds ? utc.replace(/Z$/, `${subMilliseconds}Z`) : utc;
  return { value, id: String(row.id).toLowerCase() };
}

export function normalizeKeysetCursor(cursor, column) {
  if (!cursor || typeof cursor !== "object") return null;
  if (column === "starts_at" && cursor.value === null && UUID.test(String(cursor.id ?? ""))) {
    return { value: null, id: String(cursor.id).toLowerCase() };
  }
  try {
    return makeKeysetCursor({ [column]: cursor.value, id: cursor.id }, column);
  } catch {
    return null;
  }
}

/** PostgREST OR con desempate por id para que fechas repetidas no salten ni dupliquen filas. */
export function keysetFilter(cursor, column, direction = "desc") {
  if (!COLUMNS.has(column)) throw new TypeError("Columna de cursor no permitida.");
  if (direction !== "asc" && direction !== "desc") throw new TypeError("Dirección de cursor no permitida.");
  const normalized = normalizeKeysetCursor(cursor, column);
  if (!normalized) throw new TypeError("Cursor de paginación inválido.");
  const operator = direction === "desc" ? "lt" : "gt";
  if (normalized.value === null) {
    if (direction !== "asc") throw new TypeError("Cursor nulo solo admite orden ascendente.");
    return `and(${column}.is.null,id.gt.${normalized.id})`;
  }
  const nullTail = column === "starts_at" && direction === "asc" ? `,${column}.is.null` : "";
  return `${column}.${operator}.${normalized.value},and(${column}.eq.${normalized.value},id.${operator}.${normalized.id})${nullTail}`;
}

export function takeKeysetPage(rows, pageSize, column) {
  if (!Array.isArray(rows)) throw new TypeError("Las filas deben ser una lista.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) throw new RangeError("Tamaño de página fuera de rango.");
  if (!COLUMNS.has(column)) throw new TypeError("Columna de cursor no permitida.");
  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize);
  const last = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? makeKeysetCursor(last, column) : null,
  };
}

/** Une la página antigua al inicio sin repetir un plan ya cargado por un refresco concurrente. */
export function prependUniquePage(existing, older) {
  if (!Array.isArray(existing) || !Array.isArray(older)) throw new TypeError("Las páginas deben ser listas.");
  const seen = new Set(existing.map((item) => item?.id).filter(Boolean));
  const uniqueOlder = older.filter((item) => item?.id && !seen.has(item.id) && seen.add(item.id));
  return [...uniqueOlder, ...existing];
}

export function appendUniquePage(existing, next) {
  if (!Array.isArray(existing) || !Array.isArray(next)) throw new TypeError("Las páginas deben ser listas.");
  const seen = new Set(existing.map((item) => item?.id).filter(Boolean));
  const uniqueNext = next.filter((item) => item?.id && !seen.has(item.id) && seen.add(item.id));
  return [...existing, ...uniqueNext];
}

/** Ejecuta una página PostgREST con filtros acotados y orden total (columna + UUID). */
export async function queryKeysetPage(database, { table, select, filters = [], column, direction = "desc", pageSize, cursor = null }) {
  if (!IDENTIFIER.test(table) || typeof select !== "string" || !select.trim()) throw new TypeError("Consulta de página inválida.");
  if (!COLUMNS.has(column)) throw new TypeError("Columna de cursor no permitida.");
  if (!Array.isArray(filters) || filters.some(([key]) => !IDENTIFIER.test(key))) throw new TypeError("Filtro de página inválido.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) throw new RangeError("Tamaño de página fuera de rango.");
  if (direction !== "asc" && direction !== "desc") throw new TypeError("Dirección de cursor no permitida.");

  let query = database.from(table).select(select);
  for (const [key, value] of filters) query = query.eq(key, value);
  if (cursor) query = query.or(keysetFilter(cursor, column, direction));
  const ascending = direction === "asc";
  const { data, error } = await query.order(column, { ascending, ...(column === "starts_at" && { nullsFirst: false }) }).order("id", { ascending }).limit(pageSize + 1);
  if (error) throw error;
  return takeKeysetPage(data ?? [], pageSize, column);
}

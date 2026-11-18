const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = new Set(["created_at", "starts_at"]);

export function makeKeysetCursor(row, column) {
  if (!COLUMNS.has(column)) throw new TypeError("Columna de cursor no permitida.");
  const timestamp = Date.parse(row?.[column]);
  if (!Number.isFinite(timestamp) || !UUID.test(String(row?.id ?? ""))) {
    throw new TypeError("La fila no contiene una fecha y un id válidos para paginar.");
  }
  return { value: new Date(timestamp).toISOString(), id: String(row.id).toLowerCase() };
}

export function normalizeKeysetCursor(cursor, column) {
  if (!cursor || typeof cursor !== "object") return null;
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
  return `${column}.${operator}.${normalized.value},and(${column}.eq.${normalized.value},id.${operator}.${normalized.id})`;
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

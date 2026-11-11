const asMap = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

export function importsForAccount(value, userId) {
  return userId ? asMap(asMap(value)[userId]) : {};
}

export function mergeAccountImports(value, userId, completed) {
  if (!userId) return asMap(value);
  return {
    ...asMap(value),
    [userId]: { ...importsForAccount(value, userId), ...asMap(completed) },
  };
}

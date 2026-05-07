export function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => normalizeString(item))
        .filter((item) => item.length > 0)
    )
  );
}

export function normalizeNumberArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    )
  );
}

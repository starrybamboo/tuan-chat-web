const INVALID_ENTITY_IMAGE_VALUES = new Set([
  "",
  "undefined",
  "null",
]);

export function resolveEntityImageUrl(
  value: string | null | undefined,
  fallback = "/favicon.ico",
): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (INVALID_ENTITY_IMAGE_VALUES.has(normalized.toLowerCase())) {
    return fallback;
  }
  return normalized;
}

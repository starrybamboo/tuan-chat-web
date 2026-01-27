export function clampToMultipleOf64(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0)
    return fallback;
  return Math.max(64, Math.round(num / 64) * 64);
}

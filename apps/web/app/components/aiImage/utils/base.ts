export function clamp01(input: number, fallback = 0.5) {
  const value = Number(input);
  if (!Number.isFinite(value))
    return fallback;
  return Math.max(0, Math.min(1, value));
}

export function makeStableId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
      return crypto.randomUUID();
  }
  catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function clampRange(value: number, min: number, max: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num))
    return fallback;
  return Math.min(max, Math.max(min, num));
}

export function clampIntRange(value: number, min: number, max: number, fallback: number) {
  const num = Math.floor(Number(value));
  if (!Number.isFinite(num))
    return fallback;
  return Math.min(max, Math.max(min, num));
}

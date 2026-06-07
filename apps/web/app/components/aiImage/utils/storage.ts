import { clampRange } from "@/components/aiImage/utils/base";

export function readLocalStorageString(key: string, fallback: string) {
  if (typeof window === "undefined")
    return fallback;
  try {
    const value = String(window.localStorage.getItem(key) || "");
    return value || fallback;
  }
  catch {
    return fallback;
  }
}

export function writeLocalStorageString(key: string, value: string) {
  if (typeof window === "undefined")
    return;
  try {
    window.localStorage.setItem(key, value);
  }
  catch {
    // ignore
  }
}

export function formatSliderValue(value: number) {
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function normalizeReferenceStrengthRows<T extends { strength: number }>(rows: T[]) {
  const totalStrength = rows.reduce((sum, row) => {
    return sum + Math.max(0, Number(row.strength) || 0);
  }, 0);
  if (!Number.isFinite(totalStrength) || totalStrength <= 0)
    return rows;

  return rows.map((row) => {
    return {
      ...row,
      strength: clampRange(Number(row.strength) / totalStrength, 0, 1, 0),
    };
  });
}

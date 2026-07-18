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

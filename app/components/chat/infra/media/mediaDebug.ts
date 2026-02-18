const LOCAL_STORAGE_KEY = "tc:media-debug";
const GLOBAL_FLAG_KEY = "__TC_MEDIA_DEBUG__";
const BRIDGE_INSTALLED_KEY = "__TC_MEDIA_DEBUG_BRIDGE_INSTALLED__";
const BRIDGE_STATUS_FN_KEY = "__TC_MEDIA_DEBUG_STATUS__";
const BRIDGE_ENABLE_FN_KEY = "__TC_ENABLE_MEDIA_DEBUG__";
const BRIDGE_DISABLE_FN_KEY = "__TC_DISABLE_MEDIA_DEBUG__";

type DebugPayload = Record<string, unknown> | undefined;

function isTruthyFlag(value: unknown): boolean {
  if (typeof value === "boolean")
    return value;
  if (typeof value !== "string")
    return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

export function isMediaDebugEnabled(): boolean {
  try {
    const flag = (globalThis as any)?.[GLOBAL_FLAG_KEY];
    if (isTruthyFlag(flag))
      return true;
  }
  catch {
    // ignore
  }

  if (typeof window === "undefined")
    return false;

  try {
    if (isTruthyFlag(window.localStorage.getItem(LOCAL_STORAGE_KEY)))
      return true;
  }
  catch {
    // ignore
  }

  try {
    if (isTruthyFlag(window.sessionStorage.getItem(LOCAL_STORAGE_KEY)))
      return true;
  }
  catch {
    // ignore
  }

  try {
    const search = new URLSearchParams(window.location.search);
    if (isTruthyFlag(search.get("tcMediaDebug")))
      return true;
  }
  catch {
    // ignore
  }

  return false;
}

export function mediaDebug(scope: string, event: string, payload?: DebugPayload): void {
  if (!isMediaDebugEnabled())
    return;

  const prefix = `[tc-media][${scope}] ${event}`;
  if (payload) {
    let snapshot: unknown = payload;
    try {
      snapshot = JSON.parse(JSON.stringify(payload));
    }
    catch {
      // ignore
    }
    console.log(prefix, snapshot);
    return;
  }
  console.log(prefix);
}

export const MEDIA_DEBUG_KEYS = {
  localStorageKey: LOCAL_STORAGE_KEY,
  globalFlagKey: GLOBAL_FLAG_KEY,
} as const;

export function installMediaDebugBridge(): void {
  if (typeof window === "undefined")
    return;

  const w = window as any;
  if (w[BRIDGE_INSTALLED_KEY]) {
    return;
  }
  w[BRIDGE_INSTALLED_KEY] = true;

  w[BRIDGE_STATUS_FN_KEY] = () => {
    const status = isMediaDebugEnabled();
    console.log("[tc-media][debug] status()", {
      enabled: status,
      localStorageKey: LOCAL_STORAGE_KEY,
      globalFlagKey: GLOBAL_FLAG_KEY,
    });
    return status;
  };

  w[BRIDGE_ENABLE_FN_KEY] = () => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, "1");
    }
    catch {
      // ignore
    }
    w[GLOBAL_FLAG_KEY] = true;
    console.log("[tc-media][debug] enabled");
  };

  w[BRIDGE_DISABLE_FN_KEY] = () => {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    catch {
      // ignore
    }
    w[GLOBAL_FLAG_KEY] = false;
    console.log("[tc-media][debug] disabled");
  };

  console.log("[tc-media][debug] bridge-ready", {
    enabled: isMediaDebugEnabled(),
    helpers: {
      status: BRIDGE_STATUS_FN_KEY,
      enable: BRIDGE_ENABLE_FN_KEY,
      disable: BRIDGE_DISABLE_FN_KEY,
    },
  });
}

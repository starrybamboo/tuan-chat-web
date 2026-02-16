const SESSION_TOKEN_ENDPOINT = "/user/token";
const RECOVERY_COOLDOWN_MS = 3000;

let inFlightRecovery: Promise<string | null> | null = null;
let lastRecoveryFailedAt = 0;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function writeToken(token: string): string | null {
  const normalized = token.trim();
  if (!normalized) {
    return null;
  }
  try {
    window.localStorage.setItem("token", normalized);
    return normalized;
  }
  catch {
    return null;
  }
}

function resolveBaseUrl(apiBase?: string): string {
  const rawBase = (apiBase ?? "").trim();
  if (rawBase.length > 0) {
    return rawBase.replace(/\/$/, "");
  }
  return window.location.origin.replace(/\/$/, "");
}

function resolveSessionTokenUrl(apiBase?: string): string {
  return `${resolveBaseUrl(apiBase)}${SESSION_TOKEN_ENDPOINT}`;
}

function readTokenFromApiResult(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload.trim() || null;
  }

  if (payload && typeof payload === "object") {
    const candidate = (payload as { data?: unknown }).data;
    if (typeof candidate === "string") {
      return candidate.trim() || null;
    }
  }

  return null;
}

async function requestSessionToken(apiBase?: string): Promise<string | null> {
  const url = resolveSessionTokenUrl(apiBase);
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  }
  catch {
    payload = null;
  }

  const token = readTokenFromApiResult(payload);
  if (!token) {
    return null;
  }

  return writeToken(token);
}

export async function recoverAuthTokenFromSession(apiBase?: string): Promise<string | null> {
  if (!isBrowser()) {
    return null;
  }

  const now = Date.now();
  if (now - lastRecoveryFailedAt < RECOVERY_COOLDOWN_MS) {
    return null;
  }

  if (inFlightRecovery) {
    return inFlightRecovery;
  }

  inFlightRecovery = (async () => {
    try {
      return await requestSessionToken(apiBase);
    }
    catch {
      return null;
    }
  })().finally(() => {
    inFlightRecovery = null;
  });

  const token = await inFlightRecovery;
  if (!token) {
    lastRecoveryFailedAt = Date.now();
  }
  return token;
}

import { createTuanChatClient } from "./instance";

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
  const anonymousClient = createTuanChatClient({ base: apiBase, includeToken: false });
  const response = await anonymousClient.userController.getCurrentToken().catch(() => null);
  if (!response || response.success === false) {
    return null;
  }
  const token = readTokenFromApiResult(response);
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

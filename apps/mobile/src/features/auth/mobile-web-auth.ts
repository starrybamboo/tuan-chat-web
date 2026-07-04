import type { StoredAuthSession } from "./auth-storage";

const MOBILE_AUTH_CALLBACK_HOST = "auth";
const MOBILE_AUTH_CALLBACK_PATH = "/callback";
const TUANCHAT_WEB_LOGIN_URL = "https://tuan.chat/login?from=mobile&embed=1";

function readSearchParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parsePositiveUserId(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseCallbackUrl(callbackUrl: string) {
  try {
    return new URL(callbackUrl);
  }
  catch {
    return null;
  }
}

export function buildMobileWebLoginUrl() {
  return TUANCHAT_WEB_LOGIN_URL;
}

export function buildMobileAuthCallbackUrl(session: StoredAuthSession) {
  const callbackUrl = new URL(`tuanchat://${MOBILE_AUTH_CALLBACK_HOST}${MOBILE_AUTH_CALLBACK_PATH}`);
  callbackUrl.searchParams.set("token", session.token);

  if (typeof session.userId === "number" && session.userId > 0) {
    callbackUrl.searchParams.set("userId", String(session.userId));
  }

  if (session.username?.trim()) {
    callbackUrl.searchParams.set("username", session.username.trim());
  }

  return callbackUrl.toString();
}

export function resolveMobileWebAuthCallbackSession(callbackUrl: string | null | undefined): StoredAuthSession | null {
  if (!callbackUrl) {
    return null;
  }

  const url = parseCallbackUrl(callbackUrl);
  if (!url || url.protocol !== "tuanchat:" || url.hostname !== MOBILE_AUTH_CALLBACK_HOST || url.pathname !== MOBILE_AUTH_CALLBACK_PATH) {
    return null;
  }

  const token = readSearchParam(url, "token");
  if (!token) {
    return null;
  }

  return {
    token,
    userId: parsePositiveUserId(readSearchParam(url, "userId")),
    username: readSearchParam(url, "username"),
  };
}

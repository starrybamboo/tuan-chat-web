export type UnauthorizedSource = "http" | "ws";

const LAST_UNAUTHORIZED_AT_KEY = "tc:auth:lastUnauthorizedAt";
const TOAST_KEY = "tc:auth:toast";

function nowMs() {
  return Date.now();
}

function readNumber(value: string | null): number | null {
  if (!value)
    return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldThrottle(windowMs: number): boolean {
  const last = readNumber(window.sessionStorage.getItem(LAST_UNAUTHORIZED_AT_KEY));
  const current = nowMs();
  if (last != null && current - last < windowMs) {
    return true;
  }
  window.sessionStorage.setItem(LAST_UNAUTHORIZED_AT_KEY, String(current));
  return false;
}

function persistToast(message: string) {
  if (!message)
    return;
  window.sessionStorage.setItem(TOAST_KEY, message);
}

export function consumeAuthToast(): string | null {
  if (typeof window === "undefined")
    return null;

  const msg = window.sessionStorage.getItem(TOAST_KEY);
  if (msg)
    window.sessionStorage.removeItem(TOAST_KEY);
  return msg;
}

export function clearAuthStorage() {
  try {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("uid");
  }
  catch {
    // ignore
  }
}

export function handleUnauthorized(params?: {
  source?: UnauthorizedSource;
  toastMessage?: string;
  redirect?: string;
}) {
  if (typeof window === "undefined")
    return;

  // Avoid redirect storms when multiple requests fail concurrently.
  if (shouldThrottle(1500))
    return;

  const source = params?.source ?? "http";
  const toastMessage = params?.toastMessage
    ?? (source === "ws"
      ? "登录已失效（连接已断开），请重新登录"
      : "登录已过期，请重新登录");
  persistToast(toastMessage);

  clearAuthStorage();

  // If already on /login, don't keep bouncing.
  if (window.location.pathname === "/login") {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const redirect = params?.redirect ?? currentPath;

  const target = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : "/login";

  window.location.assign(target);
}


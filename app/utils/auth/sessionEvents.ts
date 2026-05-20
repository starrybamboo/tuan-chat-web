export const AUTH_SESSION_CHANGED_EVENT = "tc:auth-session-changed";

export type AuthSessionChangeSource = "login" | "logout" | "unauthorized";

export type AuthSessionChangedDetail = {
  isLoggedIn: boolean;
  uid: number | null;
  source: AuthSessionChangeSource;
};

function readStoredUid(): number | null {
  if (typeof window === "undefined")
    return null;

  const rawUid = window.localStorage.getItem("uid")?.trim();
  if (!rawUid)
    return null;

  const uid = Number(rawUid);
  return Number.isFinite(uid) && uid > 0 ? uid : null;
}

function readStoredToken(): string {
  if (typeof window === "undefined")
    return "";

  return window.localStorage.getItem("token")?.trim() ?? "";
}

export function readStoredAuthUserId(): number | null {
  return readStoredUid();
}

export function dispatchAuthSessionChanged(detail: AuthSessionChangedDetail): void {
  if (typeof window === "undefined")
    return;

  window.dispatchEvent(new CustomEvent<AuthSessionChangedDetail>(AUTH_SESSION_CHANGED_EVENT, { detail }));
}

export function dispatchStoredAuthSessionChanged(source: AuthSessionChangeSource): void {
  const uid = readStoredUid();
  dispatchAuthSessionChanged({
    isLoggedIn: readStoredToken() !== "",
    uid,
    source,
  });
}

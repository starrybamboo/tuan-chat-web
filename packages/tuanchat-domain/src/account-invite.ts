export const ACCOUNT_INVITE_CODE_PATTERN = /^[A-HJ-NP-Za-km-z2-9]{6}$/;
export const ACCOUNT_INVITE_DEFAULT_WEB_ORIGIN = "https://tuan.chat";

export function normalizeAccountInviteCode(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidAccountInviteCode(value: string | null | undefined) {
  return ACCOUNT_INVITE_CODE_PATTERN.test(normalizeAccountInviteCode(value));
}

export function buildAccountInviteRegisterUrl(
  inviteCode: string | null | undefined,
  origin: string | null | undefined = ACCOUNT_INVITE_DEFAULT_WEB_ORIGIN,
) {
  const normalizedInviteCode = normalizeAccountInviteCode(inviteCode);
  if (!isValidAccountInviteCode(normalizedInviteCode)) {
    return "";
  }

  const normalizedOrigin = typeof origin === "string" && origin.trim()
    ? origin.trim().replace(/\/+$/, "")
    : ACCOUNT_INVITE_DEFAULT_WEB_ORIGIN;
  const url = new URL("/login", normalizedOrigin);
  url.searchParams.set("mode", "register");
  url.searchParams.set("inviteCode", normalizedInviteCode);
  return url.toString();
}

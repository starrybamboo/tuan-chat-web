import type { UserRegisterRequest } from "api";

import {
  ACCOUNT_INVITE_CODE_PATTERN,
  normalizeAccountInviteCode,
} from "@tuanchat/domain/account-invite";

export function normalizeRegisterInviteCode(value: string | null | undefined) {
  return normalizeAccountInviteCode(value);
}

export function resolveRegisterInviteCodeFromLocation({
  pathname,
  searchStr,
}: {
  pathname: string;
  searchStr: string;
}) {
  if (pathname === "/invite" || pathname.startsWith("/invite/")) {
    return "";
  }

  const searchParams = new URLSearchParams(searchStr);
  if (searchParams.get("mode") !== "register") {
    return "";
  }

  const inviteCode = normalizeRegisterInviteCode(searchParams.get("inviteCode"));
  return ACCOUNT_INVITE_CODE_PATTERN.test(inviteCode) ? inviteCode : "";
}

export function withRegisterInviteCode<T extends UserRegisterRequest>(
  request: T,
  inviteCode: string | null | undefined,
) {
  const normalizedInviteCode = normalizeRegisterInviteCode(inviteCode);
  if (!normalizedInviteCode) {
    return request;
  }

  return {
    ...request,
    inviteCode: normalizedInviteCode,
  };
}

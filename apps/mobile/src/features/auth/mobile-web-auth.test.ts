import { describe, expect, it } from "vitest";

import { buildMobileAuthCallbackUrl, buildMobileWebLoginUrl, resolveMobileWebAuthCallbackSession } from "./mobile-web-auth";

describe("mobile-web-auth", () => {
  it("builds the shared web login URL for mobile sign-in", () => {
    expect(buildMobileWebLoginUrl()).toBe("https://tuan.chat/login?from=mobile&embed=1");
  });

  it("round-trips the mobile auth callback session", () => {
    const callbackUrl = buildMobileAuthCallbackUrl({
      token: "token-value",
      userId: 42,
      username: "alice",
    });

    expect(resolveMobileWebAuthCallbackSession(callbackUrl)).toEqual({
      token: "token-value",
      userId: 42,
      username: "alice",
    });
  });

  it("ignores unrelated or incomplete callback URLs", () => {
    expect(resolveMobileWebAuthCallbackSession("tuanchat://chat/room/1")).toBeNull();
    expect(resolveMobileWebAuthCallbackSession("tuanchat://auth/callback")).toBeNull();
    expect(resolveMobileWebAuthCallbackSession("https://tuan.chat/login?from=mobile")).toBeNull();
  });
});

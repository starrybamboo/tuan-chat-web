import { describe, expect, it, vi } from "vitest";

import { executeLoginAction } from "./login-action";

describe("executeLoginAction", () => {
  it("navigates to tabs after a successful sign-in", async () => {
    const signIn = vi.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined);
    const replace = vi.fn<(href: "/(tabs)") => void>();

    await executeLoginAction({
      identifier: "alice",
      loginMethod: "username",
      password: "secret",
      router: { replace },
      signIn,
    });

    expect(signIn).toHaveBeenCalledWith({
      identifier: "alice",
      method: "username",
      password: "secret",
    });
    expect(replace).toHaveBeenCalledWith("/(tabs)");
  });

  it("does not navigate when sign-in fails", async () => {
    const signInError = new Error("登录失败。");
    const signIn = vi.fn<(...args: any[]) => Promise<void>>().mockRejectedValue(signInError);
    const replace = vi.fn<(href: "/(tabs)") => void>();

    await expect(executeLoginAction({
      identifier: "alice",
      loginMethod: "username",
      password: "secret",
      router: { replace },
      signIn,
    })).rejects.toThrow(signInError);

    expect(replace).not.toHaveBeenCalled();
  });
});

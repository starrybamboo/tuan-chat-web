import { describe, expect, it } from "vitest";

import {
  resolveRegisterInviteCodeFromLocation,
  withRegisterInviteCode,
} from "./registerInviteCode";

describe("register invite code helpers", () => {
  it("prefills invite code from register-mode login URL", () => {
    expect(resolveRegisterInviteCodeFromLocation({
      pathname: "/login",
      searchStr: "?mode=register&inviteCode=%20aZ8kQ2%20",
    })).toBe("aZ8kQ2");
  });

  it("does not prefill a numeric user id as an invite code", () => {
    expect(resolveRegisterInviteCodeFromLocation({
      pathname: "/login",
      searchStr: "?mode=register&inviteCode=10001",
    })).toBe("");
  });

  it("adds manually entered invite code to register request", () => {
    expect(withRegisterInviteCode({
      username: "alice",
      password: "Raw_123456",
      email: "alice@example.com",
    }, "  aZ8kQ2  ")).toEqual({
      username: "alice",
      password: "Raw_123456",
      email: "alice@example.com",
      inviteCode: "aZ8kQ2",
    });
  });

  it("keeps blank invite code out of register request", () => {
    const request = {
      username: "alice",
      password: "Raw_123456",
      email: "alice@example.com",
    };

    expect(withRegisterInviteCode(request, "   ")).toBe(request);
  });

  it("does not treat space invite route as account registration invite", () => {
    expect(resolveRegisterInviteCodeFromLocation({
      pathname: "/invite/SPACE_CODE",
      searchStr: "?mode=register&inviteCode=ACCOUNT_CODE",
    })).toBe("");
  });
});

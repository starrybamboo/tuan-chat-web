import { describe, expect, it } from "vitest";

import {
  buildAccountInviteRegisterUrl,
  isValidAccountInviteCode,
  normalizeAccountInviteCode,
} from "./account-invite";

describe("account invite helpers", () => {
  it("validates six-character account invite codes", () => {
    expect(isValidAccountInviteCode("aZ8kQ2")).toBe(true);
    expect(isValidAccountInviteCode("10001")).toBe(false);
    expect(isValidAccountInviteCode(" ABC123 ")).toBe(false);
  });

  it("normalizes invite code input without changing case", () => {
    expect(normalizeAccountInviteCode("  aZ8kQ2  ")).toBe("aZ8kQ2");
  });

  it("builds register links with invite code prefill", () => {
    expect(buildAccountInviteRegisterUrl("aZ8kQ2", "https://example.com/")).toBe(
      "https://example.com/login?mode=register&inviteCode=aZ8kQ2",
    );
  });

  it("returns blank link for invalid invite codes", () => {
    expect(buildAccountInviteRegisterUrl("10001", "https://example.com")).toBe("");
  });
});

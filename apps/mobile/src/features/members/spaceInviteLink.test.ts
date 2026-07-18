import { describe, expect, it } from "vitest";

import {
  buildSpaceInviteLink,
  clampSpaceInviteDurationDays,
  getDefaultSpaceInviteMode,
  getSpaceInviteCodeQueryKey,
  getSpaceInviteCodeType,
} from "./spaceInviteLink";

describe("spaceInviteLink", () => {
  it("生成与 Web 邀请路由一致的完整链接", () => {
    expect(buildSpaceInviteLink(" code/with space ")).toBe("https://tuan.chat/invite/code%2Fwith%20space");
    expect(buildSpaceInviteLink("abc", "https://preview.tuan.chat/")).toBe("https://preview.tuan.chat/invite/abc");
    expect(buildSpaceInviteLink("  ")).toBe("");
    expect(buildSpaceInviteLink(null)).toBe("");
  });

  it("把有效期限制在 1 到 365 天", () => {
    expect(clampSpaceInviteDurationDays(0)).toBe(1);
    expect(clampSpaceInviteDurationDays(12.9)).toBe(12);
    expect(clampSpaceInviteDurationDays(999)).toBe(365);
    expect(clampSpaceInviteDurationDays(Number.NaN, 30)).toBe(30);
  });

  it("按邀请身份映射默认模式、接口类型和缓存键", () => {
    expect(getDefaultSpaceInviteMode(true)).toBe("player");
    expect(getDefaultSpaceInviteMode(false)).toBe("spectator");
    expect(getSpaceInviteCodeType("player")).toBe(1);
    expect(getSpaceInviteCodeType("spectator")).toBe(0);
    expect(getSpaceInviteCodeQueryKey(8, 1, 7)).toEqual(["inviteCode", 8, 1, 7]);
  });
});

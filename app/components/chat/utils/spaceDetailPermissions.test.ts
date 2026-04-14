import { describe, expect, it } from "vitest";

import { SPACE_MEMBER_TYPE } from "./memberPermissions";
import { canViewSpaceDetailTab } from "./spaceDetailPermissions";

describe("spaceDetailPermissions", () => {
  it("观战和玩家都不能查看受限的空间管理面板", () => {
    expect(canViewSpaceDetailTab("roles", SPACE_MEMBER_TYPE.PLAYER)).toBe(false);
    expect(canViewSpaceDetailTab("trpg", SPACE_MEMBER_TYPE.PLAYER)).toBe(false);
    expect(canViewSpaceDetailTab("webgal", SPACE_MEMBER_TYPE.OBSERVER)).toBe(false);
    expect(canViewSpaceDetailTab("material", SPACE_MEMBER_TYPE.PLAYER)).toBe(false);
  });

  it("空间成员面板对普通成员保持可见", () => {
    expect(canViewSpaceDetailTab("members", SPACE_MEMBER_TYPE.OBSERVER)).toBe(true);
    expect(canViewSpaceDetailTab("members", SPACE_MEMBER_TYPE.PLAYER)).toBe(true);
  });

  it("主持人和副主持人可以查看空间管理面板", () => {
    expect(canViewSpaceDetailTab("members", SPACE_MEMBER_TYPE.LEADER)).toBe(true);
    expect(canViewSpaceDetailTab("material", SPACE_MEMBER_TYPE.ASSISTANT_LEADER)).toBe(true);
  });

  it("非管理面板不受该权限收紧影响", () => {
    expect(canViewSpaceDetailTab("workflow", SPACE_MEMBER_TYPE.OBSERVER)).toBe(true);
    expect(canViewSpaceDetailTab("setting", SPACE_MEMBER_TYPE.PLAYER)).toBe(true);
  });
});

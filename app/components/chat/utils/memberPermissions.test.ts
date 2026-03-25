import { describe, expect, it } from "vitest";

import {
  canManageMemberPermissions,
  canManageRoomRoles,
  canParticipateInRoom,
  getMemberTypeSortWeight,
  hasHostPrivileges,
  isObserverLike,
  SPACE_MEMBER_TYPE,
} from "./memberPermissions";

describe("memberPermissions", () => {
  it("副主持人应拥有主持权限但不能改成员权限", () => {
    expect(hasHostPrivileges(SPACE_MEMBER_TYPE.ASSISTANT_LEADER)).toBe(true);
    expect(canManageMemberPermissions(SPACE_MEMBER_TYPE.ASSISTANT_LEADER)).toBe(false);
  });

  it("玩家可参与房间并管理自己的房间角色", () => {
    expect(canParticipateInRoom(SPACE_MEMBER_TYPE.PLAYER)).toBe(true);
    expect(canManageRoomRoles(SPACE_MEMBER_TYPE.PLAYER)).toBe(true);
  });

  it("观战和骰娘都应被视为不可发言的旁观角色", () => {
    expect(isObserverLike(SPACE_MEMBER_TYPE.OBSERVER)).toBe(true);
    expect(isObserverLike(SPACE_MEMBER_TYPE.BOT)).toBe(true);
  });

  it("成员排序应将主持人与副主持人排在玩家和观战前面", () => {
    expect(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.LEADER)).toBeLessThan(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.ASSISTANT_LEADER));
    expect(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.ASSISTANT_LEADER)).toBeLessThan(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.PLAYER));
    expect(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.PLAYER)).toBeLessThan(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.OBSERVER));
  });
});

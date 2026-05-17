import { describe, expect, it } from "vitest";

import {
  canInviteSpectators,
  canManageMemberPermissions,
  canManageRoomRoles,
  canParticipateInRoom,
  canViewRoomNpcRoles,
  getMemberTypeSortWeight,
  hasHostPrivileges,
  isObserverLike,
  SPACE_MEMBER_TYPE,
} from "./member-permissions";

describe("member permissions", () => {
  it("统一判断主持、副主持、玩家和观战权限", () => {
    expect(hasHostPrivileges(SPACE_MEMBER_TYPE.LEADER)).toBe(true);
    expect(hasHostPrivileges(SPACE_MEMBER_TYPE.ASSISTANT_LEADER)).toBe(true);
    expect(canManageMemberPermissions(SPACE_MEMBER_TYPE.ASSISTANT_LEADER)).toBe(false);
    expect(canInviteSpectators(SPACE_MEMBER_TYPE.PLAYER)).toBe(true);
    expect(canParticipateInRoom(SPACE_MEMBER_TYPE.PLAYER)).toBe(true);
    expect(canManageRoomRoles(SPACE_MEMBER_TYPE.PLAYER)).toBe(true);
    expect(canViewRoomNpcRoles(SPACE_MEMBER_TYPE.PLAYER)).toBe(false);
    expect(isObserverLike(SPACE_MEMBER_TYPE.OBSERVER)).toBe(true);
    expect(isObserverLike(SPACE_MEMBER_TYPE.BOT)).toBe(true);
  });

  it("排序权重保持主持、副主持、玩家、观战、骰娘顺序", () => {
    expect(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.LEADER)).toBeLessThan(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.ASSISTANT_LEADER));
    expect(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.ASSISTANT_LEADER)).toBeLessThan(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.PLAYER));
    expect(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.PLAYER)).toBeLessThan(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.OBSERVER));
    expect(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.OBSERVER)).toBeLessThan(getMemberTypeSortWeight(SPACE_MEMBER_TYPE.BOT));
  });
});

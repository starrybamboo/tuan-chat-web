import { describe, expect, it } from "vitest";

import {
  findCurrentMember,
  getCurrentMemberIdentityText,
  getCurrentRoomPresenceText,
  getMemberDisplayName,
  getSpaceMemberTypeLabel,
  mergeRoomMembersWithSpaceMembers,
  sortMemberPreviewItems,
} from "./memberUtils";

describe("memberUtils", () => {
  it("成员排序会优先主持、副主持，再到玩家和观战", () => {
    const sorted = sortMemberPreviewItems([
      { memberType: 3, userId: 3, username: "observer" },
      { memberType: 2, userId: 2, username: "player" },
      { memberType: 1, userId: 1, username: "leader" },
      { memberType: 5, userId: 4, username: "assistant" },
    ]);

    expect(sorted.map(member => member.userId)).toEqual([1, 4, 2, 3]);
  });

  it("会把空间成员身份合并到房间成员预览上", () => {
    const merged = mergeRoomMembersWithSpaceMembers(
      [
        { userId: 1001, username: "kp" },
        { userId: 1002, username: "pl" },
      ],
      [
        { memberType: 1, userId: 1001, username: "kp" },
        { memberType: 2, userId: 1002, username: "pl" },
      ],
    );

    expect(merged).toEqual([
      { memberType: 1, userId: 1001, username: "kp" },
      { memberType: 2, userId: 1002, username: "pl" },
    ]);
  });

  it("可以找到当前用户对应的成员信息", () => {
    const currentMember = findCurrentMember([
      { memberType: 3, userId: 1001 },
      { memberType: 2, userId: 1002 },
    ], 1002);

    expect(currentMember).toEqual({ memberType: 2, userId: 1002 });
  });

  it("会给当前身份和房间可见性生成稳定文案", () => {
    expect(getCurrentMemberIdentityText({ memberType: 2 })).toBe("当前身份：玩家");
    expect(getCurrentMemberIdentityText(null)).toBe("当前身份：待识别");
    expect(getCurrentRoomPresenceText({ memberType: 2 }, { memberType: 2 })).toBe("你已在当前房间成员列表中。");
    expect(getCurrentRoomPresenceText(null, { memberType: 1 })).toBe("你当前是主持，即使没有 room member 记录也可查看该房间。");
    expect(getCurrentRoomPresenceText(null, { memberType: 3 })).toBe("你当前是观战，暂未进入当前房间成员列表。");
    expect(getCurrentRoomPresenceText(null, null)).toBe("当前成员身份尚未识别。");
  });

  it("成员显示名和身份标签都有兜底", () => {
    expect(getMemberDisplayName({ username: "  Alice  ", userId: 1 })).toBe("Alice");
    expect(getMemberDisplayName({ userId: 1001 })).toBe("用户 #1001");
    expect(getSpaceMemberTypeLabel(5)).toBe("副主持");
    expect(getSpaceMemberTypeLabel(undefined)).toBe("待识别");
  });
});

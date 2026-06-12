import { describe, expect, it } from "vitest";

import { SPACE_MEMBER_TYPE } from "@/components/chat/utils/memberPermissions";

import type { SpaceMember } from "../../../../../api";

import {
  getSpaceMemberMenuLabels,
  resolveRoomMemberAction,
  splitMemberGroups,
} from "./memberLists";

describe("member lists", () => {
  it("将房间成员和空间成员分开，并给出正确的直达动作", () => {
    const members: SpaceMember[] = [
      { userId: 1, username: "Alice", memberType: SPACE_MEMBER_TYPE.LEADER } as SpaceMember,
      { userId: 2, username: "Bob", memberType: SPACE_MEMBER_TYPE.PLAYER } as SpaceMember,
      { userId: 3, username: "Cara", memberType: SPACE_MEMBER_TYPE.OBSERVER } as SpaceMember,
    ];

    const groups = splitMemberGroups({ isSpace: false, members, roomMemberUserIds: [1, 2] });

    expect(groups.shouldSplit).toBe(true);
    expect(groups.roomMembers.map(member => member.username)).toEqual(["Alice", "Bob"]);
    expect(groups.spaceMembers.map(member => member.username)).toEqual(["Cara"]);

    expect(resolveRoomMemberAction({
      canManageRoomMembership: true,
      currentUserId: 1,
      isRoomMember: true,
      memberUserId: 1,
    })).toEqual({ danger: true, kind: "remove", label: "退出" });

    expect(resolveRoomMemberAction({
      canManageRoomMembership: true,
      currentUserId: 1,
      isRoomMember: true,
      memberUserId: 2,
    })).toEqual({ danger: true, kind: "remove", label: "移除" });

    expect(resolveRoomMemberAction({
      canManageRoomMembership: true,
      currentUserId: 1,
      isRoomMember: false,
      memberUserId: 3,
    })).toEqual({ danger: false, kind: "invite", label: "邀请" });
  });

  it("空间成员菜单只保留退出和管理动作，不再包含添加好友", () => {
    expect(getSpaceMemberMenuLabels({
      canLeaveSpace: true,
      canManageSpaceTarget: false,
      memberType: SPACE_MEMBER_TYPE.LEADER,
    })).toEqual(["退出空间"]);

    expect(getSpaceMemberMenuLabels({
      canLeaveSpace: false,
      canManageSpaceTarget: true,
      memberType: SPACE_MEMBER_TYPE.LEADER,
    })).toEqual([
      "设为副GM/KP",
      "设为PL",
      "设为OB",
      "转让GM/KP",
      "移出空间",
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { SPACE_MEMBER_TYPE } from "@/components/chat/utils/memberPermissions";

import type { UserRole } from "../../../../api";

import { buildRoomSettingRoleView, canDisplayRoomSettingNpcRoles } from "./roomSettingRoles";

describe("room setting roles", () => {
  it("允许 KP 和副 KP 查看房间 NPC，普通 PL 不显示", () => {
    expect(canDisplayRoomSettingNpcRoles({
      isSpaceOwner: true,
      memberType: SPACE_MEMBER_TYPE.LEADER,
    })).toBe(true);
    expect(canDisplayRoomSettingNpcRoles({
      isSpaceOwner: false,
      memberType: SPACE_MEMBER_TYPE.ASSISTANT_LEADER,
    })).toBe(true);
    expect(canDisplayRoomSettingNpcRoles({
      isSpaceOwner: false,
      memberType: SPACE_MEMBER_TYPE.PLAYER,
    })).toBe(false);
  });

  it("房间角色统计只在可见时合入 NPC", () => {
    const roomRoles = [{ roleId: 1, roleName: "PL" }] as UserRole[];
    const roomNpcRoles = [
      { roleId: 2, roleName: "NPC 甲" },
      { roleId: 3, roleName: "NPC 乙" },
    ] as UserRole[];

    expect(buildRoomSettingRoleView({
      canViewNpcRoles: true,
      roomNpcRoles,
      roomRoles,
    })).toEqual({
      totalRoleCount: 3,
      visibleNpcRoles: roomNpcRoles,
    });

    expect(buildRoomSettingRoleView({
      canViewNpcRoles: false,
      roomNpcRoles,
      roomRoles,
    })).toEqual({
      totalRoleCount: 1,
      visibleNpcRoles: [],
    });
  });
});

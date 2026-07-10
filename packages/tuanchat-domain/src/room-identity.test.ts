import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { describe, expect, it } from "vitest";

import {
  pickDefaultAvatarId,
  resolveCurrentRoomRoleId,
  resolveSelectableRoomRoles,
  resolveSendIdentity,
} from "./room-identity";

function role(roleId: number, userId: number, type = 0): UserRole {
  return { roleId, roleName: `R${roleId}`, type, userId };
}

describe("room identity helpers", () => {
  it("观战强制旁白身份，普通成员不能保留旁白", () => {
    expect(resolveCurrentRoomRoleId({
      fallbackRoleId: 10,
      isSpaceOwner: false,
      isSpectator: true,
      storedRoleId: 10,
    })).toBe(-1);

    expect(resolveCurrentRoomRoleId({
      availableRoleIds: new Set([10]),
      fallbackRoleId: 10,
      isSpaceOwner: false,
      isSpectator: false,
      storedRoleId: -1,
    })).toBe(10);
  });

  it("主持可控制 NPC，普通用户只能控制自己拥有的玩家角色", () => {
    const baseRoles = [role(1, 7), role(2, 8)];
    const npcRoles = [role(9, 7, 2)];

    expect(resolveSelectableRoomRoles({
      isSpaceOwner: true,
      isSpectator: false,
      roomBaseRoles: baseRoles,
      roomNpcRoles: npcRoles,
      userRoles: [role(1, 7)],
    }).map(item => item.roleId)).toEqual([1, 2, 9]);

    expect(resolveSelectableRoomRoles({
      isSpaceOwner: false,
      isSpectator: false,
      roomBaseRoles: baseRoles,
      roomNpcRoles: npcRoles,
      userRoles: [role(1, 7)],
    }).map(item => item.roleId)).toEqual([1]);
  });

  it("发送身份会补 avatarId、清理 customRoleName，并转换观战发言", () => {
    expect(resolveSendIdentity({
      currentAvatarId: 99,
      customRoleName: "  化名  ",
      isSpectator: false,
      roleId: 1,
    })).toEqual({
      avatarId: 99,
      content: undefined,
      customRoleName: "化名",
      roleId: 1,
    });

    expect(resolveSendIdentity({
      inputContent: "场外提示",
      isSpectator: true,
      roleId: 1,
    })).toMatchObject({
      avatarId: -1,
      content: "(场外提示)",
      roleId: -1,
    });
  });

  it("未选中角色时不会沿用角色头像", () => {
    expect(resolveSendIdentity({
      currentAvatarId: 99,
      customRoleName: "化名",
      inputContent: "普通发言",
      isSpaceOwner: true,
      isSpectator: false,
      roleId: -1,
    })).toEqual({
      avatarId: -1,
      content: "普通发言",
      customRoleName: undefined,
      roleId: -1,
    });
  });

  it("优先选择标记为默认的头像", () => {
    expect(pickDefaultAvatarId([
      { avatarId: 1, avatarTitle: { label: "开心" } },
      { avatarId: 2, avatarTitle: { label: "默认" } },
    ])).toBe(2);
  });
});

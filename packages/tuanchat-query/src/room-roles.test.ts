import { describe, expect, it, vi } from "vitest";

import { fetchRoomRoleGroups, fetchUserRolesByTypes } from "./room-roles";

describe("room role query helpers", () => {
  it("一次请求返回房间角色分组", async () => {
    const roomAllRole = vi.fn().mockResolvedValue({
      success: true,
      data: {
        allRoles: [{ roleId: 1 }, { roleId: 2 }],
        baseRoles: [{ roleId: 1 }],
        npcRoles: [{ roleId: 2 }],
      },
    });
    const roomRole = vi.fn();
    const roomNpcRole = vi.fn();
    const client = { roomRoleController: { roomAllRole, roomRole, roomNpcRole } } as any;

    await expect(fetchRoomRoleGroups(client, 9)).resolves.toEqual({
      allRoles: [{ roleId: 1 }, { roleId: 2 }],
      baseRoles: [{ roleId: 1 }],
      npcRoles: [{ roleId: 2 }],
    });
    expect(roomAllRole).toHaveBeenCalledOnce();
    expect(roomAllRole).toHaveBeenCalledWith(9);
    expect(roomRole).not.toHaveBeenCalled();
    expect(roomNpcRole).not.toHaveBeenCalled();
  });

  it("一次获取用户角色后在前端按类型过滤", async () => {
    const getUserRoles = vi.fn().mockResolvedValue({
      data: [
        { roleId: 1, type: 0 },
        { roleId: 2, type: 1 },
        { roleId: 3, type: 2 },
      ],
    });
    const client = { roleController: { getUserRoles } } as any;

    await expect(fetchUserRolesByTypes(client, 7, [0, 2])).resolves.toEqual([
      { roleId: 1, type: 0 },
      { roleId: 3, type: 2 },
    ]);
    expect(getUserRoles).toHaveBeenCalledOnce();
    expect(getUserRoles).toHaveBeenCalledWith(7);
  });
});

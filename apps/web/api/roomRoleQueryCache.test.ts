import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  invalidateRoomRoleQueries,
  optimisticAddRoomRoleQueryCache,
  optimisticAddSpaceRoleQueryCache,
  optimisticRemoveRoomRoleQueryCache,
  reconcileAddRoomRoleQueryCache,
  rollbackAddRoomRoleQueryCache,
  rollbackAddSpaceRoleQueryCache,
  rollbackRemoveRoomRoleQueryCache,
  roomNpcRoleQueryKey,
  roomAllRoleQueryKey,
  roomRoleQueryKey,
} from "./roomRoleQueryCache";

function role(roleId: number, type = 0): UserRole {
  return {
    userId: 10000 + roleId,
    roleId,
    roleName: `role-${roleId}`,
    type,
  };
}

describe("roomRoleQueryCache", () => {
  it("添加空间角色即时写入空间角色缓存并支持回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getRole", 12], { success: true, data: role(12, 2) });
    queryClient.setQueryData(["spaceRole", 7], { success: true, data: [role(11)] });

    const transaction = await optimisticAddSpaceRoleQueryCache(queryClient, {
      roleId: 12,
      spaceId: 7,
      type: 2,
    });
    expect(queryClient.getQueryData<any>(["spaceRole", 7])?.data.map((item: UserRole) => item.roleId))
      .toEqual([11, 12]);
    rollbackAddSpaceRoleQueryCache(queryClient, transaction);
    expect(queryClient.getQueryData<any>(["spaceRole", 7])?.data.map((item: UserRole) => item.roleId))
      .toEqual([11]);
  });

  it("会按角色类型乐观加入房间角色缓存并可回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getRole", 12], { success: true, data: role(12, 2) });
    queryClient.setQueryData(roomRoleQueryKey(7), { success: true, data: [role(11)] });
    queryClient.setQueryData(roomNpcRoleQueryKey(7), { success: true, data: [] });

    const snapshot = await optimisticAddRoomRoleQueryCache(queryClient, {
      roomId: 7,
      roleIdList: [11, 12],
    });

    expect(queryClient.getQueryData<any>(roomRoleQueryKey(7))?.data.map((item: UserRole) => item.roleId)).toEqual([11]);
    expect(queryClient.getQueryData<any>(roomNpcRoleQueryKey(7))?.data.map((item: UserRole) => item.roleId)).toEqual([12]);

    rollbackAddRoomRoleQueryCache(queryClient, snapshot);

    expect(queryClient.getQueryData<any>(roomRoleQueryKey(7))?.data.map((item: UserRole) => item.roleId)).toEqual([11]);
    expect(queryClient.getQueryData<any>(roomNpcRoleQueryKey(7))?.data).toEqual([]);
  });

  it("成功返回后会再次校准缓存，并在 settled 失效角色查询", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(["getRole", 21], { success: true, data: role(21) });
    queryClient.setQueryData(roomRoleQueryKey(8), { success: true, data: [] });

    reconcileAddRoomRoleQueryCache(queryClient, {
      roomId: 8,
      roleIdList: [21],
    });
    await invalidateRoomRoleQueries(queryClient, 8);

    expect(queryClient.getQueryData<any>(roomRoleQueryKey(8))?.data.map((item: UserRole) => item.roleId)).toEqual([21]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: roomRoleQueryKey(8) });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: roomNpcRoleQueryKey(8) });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: roomAllRoleQueryKey(8) });
  });

  it("移除房间角色会同步三种分组缓存并支持回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(roomRoleQueryKey(7), { success: true, data: [role(11), role(12)] });
    queryClient.setQueryData(roomNpcRoleQueryKey(7), { success: true, data: [role(13, 2)] });
    queryClient.setQueryData(roomAllRoleQueryKey(7), {
      success: true,
      data: {
        allRoles: [role(11), role(12), role(13, 2)],
        baseRoles: [role(11), role(12)],
        npcRoles: [role(13, 2)],
      },
    });

    const transaction = await optimisticRemoveRoomRoleQueryCache(queryClient, {
      roomId: 7,
      roleIdList: [12, 13],
    });
    expect(queryClient.getQueryData<any>(roomRoleQueryKey(7))?.data.map((item: UserRole) => item.roleId)).toEqual([11]);
    expect(queryClient.getQueryData<any>(roomNpcRoleQueryKey(7))?.data).toEqual([]);
    expect(queryClient.getQueryData<any>(roomAllRoleQueryKey(7))?.data.allRoles.map((item: UserRole) => item.roleId)).toEqual([11]);

    rollbackRemoveRoomRoleQueryCache(queryClient, transaction);
    expect(queryClient.getQueryData<any>(roomRoleQueryKey(7))?.data.map((item: UserRole) => item.roleId)).toEqual([11, 12]);
  });
});

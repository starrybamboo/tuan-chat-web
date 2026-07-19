import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { rollbackOptimisticQueryTransaction } from "./optimistic-cache";
import {
  beginAvatarDeleteOptimisticMutation,
  beginAvatarDeleteManyOptimisticMutation,
  beginAvatarUpdateOptimisticMutation,
  beginRoleDeleteOptimisticMutation,
  beginRoleUpdateOptimisticMutation,
  fetchRoleAvatarCollectionSync,
  fetchRoleCollectionSync,
  getRoleAvatarListQueryKey,
  mergeRoleAvatarCollectionSync,
  mergeRoleCollectionSync,
} from "./roles";

const role = {
  roleId: 7,
  roleName: "旧角色",
  type: 0,
  userId: 1,
};

describe("role optimistic cache", () => {
  it("按游标读取并重放角色、头像墓碑", async () => {
    const syncUserRoles = vi.fn<(userId: number, afterSyncId?: number) => Promise<unknown>>().mockResolvedValue({
      success: true,
      data: { baseline: false, latestSyncId: 12, roles: [{ ...role, syncId: 12, state: 2 }] },
    });
    const syncRoleAvatars = vi.fn<(roleId: number, afterSyncId?: number) => Promise<unknown>>().mockResolvedValue({
      success: true,
      data: { baseline: false, latestSyncId: 8, avatars: [{ roleId: 7, avatarId: 11, syncId: 8, state: 2 }] },
    });
    const client = {
      roleController: { syncUserRoles },
      avatarController: { syncRoleAvatars },
    } as any;

    const roleResponse = await fetchRoleCollectionSync(client, 1, 10);
    const avatarResponse = await fetchRoleAvatarCollectionSync(client, 7, 6);
    expect(syncUserRoles).toHaveBeenCalledWith(1, 10);
    expect(syncRoleAvatars).toHaveBeenCalledWith(7, 6);
    expect(mergeRoleCollectionSync([role], roleResponse)).toEqual([]);
    expect(mergeRoleAvatarCollectionSync([{ roleId: 7, avatarId: 11 }], avatarResponse)).toEqual([]);
  });

  it("角色更新同步详情、列表和批量元数据", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getRole", 7], { success: true, data: role });
    queryClient.setQueryData(["getUserRolesByTypes", 1, 0, 1], [role]);
    queryClient.setQueryData(["clientMetadataBatch", [7], [], []], { roles: { 7: role } });

    const transaction = await beginRoleUpdateOptimisticMutation(queryClient, {
      roleId: 7,
      roleName: "新角色",
      description: "新简介",
    });

    expect(queryClient.getQueryData<any>(["getRole", 7])?.data).toMatchObject({
      roleName: "新角色",
      description: "新简介",
    });
    expect(queryClient.getQueryData<any[]>(["getUserRolesByTypes", 1, 0, 1])?.[0].roleName).toBe("新角色");
    expect(queryClient.getQueryData<any>(["clientMetadataBatch", [7], [], []])?.roles[7].roleName).toBe("新角色");

    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData<any>(["getRole", 7])?.data).toEqual(role);
  });

  it("角色更新失败回滚不会覆盖并发到达的新详情", async () => {
    const queryClient = new QueryClient();
    const queryKey = ["getRole", 7] as const;
    queryClient.setQueryData(queryKey, { success: true, data: role });

    const transaction = await beginRoleUpdateOptimisticMutation(queryClient, {
      roleId: 7,
      roleName: "乐观角色",
    });
    const newerData = { success: true, data: { ...role, roleName: "推送角色" } };
    queryClient.setQueryData(queryKey, newerData);
    rollbackOptimisticQueryTransaction(queryClient, transaction);

    expect(queryClient.getQueryData(queryKey)).toEqual(newerData);
  });

  it("删除角色即时移出活动列表并支持失败回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getUserRolesByTypes", 1, 0, 1], [role]);

    const transaction = await beginRoleDeleteOptimisticMutation(queryClient, [7]);

    expect(queryClient.getQueryData<any[]>(["getUserRolesByTypes", 1, 0, 1])).toEqual([]);
    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData<any[]>(["getUserRolesByTypes", 1, 0, 1])).toEqual([role]);
  });

  it("头像更新与删除同步单角色和批量头像缓存", async () => {
    const queryClient = new QueryClient();
    const avatar = { avatarId: 11, avatarTitle: { default: "旧名" }, roleId: 7 };
    queryClient.setQueryData(getRoleAvatarListQueryKey(7), [avatar]);
    queryClient.setQueryData(["roleAvatarListsBatch", [7]], { 7: [avatar] });

    await beginAvatarUpdateOptimisticMutation(queryClient, {
      ...avatar,
      avatarTitle: { default: "新名" },
    });
    expect(queryClient.getQueryData<any[]>(getRoleAvatarListQueryKey(7))?.[0].avatarTitle.default).toBe("新名");
    expect(queryClient.getQueryData<any>(["roleAvatarListsBatch", [7]])?.[7][0].avatarTitle.default).toBe("新名");

    await beginAvatarDeleteOptimisticMutation(queryClient, 7, 11);
    expect(queryClient.getQueryData(getRoleAvatarListQueryKey(7))).toEqual([]);
    expect(queryClient.getQueryData<any>(["roleAvatarListsBatch", [7]])?.[7]).toEqual([]);

    queryClient.setQueryData(getRoleAvatarListQueryKey(7), [avatar, { ...avatar, avatarId: 12 }]);
    await beginAvatarDeleteManyOptimisticMutation(queryClient, 7, [11, 12]);
    expect(queryClient.getQueryData(getRoleAvatarListQueryKey(7))).toEqual([]);
  });
});

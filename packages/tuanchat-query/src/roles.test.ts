import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { rollbackOptimisticQueryTransaction } from "./optimistic-cache";
import {
  beginAvatarDeleteOptimisticMutation,
  beginAvatarDeleteManyOptimisticMutation,
  beginAvatarUpdateOptimisticMutation,
  beginClearRoleTrashOptimisticMutation,
  beginHardDeleteRolesOptimisticMutation,
  beginRoleDeleteOptimisticMutation,
  beginRoleUpdateOptimisticMutation,
  getRoleAvatarListQueryKey,
} from "./roles";

const role = {
  roleId: 7,
  roleName: "旧角色",
  type: 0,
  userId: 1,
};

describe("role optimistic cache", () => {
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

  it("删除角色即时移出活动列表并加入回收站", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["getUserRolesByTypes", 1, 0, 1], [role]);
    queryClient.setQueryData(["getDeletedUserRolesPage", 1, 1, 20, ""], {
      success: true,
      data: { list: [], totalRecords: 0 },
    });

    const transaction = await beginRoleDeleteOptimisticMutation(queryClient, [7]);

    expect(queryClient.getQueryData<any[]>(["getUserRolesByTypes", 1, 0, 1])).toEqual([]);
    expect(queryClient.getQueryData<any>(["getDeletedUserRolesPage", 1, 1, 20, ""])?.data).toMatchObject({
      list: [{ ...role, state: 1 }],
      totalRecords: 1,
    });
    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData<any[]>(["getUserRolesByTypes", 1, 0, 1])).toEqual([role]);
  });

  it("永久删除与清空回收站即时移除回收站数据", async () => {
    const queryClient = new QueryClient();
    const key = ["getDeletedUserRolesPage", 1, 1, 20, ""] as const;
    queryClient.setQueryData(key, {
      success: true,
      data: { list: [role, { ...role, roleId: 8 }], totalRecords: 2 },
    });

    await beginHardDeleteRolesOptimisticMutation(queryClient, [7]);
    expect(queryClient.getQueryData<any>(key)?.data.list.map((item: any) => item.roleId)).toEqual([8]);

    await beginClearRoleTrashOptimisticMutation(queryClient);
    expect(queryClient.getQueryData<any>(key)?.data).toMatchObject({ list: [], totalRecords: 0 });
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

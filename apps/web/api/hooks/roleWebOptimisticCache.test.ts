import { QueryClient } from "@tanstack/react-query";
import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";
import { describe, expect, it } from "vitest";

import {
  beginClearDeletedRoleAvatarsOptimisticMutation,
  beginClearSpaceNpcRoleTrashOptimisticMutation,
  beginDeleteRoleAvatarVariantOptimisticMutation,
  beginRestoreRoleAvatarOptimisticMutation,
  beginUpdateRoleAvatarVariantOptimisticMutation,
} from "./roleWebOptimisticCache";

describe("role web optimistic cache", () => {
  it("恢复头像即时从回收站移回活动列表", async () => {
    const queryClient = new QueryClient();
    const avatar = { avatarId: 11, roleId: 7, state: 1 };
    queryClient.setQueryData(["getDeletedRoleAvatars", 7], { success: true, data: [avatar] });
    queryClient.setQueryData(["getRoleAvatars", 7], { success: true, data: [] });

    const restoreTransaction = await beginRestoreRoleAvatarOptimisticMutation(queryClient, 7, 11);
    expect(queryClient.getQueryData<any>(["getDeletedRoleAvatars", 7])?.data).toEqual([]);
    expect(queryClient.getQueryData<any>(["getRoleAvatars", 7])?.data).toEqual([{ ...avatar, state: 0 }]);
    rollbackOptimisticQueryTransaction(queryClient, restoreTransaction);
    expect(queryClient.getQueryData<any>(["getDeletedRoleAvatars", 7])?.data).toEqual([avatar]);
    expect(queryClient.getQueryData<any>(["getRoleAvatars", 7])?.data).toEqual([]);

    const clearTransaction = await beginClearDeletedRoleAvatarsOptimisticMutation(queryClient, 7);
    expect(queryClient.getQueryData<any>(["getDeletedRoleAvatars", 7])?.data).toEqual([]);
    rollbackOptimisticQueryTransaction(queryClient, clearTransaction);
    expect(queryClient.getQueryData<any>(["getDeletedRoleAvatars", 7])?.data).toEqual([avatar]);
  });

  it("立绘组更新与删除即时同步列表", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["roleAvatarVariants", 7], {
      success: true,
      data: [{ name: "旧组", roleId: 7, variantId: 3 }],
    });

    const updateTransaction = await beginUpdateRoleAvatarVariantOptimisticMutation(
      queryClient,
      7,
      { variantId: 3, name: "新组" },
    );
    expect(queryClient.getQueryData<any>(["roleAvatarVariants", 7])?.data[0].name).toBe("新组");
    rollbackOptimisticQueryTransaction(queryClient, updateTransaction);
    expect(queryClient.getQueryData<any>(["roleAvatarVariants", 7])?.data[0].name).toBe("旧组");

    const deleteTransaction = await beginDeleteRoleAvatarVariantOptimisticMutation(queryClient, 7, 3);
    expect(queryClient.getQueryData<any>(["roleAvatarVariants", 7])?.data).toEqual([]);
    rollbackOptimisticQueryTransaction(queryClient, deleteTransaction);
    expect(queryClient.getQueryData<any>(["roleAvatarVariants", 7])?.data[0].name).toBe("旧组");

    const emptyTransaction = await beginUpdateRoleAvatarVariantOptimisticMutation(queryClient, 7, { name: "无 ID" });
    expect(emptyTransaction.entries).toEqual([]);
  });

  it("清空空间 NPC 角色回收站会覆盖分页缓存并支持回滚", async () => {
    const queryClient = new QueryClient();
    const pageKey = ["getDeletedSpaceNpcRolesPage", 7, { pageNo: 1 }] as const;
    const original = {
      success: true,
      data: {
        list: [{ roleId: 11 }],
        totalRecords: 1,
      },
    };
    queryClient.setQueryData(pageKey, original);

    const transaction = await beginClearSpaceNpcRoleTrashOptimisticMutation(queryClient, 7);
    expect(queryClient.getQueryData<any>(pageKey)?.data).toMatchObject({ list: [], totalRecords: 0 });

    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData(pageKey)).toEqual(original);
  });
});

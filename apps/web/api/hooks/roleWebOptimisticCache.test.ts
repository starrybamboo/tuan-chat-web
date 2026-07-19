import { QueryClient } from "@tanstack/react-query";
import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";
import { describe, expect, it } from "vitest";

import {
  beginDeleteRoleAvatarVariantOptimisticMutation,
  beginUpdateRoleAvatarVariantOptimisticMutation,
} from "./roleWebOptimisticCache";

describe("role web optimistic cache", () => {
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
});

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  beginClearDeletedRoleAvatarsOptimisticMutation,
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

    await beginRestoreRoleAvatarOptimisticMutation(queryClient, 7, 11);
    expect(queryClient.getQueryData<any>(["getDeletedRoleAvatars", 7])?.data).toEqual([]);
    expect(queryClient.getQueryData<any>(["getRoleAvatars", 7])?.data).toEqual([{ ...avatar, state: 0 }]);

    queryClient.setQueryData(["getDeletedRoleAvatars", 7], { success: true, data: [avatar] });
    await beginClearDeletedRoleAvatarsOptimisticMutation(queryClient, 7);
    expect(queryClient.getQueryData<any>(["getDeletedRoleAvatars", 7])?.data).toEqual([]);
  });

  it("立绘组更新与删除即时同步列表", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["roleAvatarVariants", 7], {
      success: true,
      data: [{ name: "旧组", roleId: 7, variantId: 3 }],
    });

    await beginUpdateRoleAvatarVariantOptimisticMutation(queryClient, 7, { variantId: 3, name: "新组" });
    expect(queryClient.getQueryData<any>(["roleAvatarVariants", 7])?.data[0].name).toBe("新组");
    await beginDeleteRoleAvatarVariantOptimisticMutation(queryClient, 7, 3);
    expect(queryClient.getQueryData<any>(["roleAvatarVariants", 7])?.data).toEqual([]);
  });
});

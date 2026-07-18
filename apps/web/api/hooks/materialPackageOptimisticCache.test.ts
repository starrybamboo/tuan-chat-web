import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  beginMaterialPackageDeleteOptimisticMutation,
  beginMaterialPackageUpdateOptimisticMutation,
  rollbackMaterialPackageOptimisticMutation,
} from "./materialPackageOptimisticCache";

describe("material package optimistic cache", () => {
  it("更新和删除同时覆盖普通分页与无限分页缓存", async () => {
    const queryClient = new QueryClient();
    const item = { packageId: 7, name: "旧名称", isPublic: false, content: {} };
    const pageKey = ["materialPackage", "my", { pageNo: 1 }] as const;
    const infiniteKey = ["materialPackage", "my", "infinite", { pageNo: 1 }] as const;
    queryClient.setQueryData(pageKey, { success: true, data: { list: [item] } });
    queryClient.setQueryData(infiniteKey, { pages: [{ success: true, data: { list: [item] } }], pageParams: [] });

    const transaction = await beginMaterialPackageUpdateOptimisticMutation(queryClient, {
      packageId: 7,
      name: "新名称",
      isPublic: true,
      content: {},
    });
    expect(queryClient.getQueryData<any>(pageKey)?.data.list[0]).toMatchObject({ name: "新名称", isPublic: true });
    expect(queryClient.getQueryData<any>(infiniteKey)?.pages[0].data.list[0].name).toBe("新名称");

    rollbackMaterialPackageOptimisticMutation(queryClient, transaction);
    expect(queryClient.getQueryData<any>(pageKey)?.data.list[0]).toEqual(item);

    await beginMaterialPackageDeleteOptimisticMutation(queryClient, 7);
    expect(queryClient.getQueryData<any>(pageKey)?.data.list).toEqual([]);
    expect(queryClient.getQueryData<any>(infiniteKey)?.pages[0].data.list).toEqual([]);
  });
});

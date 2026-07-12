import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "./optimistic-cache";

describe("optimistic-cache", () => {
  it("统一更新同前缀的多条缓存并回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["items", { page: 1 }], [1, 2]);
    queryClient.setQueryData(["items", { page: 2 }], [2, 3]);

    const transaction = await beginOptimisticQueryTransaction(queryClient, [
      optimisticQueryPatch<number[]>({
        queryKey: ["items"],
        exact: false,
        update: current => current?.filter(item => item !== 2),
      }),
    ]);

    expect(queryClient.getQueryData(["items", { page: 1 }])).toEqual([1]);
    expect(queryClient.getQueryData(["items", { page: 2 }])).toEqual([3]);

    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData(["items", { page: 1 }])).toEqual([1, 2]);
    expect(queryClient.getQueryData(["items", { page: 2 }])).toEqual([2, 3]);
  });

  it("回滚时保留并发产生的较新缓存", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["item", 1], { count: 1 });

    const transaction = await beginOptimisticQueryTransaction(queryClient, [
      optimisticQueryPatch<{ count: number }>({
        queryKey: ["item", 1],
        update: current => ({ count: (current?.count ?? 0) + 1 }),
      }),
    ]);
    queryClient.setQueryData(["item", 1], { count: 3 });

    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData(["item", 1])).toEqual({ count: 3 });
  });

  it("回滚事务创建的临时缓存", async () => {
    const queryClient = new QueryClient();
    const transaction = await beginOptimisticQueryTransaction(queryClient, [
      optimisticQueryPatch<{ selected: boolean }>({
        queryKey: ["selection", 7],
        update: () => ({ selected: true }),
      }),
    ]);

    expect(queryClient.getQueryData(["selection", 7])).toEqual({ selected: true });
    rollbackOptimisticQueryTransaction(queryClient, transaction);
    expect(queryClient.getQueryData(["selection", 7])).toBeUndefined();
  });
});

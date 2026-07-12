import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type OptimisticQueryPatch<TData = unknown> = {
  queryKey: QueryKey;
  exact?: boolean;
  update: (current: TData | undefined, queryKey: QueryKey) => TData | undefined;
};

type OptimisticQueryPatchInternal = OptimisticQueryPatch<unknown>;

export type OptimisticQueryTransactionEntry = {
  queryKey: QueryKey;
  hadData: boolean;
  previousData: unknown;
  optimisticData: unknown;
};

export type OptimisticQueryTransaction = {
  entries: OptimisticQueryTransactionEntry[];
};

/** 保留具体缓存类型推断，并将 patch 交给统一事务执行器。 */
export function optimisticQueryPatch<TData>(patch: OptimisticQueryPatch<TData>): OptimisticQueryPatchInternal {
  return patch as OptimisticQueryPatchInternal;
}

/** 统一执行取消查询、记录快照和即时缓存写入。 */
export async function beginOptimisticQueryTransaction(
  queryClient: QueryClient,
  patches: OptimisticQueryPatchInternal[],
): Promise<OptimisticQueryTransaction> {
  await Promise.all(patches.map(patch => queryClient.cancelQueries({
    queryKey: patch.queryKey,
    exact: patch.exact ?? true,
  })));

  const transaction: OptimisticQueryTransaction = { entries: [] };
  for (const patch of patches) {
    const exact = patch.exact ?? true;
    const queryEntries = queryClient.getQueriesData({ queryKey: patch.queryKey, exact });
    if (queryEntries.length === 0 && exact) {
      const optimisticData = patch.update(undefined, patch.queryKey);
      if (optimisticData !== undefined) {
        const storedOptimisticData = queryClient.setQueryData(patch.queryKey, optimisticData);
        transaction.entries.push({
          queryKey: patch.queryKey,
          hadData: false,
          previousData: undefined,
          optimisticData: storedOptimisticData,
        });
      }
      continue;
    }

    for (const [queryKey, previousData] of queryEntries) {
      const optimisticData = patch.update(previousData, queryKey);
      if (optimisticData === undefined || optimisticData === previousData) {
        continue;
      }
      const storedOptimisticData = queryClient.setQueryData(queryKey, optimisticData);
      transaction.entries.push({
        queryKey,
        hadData: true,
        previousData,
        optimisticData: storedOptimisticData,
      });
    }
  }
  return transaction;
}

/** 失败时按相反顺序回滚；并发新写入已经替换缓存时保留较新的结果。 */
export function rollbackOptimisticQueryTransaction(
  queryClient: QueryClient,
  transaction?: OptimisticQueryTransaction,
): void {
  if (!transaction) {
    return;
  }

  for (const entry of [...transaction.entries].reverse()) {
    if (queryClient.getQueryData(entry.queryKey) !== entry.optimisticData) {
      continue;
    }
    if (entry.hadData) {
      queryClient.setQueryData(entry.queryKey, entry.previousData);
      continue;
    }
    queryClient.removeQueries({ queryKey: entry.queryKey, exact: true });
  }
}

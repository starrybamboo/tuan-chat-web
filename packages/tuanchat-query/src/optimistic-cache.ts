import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { hashKey } from "@tanstack/react-query";

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
  optimisticDataUpdateCount: number;
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
  const entryIndexByQueryHash = new Map<string, number>();
  for (const patch of patches) {
    const exact = patch.exact ?? true;
    const queryEntries = queryClient.getQueriesData({ queryKey: patch.queryKey, exact });
    if (queryEntries.length === 0 && exact) {
      const optimisticData = patch.update(undefined, patch.queryKey);
      if (optimisticData !== undefined) {
        const storedOptimisticData = queryClient.setQueryData(patch.queryKey, optimisticData);
        recordOptimisticQueryWrite(
          queryClient,
          transaction,
          entryIndexByQueryHash,
          patch.queryKey,
          false,
          undefined,
          storedOptimisticData,
        );
      }
      continue;
    }

    for (const [queryKey, previousData] of queryEntries) {
      const optimisticData = patch.update(previousData, queryKey);
      if (optimisticData === undefined || optimisticData === previousData) {
        continue;
      }
      const storedOptimisticData = queryClient.setQueryData(queryKey, optimisticData);
      recordOptimisticQueryWrite(
        queryClient,
        transaction,
        entryIndexByQueryHash,
        queryKey,
        true,
        previousData,
        storedOptimisticData,
      );
    }
  }
  return transaction;
}

/** 同一事务多次命中同一 Query 时，保留首次快照和最终乐观版本。 */
function recordOptimisticQueryWrite(
  queryClient: QueryClient,
  transaction: OptimisticQueryTransaction,
  entryIndexByQueryHash: Map<string, number>,
  queryKey: QueryKey,
  hadData: boolean,
  previousData: unknown,
  optimisticData: unknown,
): void {
  const queryHash = hashKey(queryKey);
  const existingIndex = entryIndexByQueryHash.get(queryHash);
  const optimisticDataUpdateCount = queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0;
  if (existingIndex !== undefined) {
    transaction.entries[existingIndex] = {
      ...transaction.entries[existingIndex],
      optimisticData,
      optimisticDataUpdateCount,
    };
    return;
  }

  entryIndexByQueryHash.set(queryHash, transaction.entries.length);
  transaction.entries.push({
    queryKey,
    hadData,
    previousData,
    optimisticData,
    optimisticDataUpdateCount,
  });
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
    const currentState = queryClient.getQueryState(entry.queryKey);
    if (
      !currentState
      || currentState.data !== entry.optimisticData
      || currentState.dataUpdateCount !== entry.optimisticDataUpdateCount
    ) {
      continue;
    }
    if (entry.hadData) {
      queryClient.setQueryData(entry.queryKey, entry.previousData);
      continue;
    }
    queryClient.removeQueries({ queryKey: entry.queryKey, exact: true });
  }
}

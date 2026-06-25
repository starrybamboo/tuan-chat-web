import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import type { ApiResultSpaceSidebarTreeResponse } from "@tuanchat/openapi-client/models/ApiResultSpaceSidebarTreeResponse";
import type { SpaceSidebarTreeSetRequest } from "@tuanchat/openapi-client/models/SpaceSidebarTreeSetRequest";
import { tuanchat } from "../instance";

const OPTIMISTIC_SPACE_SIDEBAR_TREE_FLAG = "__tcOptimisticSpaceSidebarTree";

export type SpaceSidebarTreeQueryResponse = ApiResultSpaceSidebarTreeResponse & {
  [OPTIMISTIC_SPACE_SIDEBAR_TREE_FLAG]?: true;
};

export function spaceSidebarTreeQueryKey(spaceId: number) {
  return ["getSpaceSidebarTree", spaceId] as const;
}

export function isOptimisticSpaceSidebarTreeResponse(
  response: ApiResultSpaceSidebarTreeResponse | undefined | null,
): boolean {
  return Boolean((response as SpaceSidebarTreeQueryResponse | undefined)?.[OPTIMISTIC_SPACE_SIDEBAR_TREE_FLAG]);
}

export function buildOptimisticSpaceSidebarTreeResponse(
  previous: SpaceSidebarTreeQueryResponse | undefined,
  req: SpaceSidebarTreeSetRequest,
): SpaceSidebarTreeQueryResponse {
  const optimisticVersion = req.expectedVersion + 1;

  return {
    ...previous,
    [OPTIMISTIC_SPACE_SIDEBAR_TREE_FLAG]: true,
    success: true,
    errCode: undefined,
    errMsg: undefined,
    data: {
      ...previous?.data,
      spaceId: req.spaceId,
      version: optimisticVersion,
      treeJson: req.treeJson,
    },
  };
}

export function syncSpaceSidebarTreeSetRequestVersion(
  previous: SpaceSidebarTreeQueryResponse | undefined,
  req: SpaceSidebarTreeSetRequest,
): SpaceSidebarTreeSetRequest {
  const previousVersion = previous?.data?.version;
  const expectedVersion = Math.max(
    typeof previousVersion === "number" ? previousVersion : 0,
    req.expectedVersion,
  );
  return expectedVersion === req.expectedVersion
    ? req
    : { ...req, expectedVersion };
}

export function isSameSpaceSidebarTreeSnapshot(
  current: SpaceSidebarTreeQueryResponse | undefined,
  snapshot: SpaceSidebarTreeQueryResponse | undefined,
): boolean {
  return current?.data?.spaceId === snapshot?.data?.spaceId
    && current?.data?.treeJson === snapshot?.data?.treeJson
    && current?.data?.version === snapshot?.data?.version;
}

export function useGetSpaceSidebarTreeQuery(spaceId: number) {
  return useQuery({
    queryKey: spaceSidebarTreeQueryKey(spaceId),
    queryFn: () => tuanchat.spaceSidebarTreeController.getSidebarTree(spaceId),
    enabled: spaceId > 0,
    staleTime: 60_000,
  });
}

export type SetSpaceSidebarTreeMutationContext = {
  optimistic: SpaceSidebarTreeQueryResponse;
  previous?: SpaceSidebarTreeQueryResponse;
};

export async function optimisticSetSpaceSidebarTreeQueryCache(
  queryClient: QueryClient,
  variables: SpaceSidebarTreeSetRequest,
): Promise<SetSpaceSidebarTreeMutationContext> {
  const queryKey = spaceSidebarTreeQueryKey(variables.spaceId);
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<SpaceSidebarTreeQueryResponse>(queryKey);
  const latestVersionRequest = syncSpaceSidebarTreeSetRequestVersion(previous, variables);
  variables.expectedVersion = latestVersionRequest.expectedVersion;
  const optimistic = buildOptimisticSpaceSidebarTreeResponse(previous, variables);
  queryClient.setQueryData(queryKey, optimistic);
  return { optimistic, previous };
}

export function rollbackSpaceSidebarTreeQueryCache(
  queryClient: QueryClient,
  variables: SpaceSidebarTreeSetRequest,
  context?: SetSpaceSidebarTreeMutationContext,
): void {
  const queryKey = spaceSidebarTreeQueryKey(variables.spaceId);
  if (!context) {
    queryClient.invalidateQueries({ queryKey });
    return;
  }
  const current = queryClient.getQueryData<SpaceSidebarTreeQueryResponse>(queryKey);
  let shouldInvalidate = !isOptimisticSpaceSidebarTreeResponse(current);
  // 连续保存时，旧请求失败不应覆盖后一次已经写入的乐观树。
  if (isSameSpaceSidebarTreeSnapshot(current, context.optimistic)) {
    if (context.previous) {
      queryClient.setQueryData(queryKey, context.previous);
    }
    else {
      queryClient.removeQueries({ exact: true, queryKey });
    }
    shouldInvalidate = true;
  }
  if (shouldInvalidate) {
    queryClient.invalidateQueries({ queryKey });
  }
}

export function settleSpaceSidebarTreeQueryCache(
  queryClient: QueryClient,
  res: ApiResultSpaceSidebarTreeResponse | undefined,
  variables: SpaceSidebarTreeSetRequest,
  context?: SetSpaceSidebarTreeMutationContext,
): void {
  if (res?.success) {
    const queryKey = spaceSidebarTreeQueryKey(variables.spaceId);
    const current = queryClient.getQueryData<SpaceSidebarTreeQueryResponse>(queryKey);
    if (!context || isSameSpaceSidebarTreeSnapshot(current, context.optimistic)) {
      queryClient.setQueryData(queryKey, res);
    }
    return;
  }
  rollbackSpaceSidebarTreeQueryCache(queryClient, variables, context);
}

export function invalidateSettledSpaceSidebarTreeQueryCache(
  queryClient: QueryClient,
  variables: SpaceSidebarTreeSetRequest,
  context?: SetSpaceSidebarTreeMutationContext,
): void {
  const queryKey = spaceSidebarTreeQueryKey(variables.spaceId);
  const current = queryClient.getQueryData<SpaceSidebarTreeQueryResponse>(queryKey);
  if (context && isOptimisticSpaceSidebarTreeResponse(current) && !isSameSpaceSidebarTreeSnapshot(current, context.optimistic)) {
    return;
  }
  queryClient.invalidateQueries({ queryKey });
}

export function useSetSpaceSidebarTreeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["setSpaceSidebarTree"],
    mutationFn: (req: SpaceSidebarTreeSetRequest) => tuanchat.spaceSidebarTreeController.setSidebarTree(req),
    onMutate: variables => optimisticSetSpaceSidebarTreeQueryCache(queryClient, variables),
    onSuccess: (res, variables, context) => {
      // 成功先用响应替换当前乐观缓存，settled 再由后台 refetch 校准最终版本。
      settleSpaceSidebarTreeQueryCache(queryClient, res, variables, context);
    },
    onError: (_err, variables, context) => {
      rollbackSpaceSidebarTreeQueryCache(queryClient, variables, context);
    },
    onSettled: (_res, _err, variables, context) => {
      invalidateSettledSpaceSidebarTreeQueryCache(queryClient, variables, context);
    },
  });
}

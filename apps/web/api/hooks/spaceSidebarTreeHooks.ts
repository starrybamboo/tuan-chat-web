import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiResultSpaceSidebarTreeResponse } from "@tuanchat/openapi-client/models/ApiResultSpaceSidebarTreeResponse";
import type { SpaceSidebarTreeSetRequest } from "@tuanchat/openapi-client/models/SpaceSidebarTreeSetRequest";
import { tuanchat } from "../instance";

export function spaceSidebarTreeQueryKey(spaceId: number) {
  return ["getSpaceSidebarTree", spaceId] as const;
}

export function buildOptimisticSpaceSidebarTreeResponse(
  previous: ApiResultSpaceSidebarTreeResponse | undefined,
  req: SpaceSidebarTreeSetRequest,
): ApiResultSpaceSidebarTreeResponse {
  const optimisticVersion = req.expectedVersion + 1;

  return {
    ...previous,
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
  previous: ApiResultSpaceSidebarTreeResponse | undefined,
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
  current: ApiResultSpaceSidebarTreeResponse | undefined,
  snapshot: ApiResultSpaceSidebarTreeResponse | undefined,
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

type SetSpaceSidebarTreeMutationContext = {
  optimistic: ApiResultSpaceSidebarTreeResponse;
  previous?: ApiResultSpaceSidebarTreeResponse;
};

export function useSetSpaceSidebarTreeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["setSpaceSidebarTree"],
    mutationFn: (req: SpaceSidebarTreeSetRequest) => tuanchat.spaceSidebarTreeController.setSidebarTree(req),
    onMutate: async (variables): Promise<SetSpaceSidebarTreeMutationContext> => {
      const queryKey = spaceSidebarTreeQueryKey(variables.spaceId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ApiResultSpaceSidebarTreeResponse>(queryKey);
      const latestVersionRequest = syncSpaceSidebarTreeSetRequestVersion(previous, variables);
      variables.expectedVersion = latestVersionRequest.expectedVersion;
      const optimistic = buildOptimisticSpaceSidebarTreeResponse(previous, variables);
      queryClient.setQueryData(queryKey, optimistic);
      return { optimistic, previous };
    },
    onSuccess: (res, variables, context) => {
      // 成功：直接更新缓存，避免额外 GET；失败/冲突：触发一次 refetch 获取最新 version。
      if (res?.success) {
        const queryKey = spaceSidebarTreeQueryKey(variables.spaceId);
        const current = queryClient.getQueryData<ApiResultSpaceSidebarTreeResponse>(queryKey);
        if (!context || isSameSpaceSidebarTreeSnapshot(current, context.optimistic)) {
          queryClient.setQueryData(queryKey, res);
        }
        return;
      }
      queryClient.invalidateQueries({ queryKey: spaceSidebarTreeQueryKey(variables.spaceId) });
    },
    onError: (_err, variables, context) => {
      const queryKey = spaceSidebarTreeQueryKey(variables.spaceId);
      if (!context) {
        queryClient.invalidateQueries({ queryKey });
        return;
      }
      const current = queryClient.getQueryData<ApiResultSpaceSidebarTreeResponse>(queryKey);
      // 连续保存时，旧请求失败不应覆盖后一次已经写入的乐观树。
      if (isSameSpaceSidebarTreeSnapshot(current, context.optimistic)) {
        if (context.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
        else {
          queryClient.removeQueries({ exact: true, queryKey });
        }
      }
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

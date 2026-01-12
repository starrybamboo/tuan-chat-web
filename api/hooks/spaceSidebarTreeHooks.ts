import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SpaceSidebarTreeSetRequest } from "../models/SpaceSidebarTreeSetRequest";
import { tuanchat } from "../instance";

export function useGetSpaceSidebarTreeQuery(spaceId: number) {
  return useQuery({
    queryKey: ["getSpaceSidebarTree", spaceId],
    queryFn: () => tuanchat.spaceSidebarTreeController.getSidebarTree(spaceId),
    enabled: spaceId > 0,
    staleTime: 60_000,
  });
}

export function useSetSpaceSidebarTreeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["setSpaceSidebarTree"],
    mutationFn: (req: SpaceSidebarTreeSetRequest) => tuanchat.spaceSidebarTreeController.setSidebarTree(req),
    onSuccess: (res, variables) => {
      // 成功：直接更新缓存，避免额外 GET；失败/冲突：触发一次 refetch 获取最新 version。
      if (res?.success) {
        queryClient.setQueryData(["getSpaceSidebarTree", variables.spaceId], res);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["getSpaceSidebarTree", variables.spaceId] });
    },
    onError: (_err, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getSpaceSidebarTree", variables.spaceId] });
    },
  });
}

import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useQuery } from "@tanstack/react-query";

import type { ResourceQueryOptions } from "./spaces";

type SpaceSidebarTreeClient = Pick<TuanChat, "spaceSidebarTreeController">;

export function getSpaceSidebarTreeQueryKey(spaceId: number) {
  return ["getSpaceSidebarTree", spaceId] as const;
}

export function useGetSpaceSidebarTreeQuery(
  client: SpaceSidebarTreeClient,
  spaceId: number,
  options?: ResourceQueryOptions,
) {
  return useQuery({
    queryKey: getSpaceSidebarTreeQueryKey(spaceId),
    queryFn: () => client.spaceSidebarTreeController.getSidebarTree(spaceId),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? spaceId > 0,
    retry: options?.retry,
  });
}

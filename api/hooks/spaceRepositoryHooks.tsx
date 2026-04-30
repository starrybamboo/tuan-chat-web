import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SPACE_ROLE_STALE_TIME_MS,
  spaceRepositoryRoleQueryKey,
} from "./chatQueryHooks";
import { tuanchat } from "../instance";
import { seedUserRoleListQueryCache } from "../roleQueryCache";

/**
 * 获取空间仓库角色
 * @param spaceId 空间ID
 */
export function useGetSpaceRepositoryRoleQuery(spaceId: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: spaceRepositoryRoleQueryKey(spaceId),
    queryFn: async () => {
      const res = await tuanchat.spaceRepositoryController.spaceRole(spaceId);
      seedUserRoleListQueryCache(queryClient, res.data);
      return res;
    },
    staleTime: SPACE_ROLE_STALE_TIME_MS,
  });
}

/**
 * 获取当前房间的物品
 * @param roomId 房间ID
 */
function useGetRoomItemsQuery(roomId: number) {
  return useQuery({
    queryKey: ["roomItems", roomId],
    queryFn: async () => ({ success: true, data: [] } as any),
    staleTime: 10000, // 缓存时间
    enabled: roomId >= 0,
  });
}

/**
 * 获取当前房间的地点
 * @param roomId 房间ID
 */
function useGetRoomLocationsQuery(roomId: number) {
  return useQuery({
    queryKey: ["roomLocations", roomId],
    queryFn: async () => ({ success: true, data: [] } as any),
    staleTime: 10000, // 缓存时间
    enabled: roomId >= 0,
  });
}

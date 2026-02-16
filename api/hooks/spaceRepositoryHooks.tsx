import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "../instance";

/**
 * 获取空间仓库角色
 * @param spaceId 空间ID
 */
export function useGetSpaceRepositoryRoleQuery(spaceId: number) {
  return useQuery({
      queryKey: ['spaceRepositoryRole', spaceId],
      queryFn: () => tuanchat.spaceRepositoryController.spaceRole(spaceId),
      staleTime: 10000, // 缓存时间
  });
}

/**
 * 获取当前房间的物品
 * @param roomId 房间ID
 */
function useGetRoomItemsQuery(roomId: number) {
  return useQuery({
    queryKey: ['roomItems', roomId],
    queryFn: async () => ({ success: true, data: [] } as any),
    staleTime: 10000, // 缓存时间
    enabled: roomId >= 0,
  })
}

/**
 * 获取当前房间的地点
 * @param roomId 房间ID
 */
function useGetRoomLocationsQuery(roomId: number) {
  return useQuery({
    queryKey: ['roomLocations', roomId],
    queryFn: async () => ({ success: true, data: [] } as any),
    staleTime: 10000, // 缓存时间
    enabled: roomId >= 0,
  })
}



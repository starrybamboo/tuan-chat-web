import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";

// 后端已下线「仓库导入群聊」相关接口；这里保留一个最小请求形状用于兼容旧调用点。
export type RepositoryImportByIdRequest = {
  spaceId: number;
  repositoryId: number;
};

/**
 * 仓库导入群聊
 */
export function useImportFromRepositoryMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ["importFromRepository"], 
    mutationFn: async (_req: RepositoryImportByIdRequest) => {
      throw new Error("仓库导入群聊接口已下线");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["getUserSpaces"]
      });
      queryClient.invalidateQueries({ queryKey: ['getUserRooms'] });
    }
  });
}

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


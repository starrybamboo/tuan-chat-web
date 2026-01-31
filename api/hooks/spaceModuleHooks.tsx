import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";

// 后端已下线「模组导入群聊」相关接口；这里保留一个最小请求形状用于兼容旧调用点。
export type ModuleImportByIdRequest = {
  spaceId: number;
  moduleId: number;
};

/**
 * 模组导入群聊
 */
export function useImportFromModuleMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ["importFromModule"], 
    mutationFn: async (_req: ModuleImportByIdRequest) => {
      throw new Error("模组导入群聊接口已下线");
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
 * 获取空间模组角色
 * @param spaceId 空间ID
 */
export function useGetSpaceModuleRoleQuery(spaceId: number) {
  return useQuery({
      queryKey: ['spaceModuleRole', spaceId],
      queryFn: () => tuanchat.spaceModuleController.spaceRole(spaceId),
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


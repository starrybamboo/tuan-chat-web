import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { ModuleImportByIdRequest } from "api/models/ModuleImportByIdRequest";

/**
 * 模组导入群聊
 */
export function useImportFromModuleMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ["importFromModule"], 
    mutationFn: (req: ModuleImportByIdRequest) => 
      tuanchat.spaceModuleController.importFromModule(req),
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
export function useGetRoomItemsQuery(roomId: number) {
  return useQuery({
    queryKey: ['roomItems', roomId],
    queryFn: () => tuanchat.spaceModuleController.roomItem(roomId, 1),
    staleTime: 10000, // 缓存时间
    enabled: roomId >= 0,
  })
}

/**
 * 获取当前房间的地点
 * @param roomId 房间ID
 */
export function useGetRoomLocationsQuery(roomId: number) {
  return useQuery({
    queryKey: ['roomLocations', roomId],
    queryFn: () => tuanchat.spaceModuleController.roomItem(roomId, 2),
    staleTime: 10000, // 缓存时间
    enabled: roomId >= 0,
  })
}
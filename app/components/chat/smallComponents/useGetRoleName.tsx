import type { ApiResultRoleResponse } from "../../../../api";
import { useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../../../../api/instance";

/**
 * 获取角色信息, 如果角色信息不存在则从服务器获取
 */
export default function useGetRoleSmartly() {
  const queryClient = useQueryClient();
  return async (roleId: number) => {
    if (roleId <= 0)
      return null;
    const roleResponse = await queryClient.fetchQuery<ApiResultRoleResponse>({
      queryKey: ["getRole", roleId],
      queryFn: () => tuanchat.roleController.getRole(roleId),
      staleTime: 5 * 60 * 1000, // 5 分钟
    });
    return roleResponse.data;
  };
}

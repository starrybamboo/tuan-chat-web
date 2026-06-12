import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { fetchRoleWithCache } from "../../../../../api/hooks/RoleAndAvatarHooks";

/**
 * 获取角色信息, 如果角色信息不存在则从服务器获取
 */
export default function useGetRoleSmartly() {
  const queryClient = useQueryClient();
  return useCallback(async (roleId: number) => {
    if (roleId <= 0)
      return null;
    const roleResponse = await fetchRoleWithCache(queryClient, roleId);
    return roleResponse.data;
  }, [queryClient]);
}

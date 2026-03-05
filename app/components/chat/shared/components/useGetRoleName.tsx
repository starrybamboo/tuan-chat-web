import type { ApiResultUserRole } from "../../../../../api";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { tuanchat } from "../../../../../api/instance";
import { shouldRetryRoleQueryError } from "@/utils/roleApiError";

/**
 * 获取角色信息, 如果角色信息不存在则从服务器获取
 */
export default function useGetRoleSmartly() {
  const queryClient = useQueryClient();
  return useCallback(async (roleId: number) => {
    if (roleId <= 0)
      return null;
    const roleResponse = await queryClient.fetchQuery<ApiResultUserRole>({
      queryKey: ["getRole", roleId],
      queryFn: () => tuanchat.roleController.getRole(roleId),
      staleTime: 5 * 60 * 1000, // 5 分钟
      retry: shouldRetryRoleQueryError,
      retryOnMount: false,
      refetchOnMount: false,
    });
    return roleResponse.data;
  }, [queryClient]);
}

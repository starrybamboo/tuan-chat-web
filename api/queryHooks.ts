import { useQuery } from "@tanstack/react-query";

import type { ApiResultListUserRole } from "./models/ApiResultListUserRole";
import { tuanchat } from "./instance";

/**
 * 获取用户的所有角色
 * @param userId 用户ID
 */
export function useGetUserRolesQuery(userId: number) {
  return useQuery<ApiResultListUserRole>({
    queryKey: ["getUserRoles", userId],
    queryFn: () => tuanchat.roleController.getUserRoles(userId),
    staleTime: 5 * 60 * 1000,
    enabled: userId > 0,
  });
}

import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiResultListUserRole } from "./models/ApiResultListUserRole";
import { tuanchat } from "./instance";
import { seedUserRoleListQueryCache } from "./roleQueryCache";

/**
 * 获取用户的所有角色
 * @param userId 用户ID
 */
export function useGetUserRolesQuery(userId: number) {
  const queryClient = useQueryClient();
  return useQuery<ApiResultListUserRole>({
    queryKey: ["getUserRoles", userId],
    queryFn: async () => {
      const res = await tuanchat.roleController.getUserRoles(userId);
      seedUserRoleListQueryCache(queryClient, res.data);
      return res;
    },
    staleTime: 5 * 60 * 1000,
    enabled: userId > 0,
  });
}

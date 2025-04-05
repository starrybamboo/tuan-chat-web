import type { UseQueryResult } from "@tanstack/react-query";
import type { ApiResultListUserRole, ApiResultUserInfoResponse } from "api";
import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";

export default function useRoleQuery(userQuery: UseQueryResult<ApiResultUserInfoResponse | undefined>) {
  const roleQuery = useQuery({
    queryKey: ["userRole", userQuery.data?.data?.userId],
    queryFn: async (): Promise<ApiResultListUserRole | undefined> => {
      const userId = userQuery.data?.data?.userId;
      if (userId === undefined) {
        console.error("用户ID不存在，无法获取角色信息");
        return undefined;
      }
      const res = await tuanchat.roleController.getUserRoles(userId);
      if (res.success === false || res.data === null) {
        console.error("角色信息获取失败或数据为空");
        return undefined;
      }
      return res;
    },
    enabled: !!userQuery.data?.data?.userId, // 只有当 userId 存在时才启用查询
  });
  return roleQuery;
}

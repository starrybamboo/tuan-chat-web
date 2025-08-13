import type { UseQueryResult } from "@tanstack/react-query";
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
    const tempRole = (queryClient.getQueryData(["getRole", roleId]) as UseQueryResult<ApiResultRoleResponse, Error>)?.data?.data;
    if (tempRole) {
      return tempRole;
    }
    else {
      const roleResponse = await tuanchat.roleController.getRole(roleId);
      queryClient.setQueryData(["getRole", roleId], roleResponse);
      return roleResponse.data;
    }
  };
}

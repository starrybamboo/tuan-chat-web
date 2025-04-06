import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "../../../../api/instance";

export function useGroupRoleQuery(groupId: number) {
  return useQuery({
    queryKey: ["groupRoleController.groupRole", groupId],
    queryFn: () => tuanchat.groupRoleController.groupRole(groupId),
    staleTime: 10000,
  });
}

export function useUserRoleQuery(userId: number) {
  return useQuery({
    queryKey: ["roleController.getUserRoles", userId],
    queryFn: () => tuanchat.roleController.getUserRoles(userId!),
    staleTime: 10000,
    enabled: userId >= 0,
  });
}

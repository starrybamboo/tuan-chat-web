import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { RoleCreateRequest } from "@tuanchat/openapi-client/models/RoleCreateRequest";
import type { RoleUpdateRequest } from "@tuanchat/openapi-client/models/RoleUpdateRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type RoleClient = Pick<TuanChat, "avatarController" | "roleController">;

export function getMyRolesQueryKey() {
  return ["myRoles"] as const;
}

export function getRoleAvatarListQueryKey(roleId: number | null | undefined) {
  return ["roleAvatars", roleId ?? null] as const;
}

export function useCreateRoleMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RoleCreateRequest) => client.roleController.createRole(request),
    mutationKey: ["createRole"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMyRolesQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByType"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
    },
  });
}

export function useUpdateRoleMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RoleUpdateRequest) => client.roleController.updateRole(request),
    mutationKey: ["updateRole"],
    onSuccess: (_result, request) => {
      queryClient.invalidateQueries({ queryKey: getMyRolesQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByType"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
      if (typeof request.roleId === "number") {
        queryClient.invalidateQueries({ queryKey: ["getRole", request.roleId] });
      }
    },
  });
}

export function useDeleteRoleMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleIds: number[]) => client.roleController.deleteRole1(roleIds),
    mutationKey: ["deleteRole"],
    onSuccess: (_result, roleIds) => {
      queryClient.invalidateQueries({ queryKey: getMyRolesQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByType"] });
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
      roleIds.forEach((roleId) => {
        queryClient.removeQueries({ queryKey: ["getRole", roleId] });
      });
    },
  });
}

export function useRoleAvatarsQuery(
  client: RoleClient,
  roleId: number | null | undefined,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<RoleAvatar[]>({
    enabled: (options.enabled ?? true) && typeof roleId === "number" && roleId > 0,
    queryFn: async () => {
      const res = await client.avatarController.getRoleAvatars(roleId!);
      return res.data ?? [];
    },
    queryKey: getRoleAvatarListQueryKey(roleId),
    staleTime: options.staleTime ?? 86_400_000,
  });
}

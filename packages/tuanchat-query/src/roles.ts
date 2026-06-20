import type { ApiResultPageBaseRespUserRole } from "@tuanchat/openapi-client/models/ApiResultPageBaseRespUserRole";
import type { ApiResultVoid } from "@tuanchat/openapi-client/models/ApiResultVoid";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { RoleCreateRequest } from "@tuanchat/openapi-client/models/RoleCreateRequest";
import type { RolePageQueryRequest } from "@tuanchat/openapi-client/models/RolePageQueryRequest";
import type { RoleUpdateRequest } from "@tuanchat/openapi-client/models/RoleUpdateRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type RoleClient = Pick<TuanChat, "avatarController" | "request" | "roleController">;

export function getMyRolesQueryKey() {
  return ["myRoles"] as const;
}

export function getRoleAvatarListQueryKey(roleId: number | null | undefined) {
  return ["roleAvatars", roleId ?? null] as const;
}

export function getDeletedUserRolesPageQueryKey(params: RolePageQueryRequest) {
  return [
    "getDeletedUserRolesPage",
    params.userId,
    params.pageNo ?? 1,
    params.pageSize ?? 20,
    params.roleName ?? "",
  ] as const;
}

function invalidateRoleListQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: getMyRolesQueryKey() });
  queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
  queryClient.invalidateQueries({ queryKey: ["getUserRolesByType"] });
  queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
}

function invalidateRoleTrashQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["getDeletedUserRolesPage"] });
  queryClient.invalidateQueries({ queryKey: ["getDeletedSpaceNpcRolesPage"] });
}

function invalidateRoomRoleQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["roomRole"] });
  queryClient.invalidateQueries({ queryKey: ["roomNpcRole"] });
}

export function useCreateRoleMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RoleCreateRequest) => client.roleController.createRole(request),
    mutationKey: ["createRole"],
    onSuccess: () => {
      invalidateRoleListQueries(queryClient);
    },
  });
}

export function useUpdateRoleMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RoleUpdateRequest) => client.roleController.updateRole(request),
    mutationKey: ["updateRole"],
    onSuccess: (_result, request) => {
      invalidateRoleListQueries(queryClient);
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
      invalidateRoleListQueries(queryClient);
      invalidateRoleTrashQueries(queryClient);
      invalidateRoomRoleQueries(queryClient);
      roleIds.forEach((roleId) => {
        queryClient.removeQueries({ queryKey: ["getRole", roleId] });
      });
    },
  });
}

export function useHardDeleteRolesMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleIds: number[]) => client.roleController.hardDeleteRole(roleIds),
    mutationKey: ["hardDeleteRoles"],
    onSuccess: (_result, roleIds) => {
      invalidateRoleListQueries(queryClient);
      invalidateRoleTrashQueries(queryClient);
      invalidateRoomRoleQueries(queryClient);
      roleIds.forEach((roleId) => {
        queryClient.removeQueries({ queryKey: ["getRole", roleId] });
        queryClient.removeQueries({ queryKey: getRoleAvatarListQueryKey(roleId) });
      });
    },
  });
}

export function useClearRoleTrashMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.request.request<ApiResultVoid>({
      method: "DELETE",
      url: "/role/trash/clear",
    }),
    mutationKey: ["clearRoleTrash"],
    onSuccess: () => {
      invalidateRoleListQueries(queryClient);
      invalidateRoleTrashQueries(queryClient);
      invalidateRoomRoleQueries(queryClient);
    },
  });
}

export function useDeletedUserRolesPageQuery(
  client: RoleClient,
  params: RolePageQueryRequest,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const userId = params.userId;
  return useQuery<ApiResultPageBaseRespUserRole>({
    enabled: (options.enabled ?? true) && typeof userId === "number" && Number.isFinite(userId) && userId > 0,
    queryFn: async () => {
      const res = await client.request.request<ApiResultPageBaseRespUserRole>({
        method: "POST",
        url: "/role/trash/page",
        body: params,
        mediaType: "application/json",
      });
      if (!res.success) {
        throw new Error(res.errMsg || "获取角色回收站失败");
      }
      return res;
    },
    queryKey: getDeletedUserRolesPageQueryKey(params),
    staleTime: options.staleTime ?? 600_000,
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

export function useCreateAvatarMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RoleAvatar) => client.avatarController.setRoleAvatar(request as any),
    mutationKey: ["createAvatar"],
    onSuccess: (_result, request) => {
      if (typeof request.roleId === "number") {
        queryClient.invalidateQueries({ queryKey: getRoleAvatarListQueryKey(request.roleId) });
      }
    },
  });
}

export function useUpdateAvatarMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RoleAvatar) => client.avatarController.updateRoleAvatar(request),
    mutationKey: ["updateAvatar"],
    onSuccess: (_result, request) => {
      if (typeof request.roleId === "number") {
        queryClient.invalidateQueries({ queryKey: getRoleAvatarListQueryKey(request.roleId) });
      }
    },
  });
}

export function useDeleteAvatarMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ avatarId }: { avatarId: number; roleId: number }) =>
      client.avatarController.deleteRoleAvatar(avatarId),
    mutationKey: ["deleteAvatar"],
    onSuccess: (_result, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: getRoleAvatarListQueryKey(roleId) });
    },
  });
}

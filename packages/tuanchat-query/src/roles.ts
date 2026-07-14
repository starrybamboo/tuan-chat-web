import type { ApiResultPageBaseRespUserRole } from "@tuanchat/openapi-client/models/ApiResultPageBaseRespUserRole";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { RoleCreateRequest } from "@tuanchat/openapi-client/models/RoleCreateRequest";
import type { RolePageQueryRequest } from "@tuanchat/openapi-client/models/RolePageQueryRequest";
import type { RoleUpdateRequest } from "@tuanchat/openapi-client/models/RoleUpdateRequest";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateRoleMetadataBatchQueries } from "./metadata";
import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "./optimistic-cache";

type RoleClient = Pick<TuanChat, "avatarController" | "roleController">;

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
  invalidateRoleMetadataBatchQueries(queryClient);
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

type RoleCacheUpdater = (role: UserRole) => UserRole | null;
type AvatarCacheUpdater = (avatar: RoleAvatar) => RoleAvatar | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function patchRoleRecord(current: unknown, roleId: number, update: RoleCacheUpdater) {
  if (!isRecord(current)) {
    return current;
  }
  const key = String(roleId);
  const role = current[key];
  if (!isRecord(role) || role.roleId !== roleId) {
    return current;
  }
  const patched = update(role as UserRole);
  if (patched === role) {
    return current;
  }
  const next = { ...current };
  if (patched) {
    next[key] = patched;
  }
  else {
    delete next[key];
  }
  return next;
}

export function patchRoleCacheValue(current: unknown, roleId: number, update: RoleCacheUpdater): unknown {
  if (Array.isArray(current)) {
    let changed = false;
    const next = current.flatMap((item) => {
      if (!isRecord(item) || item.roleId !== roleId) {
        return [item];
      }
      changed = true;
      const patched = update(item as UserRole);
      return patched ? [patched] : [];
    });
    return changed ? next : current;
  }
  if (!isRecord(current)) {
    return current;
  }
  if (current.roleId === roleId) {
    return update(current as UserRole);
  }

  let next = current;
  for (const key of ["data", "list", "allRoles", "baseRoles", "npcRoles"] as const) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      continue;
    }
    const patched = patchRoleCacheValue(current[key], roleId, update);
    if (patched !== current[key]) {
      next = { ...next, [key]: patched };
    }
  }
  if (Object.prototype.hasOwnProperty.call(current, "roles")) {
    const patchedRoles = patchRoleRecord(current.roles, roleId, update);
    if (patchedRoles !== current.roles) {
      next = { ...next, roles: patchedRoles };
    }
  }
  return next;
}

function findRoleInCache(current: unknown, roleId: number): UserRole | undefined {
  if (Array.isArray(current)) {
    for (const item of current) {
      const found = findRoleInCache(item, roleId);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  if (!isRecord(current)) {
    return undefined;
  }
  if (current.roleId === roleId) {
    return current as UserRole;
  }
  for (const key of ["data", "list", "allRoles", "baseRoles", "npcRoles", "roles"] as const) {
    const found = findRoleInCache(current[key], roleId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function findRoleAcrossCaches(queryClient: ReturnType<typeof useQueryClient>, roleId: number) {
  const queryPrefixes: readonly (readonly unknown[])[] = [
    ["getRole", roleId],
    ...ACTIVE_ROLE_QUERY_PREFIXES,
  ];
  for (const queryKey of queryPrefixes) {
    for (const [, value] of queryClient.getQueriesData({ queryKey })) {
      const role = findRoleInCache(value, roleId);
      if (role) {
        return role;
      }
    }
  }
  return undefined;
}

function addRoleToTrashPage(current: unknown, role: UserRole | undefined, queryKey: readonly unknown[]) {
  if (!role || !isRecord(current) || !isRecord(current.data) || !Array.isArray(current.data.list)) {
    return current;
  }
  const roleNameFilter = String(queryKey[4] ?? "").trim().toLowerCase();
  if (roleNameFilter && !String(role.roleName ?? "").toLowerCase().includes(roleNameFilter)) {
    return current;
  }
  if (current.data.list.some((item: UserRole) => item.roleId === role.roleId)) {
    return current;
  }
  return {
    ...current,
    data: {
      ...current.data,
      list: [{ ...role, state: 1 }, ...current.data.list],
      totalRecords: Number(current.data.totalRecords ?? current.data.list.length) + 1,
    },
  };
}

function clearRoleTrashPage(current: unknown) {
  if (!isRecord(current) || !isRecord(current.data) || !Array.isArray(current.data.list)) {
    return current;
  }
  return { ...current, data: { ...current.data, list: [], totalRecords: 0 } };
}

const ACTIVE_ROLE_QUERY_PREFIXES = [
  ["myRoles"],
  ["getUserRoles"],
  ["getUserRolesByType"],
  ["getUserRolesByTypes"],
  ["roomRoles"],
  ["roomRole"],
  ["roomNpcRole"],
  ["clientMetadataBatch"],
] as const;

function roleCachePatches(roleId: number, update: RoleCacheUpdater) {
  return [
    optimisticQueryPatch<unknown>({
      queryKey: ["getRole", roleId],
      update: current => patchRoleCacheValue(current, roleId, update),
    }),
    ...ACTIVE_ROLE_QUERY_PREFIXES.map(queryKey => optimisticQueryPatch<unknown>({
      queryKey,
      exact: false,
      update: current => patchRoleCacheValue(current, roleId, update),
    })),
  ];
}

export function beginRoleUpdateOptimisticMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  request: RoleUpdateRequest,
) {
  return beginOptimisticQueryTransaction(queryClient, roleCachePatches(request.roleId, role => ({
    ...role,
    ...request,
  } as UserRole)));
}

export function beginRoleDeleteOptimisticMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  roleIds: number[],
) {
  const roles = new Map(roleIds.map(roleId => [roleId, findRoleAcrossCaches(queryClient, roleId)]));
  return beginOptimisticQueryTransaction(queryClient, [
    ...roleIds.flatMap(roleId => roleCachePatches(roleId, () => null)),
    optimisticQueryPatch<unknown>({
      queryKey: ["getDeletedUserRolesPage"],
      exact: false,
      update: (current, queryKey) => roleIds.reduce(
        (next, roleId) => addRoleToTrashPage(next, roles.get(roleId), queryKey),
        current,
      ),
    }),
  ]);
}

export function beginHardDeleteRolesOptimisticMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  roleIds: number[],
) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: ["getDeletedUserRolesPage"],
      exact: false,
      update: current => roleIds.reduce(
        (next, roleId) => patchRoleCacheValue(next, roleId, () => null),
        current,
      ),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: ["getDeletedSpaceNpcRolesPage"],
      exact: false,
      update: current => roleIds.reduce(
        (next, roleId) => patchRoleCacheValue(next, roleId, () => null),
        current,
      ),
    }),
  ]);
}

export function beginClearRoleTrashOptimisticMutation(queryClient: ReturnType<typeof useQueryClient>) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: ["getDeletedUserRolesPage"],
      exact: false,
      update: clearRoleTrashPage,
    }),
    optimisticQueryPatch<unknown>({
      queryKey: ["getDeletedSpaceNpcRolesPage"],
      exact: false,
      update: clearRoleTrashPage,
    }),
  ]);
}

function patchAvatarRecord(current: unknown, avatarId: number, update: AvatarCacheUpdater) {
  if (!isRecord(current)) {
    return current;
  }
  const key = String(avatarId);
  const avatar = current[key];
  if (!isRecord(avatar) || avatar.avatarId !== avatarId) {
    return current;
  }
  const patched = update(avatar as RoleAvatar);
  const next = { ...current };
  if (patched) {
    next[key] = patched;
  }
  else {
    delete next[key];
  }
  return next;
}

function patchAvatarCacheValue(current: unknown, avatarId: number, update: AvatarCacheUpdater): unknown {
  if (Array.isArray(current)) {
    const index = current.findIndex(item => isRecord(item) && item.avatarId === avatarId);
    if (index < 0) {
      return current;
    }
    const patched = update(current[index] as RoleAvatar);
    return patched
      ? current.map((item, itemIndex) => itemIndex === index ? patched : item)
      : current.filter((_item, itemIndex) => itemIndex !== index);
  }
  if (!isRecord(current)) {
    return current;
  }
  if (current.avatarId === avatarId) {
    return update(current as RoleAvatar);
  }
  let next = current;
  for (const key of ["data", "avatars"] as const) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      continue;
    }
    const patched = key === "avatars"
      ? patchAvatarRecord(current[key], avatarId, update)
      : patchAvatarCacheValue(current[key], avatarId, update);
    if (patched !== current[key]) {
      next = { ...next, [key]: patched };
    }
  }
  for (const [key, value] of Object.entries(current)) {
    if (key === "data" || key === "avatars" || !Array.isArray(value)) {
      continue;
    }
    const patched = patchAvatarCacheValue(value, avatarId, update);
    if (patched !== value) {
      next = { ...next, [key]: patched };
    }
  }
  return next;
}

function avatarCachePatches(roleId: number, avatarId: number, update: AvatarCacheUpdater) {
  return [
    optimisticQueryPatch<unknown>({
      queryKey: getRoleAvatarListQueryKey(roleId),
      update: current => patchAvatarCacheValue(current, avatarId, update),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: ["getRoleAvatars", roleId],
      update: current => patchAvatarCacheValue(current, avatarId, update),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: ["getRoleAvatar", avatarId],
      update: current => patchAvatarCacheValue(current, avatarId, update),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: ["roleAvatarListsBatch"],
      exact: false,
      update: current => patchAvatarCacheValue(current, avatarId, update),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: ["clientMetadataBatch"],
      exact: false,
      update: current => patchAvatarCacheValue(current, avatarId, update),
    }),
  ];
}

export function beginAvatarUpdateOptimisticMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  request: RoleAvatar,
) {
  return beginOptimisticQueryTransaction(
    queryClient,
    avatarCachePatches(request.roleId, request.avatarId, avatar => ({ ...avatar, ...request })),
  );
}

export function beginAvatarDeleteOptimisticMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  roleId: number,
  avatarId: number,
) {
  return beginOptimisticQueryTransaction(queryClient, avatarCachePatches(roleId, avatarId, () => null));
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
    onMutate: request => beginRoleUpdateOptimisticMutation(queryClient, request),
    onError: (_error, _request, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: (_result, _error, request) => {
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
    mutationFn: (roleIds: number[]) => client.roleController.deleteRole(roleIds),
    mutationKey: ["deleteRole"],
    onMutate: roleIds => beginRoleDeleteOptimisticMutation(queryClient, roleIds),
    onError: (_error, _roleIds, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: () => {
      invalidateRoleListQueries(queryClient);
      invalidateRoleTrashQueries(queryClient);
      invalidateRoomRoleQueries(queryClient);
    },
  });
}

export function useHardDeleteRolesMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleIds: number[]) => client.roleController.hardDeleteRole(roleIds),
    mutationKey: ["hardDeleteRoles"],
    onMutate: roleIds => beginHardDeleteRolesOptimisticMutation(queryClient, roleIds),
    onError: (_error, _roleIds, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSuccess: (_result, roleIds) => {
      roleIds.forEach((roleId) => {
        queryClient.removeQueries({ queryKey: ["getRole", roleId] });
        queryClient.removeQueries({ queryKey: getRoleAvatarListQueryKey(roleId) });
      });
    },
    onSettled: () => {
      invalidateRoleListQueries(queryClient);
      invalidateRoleTrashQueries(queryClient);
      invalidateRoomRoleQueries(queryClient);
    },
  });
}

export function useClearRoleTrashMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.roleController.clearRoleTrash(),
    mutationKey: ["clearRoleTrash"],
    onMutate: () => beginClearRoleTrashOptimisticMutation(queryClient),
    onError: (_error, _variables, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: () => {
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
      const res = await client.roleController.getDeletedRolesByPage(params);
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
      invalidateRoleMetadataBatchQueries(queryClient);
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
    onMutate: request => beginAvatarUpdateOptimisticMutation(queryClient, request),
    onError: (_error, _request, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: (_result, _error, request) => {
      invalidateRoleMetadataBatchQueries(queryClient);
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
    onMutate: ({ avatarId, roleId }) => beginAvatarDeleteOptimisticMutation(queryClient, roleId, avatarId),
    onError: (_error, _request, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: (_result, _error, { roleId }) => {
      invalidateRoleMetadataBatchQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: getRoleAvatarListQueryKey(roleId) });
    },
  });
}

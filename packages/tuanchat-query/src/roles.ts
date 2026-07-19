import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { RoleAvatarCollectionSyncResponse } from "@tuanchat/openapi-client/models/RoleAvatarCollectionSyncResponse";
import type { RoleAvatarCreateRequest } from "@tuanchat/openapi-client/models/RoleAvatarCreateRequest";
import type { RoleCollectionSyncResponse } from "@tuanchat/openapi-client/models/RoleCollectionSyncResponse";
import type { RoleCreateRequest } from "@tuanchat/openapi-client/models/RoleCreateRequest";
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

export type RoleCollectionSync = RoleCollectionSyncResponse;
export type RoleAvatarCollectionSync = RoleAvatarCollectionSyncResponse;

export function getMyRolesQueryKey() {
  return ["myRoles"] as const;
}

export function getRoleAvatarListQueryKey(roleId: number | null | undefined) {
  return ["roleAvatars", roleId ?? null] as const;
}

export async function fetchRoleCollectionSync(
  client: RoleClient,
  userId: number,
  afterSyncId?: number,
): Promise<RoleCollectionSync> {
  const response = await client.roleController.syncUserRoles(userId, afterSyncId);
  if (!response.success) {
    throw new Error(response.errMsg || "获取角色增量失败");
  }
  return response.data ?? { baseline: afterSyncId == null || afterSyncId <= 0, latestSyncId: 0, roles: [] };
}

export async function fetchRoleAvatarCollectionSync(
  client: RoleClient,
  roleId: number,
  afterSyncId?: number,
): Promise<RoleAvatarCollectionSync> {
  const response = await client.avatarController.syncRoleAvatars(roleId, afterSyncId);
  if (!response.success) {
    throw new Error(response.errMsg || "获取头像增量失败");
  }
  return response.data ?? { baseline: afterSyncId == null || afterSyncId <= 0, latestSyncId: 0, avatars: [] };
}

export function mergeRoleCollectionSync(
  current: UserRole[],
  response: RoleCollectionSync,
): UserRole[] {
  const next = new Map<number, UserRole>();
  if (!response.baseline) {
    current.forEach(role => next.set(role.roleId, role));
  }
  for (const role of response.roles ?? []) {
    if (role.state != null && role.state !== 0) {
      next.delete(role.roleId);
    }
    else {
      next.set(role.roleId, role);
    }
  }
  return [...next.values()];
}

export function mergeRoleAvatarCollectionSync(
  current: RoleAvatar[],
  response: RoleAvatarCollectionSync,
): RoleAvatar[] {
  const next = new Map<number, RoleAvatar>();
  if (!response.baseline) {
    current.forEach(avatar => next.set(avatar.avatarId, avatar));
  }
  for (const avatar of response.avatars ?? []) {
    if (avatar.state != null && avatar.state !== 0) {
      next.delete(avatar.avatarId);
    }
    else {
      next.set(avatar.avatarId, avatar);
    }
  }
  return [...next.values()];
}

function invalidateRoleListQueries(queryClient: ReturnType<typeof useQueryClient>) {
  invalidateRoleMetadataBatchQueries(queryClient);
  queryClient.invalidateQueries({ queryKey: getMyRolesQueryKey() });
  queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
  queryClient.invalidateQueries({ queryKey: ["getUserRolesByType"] });
  queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
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
  return beginOptimisticQueryTransaction(
    queryClient,
    roleIds.flatMap(roleId => roleCachePatches(roleId, () => null)),
  );
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

export function beginAvatarDeleteManyOptimisticMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  roleId: number,
  avatarIds: number[],
) {
  return beginOptimisticQueryTransaction(
    queryClient,
    avatarIds.flatMap(avatarId => avatarCachePatches(roleId, avatarId, () => null)),
  );
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
    onSuccess: (_result, roleIds) => {
      roleIds.forEach((roleId) => {
        queryClient.removeQueries({ queryKey: ["getRole", roleId] });
        queryClient.removeQueries({ queryKey: getRoleAvatarListQueryKey(roleId) });
      });
    },
    onSettled: () => {
      invalidateRoleListQueries(queryClient);
      invalidateRoomRoleQueries(queryClient);
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

export function useCreateAvatarMutation(client: RoleClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RoleAvatarCreateRequest) => client.avatarController.setRoleAvatar(request),
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

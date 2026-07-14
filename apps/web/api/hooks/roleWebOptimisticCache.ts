import type { QueryClient } from "@tanstack/react-query";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { RoleAvatarVariantUpdateRequest } from "@tuanchat/openapi-client/models/RoleAvatarVariantUpdateRequest";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getApiResultList(current: unknown): unknown[] | undefined {
  return isRecord(current) && Array.isArray(current.data) ? current.data : undefined;
}

function patchApiResultList(current: unknown, update: (list: any[]) => any[]) {
  const list = getApiResultList(current);
  if (!list) {
    return current;
  }
  const next = update(list);
  return next === list ? current : { ...(current as Record<string, unknown>), data: next };
}

export function beginRestoreRoleAvatarOptimisticMutation(
  queryClient: QueryClient,
  roleId: number,
  avatarId: number,
) {
  const deletedKey = ["getDeletedRoleAvatars", roleId] as const;
  const activeKey = ["getRoleAvatars", roleId] as const;
  const deleted = getApiResultList(queryClient.getQueryData(deletedKey));
  const avatar = deleted?.find(item => isRecord(item) && item.avatarId === avatarId) as RoleAvatar | undefined;
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: deletedKey,
      update: current => patchApiResultList(current, list => list.filter(item => !isRecord(item) || item.avatarId !== avatarId)),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: activeKey,
      update: current => avatar
        ? patchApiResultList(current, list => list.some(item => isRecord(item) && item.avatarId === avatarId)
          ? list
          : [...list, { ...avatar, state: 0 }])
        : current,
    }),
  ]);
}

export function beginClearDeletedRoleAvatarsOptimisticMutation(queryClient: QueryClient, roleId: number) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: ["getDeletedRoleAvatars", roleId],
      update: current => patchApiResultList(current, () => []),
    }),
  ]);
}

function patchRoleAvatarVariantList(
  current: unknown,
  variantId: number,
  update: (variant: Record<string, unknown>) => Record<string, unknown> | null,
) {
  return patchApiResultList(current, (list) => {
    let changed = false;
    const next = list.flatMap((item) => {
      if (!isRecord(item) || item.variantId !== variantId) {
        return [item];
      }
      changed = true;
      const patched = update(item);
      return patched ? [patched] : [];
    });
    return changed ? next : list;
  });
}

export function beginUpdateRoleAvatarVariantOptimisticMutation(
  queryClient: QueryClient,
  roleId: number,
  request: RoleAvatarVariantUpdateRequest,
) {
  if (!request.variantId) {
    return beginOptimisticQueryTransaction(queryClient, []);
  }
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: ["roleAvatarVariants", roleId],
      update: current => patchRoleAvatarVariantList(current, request.variantId!, variant => ({ ...variant, ...request })),
    }),
  ]);
}

export function beginDeleteRoleAvatarVariantOptimisticMutation(
  queryClient: QueryClient,
  roleId: number,
  variantId: number,
) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: ["roleAvatarVariants", roleId],
      update: current => patchRoleAvatarVariantList(current, variantId, () => null),
    }),
  ]);
}

function clearRoleTrashPage(current: unknown) {
  if (!isRecord(current) || !isRecord(current.data) || !Array.isArray(current.data.list)) {
    return current;
  }
  return { ...current, data: { ...current.data, list: [], totalRecords: 0 } };
}

export function beginClearSpaceNpcRoleTrashOptimisticMutation(queryClient: QueryClient, spaceId: number) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: ["getDeletedSpaceNpcRolesPage", spaceId],
      exact: false,
      update: clearRoleTrashPage,
    }),
  ]);
}

export function rollbackRoleWebOptimisticMutation(
  queryClient: QueryClient,
  transaction: Parameters<typeof rollbackOptimisticQueryTransaction>[1],
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

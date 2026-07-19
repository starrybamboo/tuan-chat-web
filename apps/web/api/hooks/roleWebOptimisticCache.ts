import type { QueryClient } from "@tanstack/react-query";
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

export function rollbackRoleWebOptimisticMutation(
  queryClient: QueryClient,
  transaction: Parameters<typeof rollbackOptimisticQueryTransaction>[1],
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

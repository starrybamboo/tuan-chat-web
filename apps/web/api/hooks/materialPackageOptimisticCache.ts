import type { QueryClient } from "@tanstack/react-query";
import type { MaterialPackageUpdateRequest } from "@tuanchat/openapi-client/models/MaterialPackageUpdateRequest";
import type { SpaceMaterialPackageUpdateRequest } from "@tuanchat/openapi-client/models/SpaceMaterialPackageUpdateRequest";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";

type PackageIdKey = "packageId" | "spacePackageId";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function patchMaterialPackageCacheValue(
  current: unknown,
  idKey: PackageIdKey,
  packageId: number,
  update: (item: Record<string, unknown>) => Record<string, unknown> | null,
): unknown {
  if (Array.isArray(current)) {
    let changed = false;
    const next = current.flatMap((item) => {
      if (!isRecord(item) || item[idKey] !== packageId) {
        return [item];
      }
      changed = true;
      const patched = update(item);
      return patched ? [patched] : [];
    });
    return changed ? next : current;
  }
  if (!isRecord(current)) {
    return current;
  }
  if (current[idKey] === packageId) {
    return update(current);
  }

  let next = current;
  for (const key of ["data", "list", "pages"] as const) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      continue;
    }
    const patched = patchMaterialPackageCacheValue(current[key], idKey, packageId, update);
    if (patched !== current[key]) {
      next = { ...next, [key]: patched };
    }
  }
  return next;
}

function beginPackageMutation(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  idKey: PackageIdKey,
  packageId: number,
  update: (item: Record<string, unknown>) => Record<string, unknown> | null,
) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey,
      exact: false,
      update: current => patchMaterialPackageCacheValue(current, idKey, packageId, update),
    }),
  ]);
}

export function beginMaterialPackageUpdateOptimisticMutation(
  queryClient: QueryClient,
  request: MaterialPackageUpdateRequest,
) {
  return beginPackageMutation(queryClient, ["materialPackage"], "packageId", request.packageId, item => ({
    ...item,
    ...request,
  }));
}

export function beginMaterialPackageDeleteOptimisticMutation(queryClient: QueryClient, packageId: number) {
  return beginPackageMutation(queryClient, ["materialPackage"], "packageId", packageId, () => null);
}

export function beginSpaceMaterialPackageUpdateOptimisticMutation(
  queryClient: QueryClient,
  request: SpaceMaterialPackageUpdateRequest,
) {
  return beginPackageMutation(
    queryClient,
    ["spaceMaterialPackage"],
    "spacePackageId",
    request.spacePackageId,
    item => ({ ...item, ...request }),
  );
}

export function beginSpaceMaterialPackageDeleteOptimisticMutation(queryClient: QueryClient, spacePackageId: number) {
  return beginPackageMutation(queryClient, ["spaceMaterialPackage"], "spacePackageId", spacePackageId, () => null);
}

export function rollbackMaterialPackageOptimisticMutation(
  queryClient: QueryClient,
  transaction: Parameters<typeof rollbackOptimisticQueryTransaction>[1],
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

import type { QueryClient } from "@tanstack/react-query";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { resolveRoleAvatarMedia } from "@/components/Role/sprite/roleAvatarMedia";

export type RoleListQuerySnapshot = Array<{
  queryKey: readonly unknown[];
  data: unknown;
}>;

export type UserRoleWithAvatarUrls = UserRole & {
  avatarUrl?: string;
  avatarThumbUrl?: string;
};

export type RoleAvatarFieldPatch = {
  roleId: number;
  avatarId?: number;
  avatarFileId?: number;
  avatarMediaType?: string;
  avatarUrl?: string;
  avatarThumbUrl?: string;
};

const ROLE_DETAIL_CACHE_COMPLETE_FIELD = "__tcRoleDetailComplete";

type SeedUserRoleQueryCacheOptions = {
  detailComplete?: boolean;
};

function hasRoleId(role?: UserRoleWithAvatarUrls | null): role is UserRoleWithAvatarUrls & { roleId: number } {
  return typeof role?.roleId === "number" && role.roleId > 0;
}

function hasPatchRoleId(role?: RoleAvatarFieldPatch | null): role is RoleAvatarFieldPatch {
  return typeof role?.roleId === "number" && role.roleId > 0;
}

function hasAvatarId(role?: UserRoleWithAvatarUrls | null): role is UserRoleWithAvatarUrls & { avatarId: number } {
  return typeof role?.avatarId === "number" && role.avatarId > 0;
}

function resolveRoleAvatarUrls(role: Pick<UserRoleWithAvatarUrls, "avatarFileId" | "avatarUrl" | "avatarThumbUrl">): { avatarUrl: string; avatarThumbUrl: string } {
  const media = resolveRoleAvatarMedia(role);
  const avatarUrl = media.avatar.url;
  const avatarThumbUrl = media.avatar.thumbUrl || avatarUrl;
  return {
    avatarUrl,
    avatarThumbUrl,
  };
}

function omitUndefinedFields<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function isUserRoleDetailCacheComplete(cacheData: unknown): boolean {
  return Boolean((cacheData as any)?.[ROLE_DETAIL_CACHE_COMPLETE_FIELD]);
}

export function seedUserRoleQueryCache(
  queryClient: QueryClient,
  role?: UserRoleWithAvatarUrls | null,
  options?: SeedUserRoleQueryCacheOptions,
): void {
  if (!hasRoleId(role)) {
    return;
  }

  const roleAvatarUrls = resolveRoleAvatarUrls(role);
  queryClient.setQueryData(["getRole", role.roleId], (old: any) => {
    const previousData = old?.data ?? {};
    const rolePatch = options?.detailComplete
      ? role
      : omitUndefinedFields(role as Record<string, unknown>);
    return {
      ...(old && typeof old === "object" ? old : {}),
      success: old?.success ?? true,
      [ROLE_DETAIL_CACHE_COMPLETE_FIELD]: Boolean(options?.detailComplete) || isUserRoleDetailCacheComplete(old),
      data: {
        ...previousData,
        ...rolePatch,
        avatarUrl: roleAvatarUrls.avatarUrl || previousData.avatarUrl,
        avatarThumbUrl: roleAvatarUrls.avatarThumbUrl || previousData.avatarThumbUrl,
      },
    };
  });

  if (!hasAvatarId(role)) {
    return;
  }

  const { avatarUrl, avatarThumbUrl } = roleAvatarUrls;
  if (!avatarUrl && !avatarThumbUrl) {
    return;
  }

  queryClient.setQueryData(["getRoleAvatar", role.avatarId], (old: any) => {
    const previousData = old?.data ?? {};
    const resolvedAvatarUrl = avatarUrl || previousData.avatarUrl || avatarThumbUrl;
    const resolvedAvatarThumbUrl = avatarThumbUrl || previousData.avatarThumbUrl || resolvedAvatarUrl;

    return {
      ...(old && typeof old === "object" ? old : {}),
      success: old?.success ?? true,
      data: {
        ...previousData,
        avatarId: role.avatarId,
        roleId: role.roleId,
        avatarFileId: role.avatarFileId,
        avatarMediaType: role.avatarMediaType,
        avatarUrl: resolvedAvatarUrl,
        avatarThumbUrl: resolvedAvatarThumbUrl,
      },
    };
  });
}

export function seedUserRoleListQueryCache(
  queryClient: QueryClient,
  roles?: Array<UserRoleWithAvatarUrls | null | undefined>,
): void {
  if (!Array.isArray(roles) || roles.length === 0) {
    return;
  }

  roles.forEach((role) => {
    seedUserRoleQueryCache(queryClient, role ?? null);
  });
}

function isUserRoleListQueryKey(queryKey: readonly unknown[]): boolean {
  const scope = queryKey[0];
  return scope === "getUserRoles"
    || scope === "getUserRolesByType"
    || scope === "getUserRolesByTypes"
    || scope === "roleInfinite"
    || scope === "roleInfiniteByType";
}

function isRoomRoleListQueryKey(queryKey: readonly unknown[]): boolean {
  const scope = queryKey[0];
  return scope === "roomRole" || scope === "roomNpcRole";
}

function shouldContainRole(queryKey: readonly unknown[], role: UserRoleWithAvatarUrls): boolean {
  const scope = queryKey[0];
  const roleType = role.type ?? 0;
  const queryUserId = queryKey[1];
  if (
    typeof queryUserId === "number"
    && queryUserId > 0
    && typeof role.userId === "number"
    && role.userId > 0
    && queryUserId !== role.userId
  ) {
    return false;
  }

  if (scope === "getUserRolesByType" || scope === "roleInfiniteByType") {
    return queryKey[2] === roleType;
  }

  if (scope === "getUserRolesByTypes") {
    return queryKey.slice(2).includes(roleType);
  }

  if (scope === "roleInfinite") {
    return roleType === 0 || roleType === 1;
  }

  return scope === "getUserRoles";
}

function getTypePriority(role: UserRoleWithAvatarUrls): number {
  if (role.type === 1) return 0;
  if (role.type === 0) return 1;
  if (role.type === 2) return 2;
  return 3;
}

function sortUserRoles(roles: UserRoleWithAvatarUrls[]): UserRoleWithAvatarUrls[] {
  return [...roles].sort((a, b) => {
    const typePriorityDiff = getTypePriority(a) - getTypePriority(b);
    if (typePriorityDiff !== 0) {
      return typePriorityDiff;
    }
    return (b.roleId ?? 0) - (a.roleId ?? 0);
  });
}

function upsertUserRoleList(list: UserRoleWithAvatarUrls[], role: UserRoleWithAvatarUrls): UserRoleWithAvatarUrls[] {
  if (!hasRoleId(role)) {
    return list;
  }

  let found = false;
  const next = list.map((item) => {
    if (item.roleId !== role.roleId) {
      return item;
    }

    found = true;
    return {
      ...item,
      ...role,
      avatarUrl: role.avatarUrl ?? item.avatarUrl,
      avatarThumbUrl: role.avatarThumbUrl ?? item.avatarThumbUrl,
    };
  });

  if (!found) {
    next.push(role);
  }

  return sortUserRoles(next);
}

function removeUserRoleList(list: UserRoleWithAvatarUrls[], roleIds: Set<number>): UserRoleWithAvatarUrls[] {
  const next = list.filter(role => !roleIds.has(role.roleId ?? 0));
  return next.length === list.length ? list : next;
}

function updatePageList(page: any, list: UserRole[], totalRecords: number): any {
  if (!page?.data || !Array.isArray(page.data.list)) {
    return page;
  }

  const pageNo = page.data.pageNo ?? 1;
  const pageSize = page.data.pageSize ?? (page.data.list.length || 15);
  const start = (pageNo - 1) * pageSize;
  const end = start + pageSize;

  return {
    ...page,
    data: {
      ...page.data,
      totalRecords,
      isLast: end >= totalRecords,
      list: list.slice(start, end),
    },
  };
}

function updateRoleListCacheData(
  old: unknown,
  updateList: (list: UserRoleWithAvatarUrls[]) => UserRoleWithAvatarUrls[],
): unknown {
  if (!old) {
    return old;
  }

  if (Array.isArray(old)) {
    return updateList(old);
  }

  if (typeof old !== "object") {
    return old;
  }

  const data = (old as any).data;
  if (Array.isArray(data)) {
    return {
      ...(old as any),
      data: updateList(data),
    };
  }

  if (data && Array.isArray(data.list)) {
    const nextList = updateList(data.list);
    return {
      ...(old as any),
      data: {
        ...data,
        totalRecords: nextList.length,
        isLast: true,
        list: nextList,
      },
    };
  }

  const pages = (old as any).pages;
  if (Array.isArray(pages)) {
    const flattened = pages.flatMap((page: any) => page?.data?.list ?? []);
    const nextList = updateList(flattened);
    return {
      ...(old as any),
      pages: pages.map((page: any) => updatePageList(page, nextList, nextList.length)),
    };
  }

  return old;
}

function snapshotUserRoleListQueries(queryClient: QueryClient): RoleListQuerySnapshot {
  return queryClient
    .getQueryCache()
    .findAll({ predicate: query => isUserRoleListQueryKey(query.queryKey) })
    .map(query => ({
      queryKey: query.queryKey,
      data: queryClient.getQueryData(query.queryKey),
    }));
}

export function upsertUserRoleListQueryCache(queryClient: QueryClient, role?: UserRoleWithAvatarUrls | null): void {
  if (!hasRoleId(role)) {
    return;
  }

  queryClient
    .getQueryCache()
    .findAll({
      predicate: query => isUserRoleListQueryKey(query.queryKey) && shouldContainRole(query.queryKey, role),
    })
    .forEach((query) => {
      queryClient.setQueryData(query.queryKey, old => updateRoleListCacheData(
        old,
        list => upsertUserRoleList(list, role),
      ));
    });
}

export function patchUserRoleAvatarFieldsInListQueryCache(
  queryClient: QueryClient,
  role?: RoleAvatarFieldPatch | null,
): void {
  if (!hasPatchRoleId(role)) {
    return;
  }

  const roleAvatarUrls = resolveRoleAvatarUrls(role);
  queryClient
    .getQueryCache()
    .findAll({
      predicate: query => isUserRoleListQueryKey(query.queryKey),
    })
    .forEach((query) => {
      queryClient.setQueryData(query.queryKey, old => updateRoleListCacheData(
        old,
        list => list.map((item) => {
          if (item.roleId !== role.roleId) {
            return item;
          }

          return {
            ...item,
            avatarId: role.avatarId ?? item.avatarId,
            avatarFileId: role.avatarFileId ?? item.avatarFileId,
            avatarMediaType: role.avatarMediaType ?? item.avatarMediaType,
            avatarUrl: roleAvatarUrls.avatarUrl || item.avatarUrl,
            avatarThumbUrl: roleAvatarUrls.avatarThumbUrl || item.avatarThumbUrl || roleAvatarUrls.avatarUrl,
          };
        }),
      ));
    });
}

export function patchRoomRoleAvatarFieldsInListQueryCache(
  queryClient: QueryClient,
  role?: RoleAvatarFieldPatch | null,
): void {
  if (!hasPatchRoleId(role)) {
    return;
  }

  const roleAvatarUrls = resolveRoleAvatarUrls(role);
  queryClient
    .getQueryCache()
    .findAll({
      predicate: query => isRoomRoleListQueryKey(query.queryKey),
    })
    .forEach((query) => {
      queryClient.setQueryData(query.queryKey, old => updateRoleListCacheData(
        old,
        list => list.map((item) => {
          if (item.roleId !== role.roleId) {
            return item;
          }

          return {
            ...item,
            avatarId: role.avatarId ?? item.avatarId,
            avatarFileId: role.avatarFileId ?? item.avatarFileId,
            avatarMediaType: role.avatarMediaType ?? item.avatarMediaType,
            avatarUrl: roleAvatarUrls.avatarUrl || item.avatarUrl,
            avatarThumbUrl: roleAvatarUrls.avatarThumbUrl || item.avatarThumbUrl || roleAvatarUrls.avatarUrl,
          };
        }),
      ));
    });
}

export async function optimisticRemoveUserRolesFromListQueryCache(
  queryClient: QueryClient,
  roleIds: number[],
): Promise<RoleListQuerySnapshot> {
  const validRoleIds = Array.from(new Set(roleIds.filter(roleId => Number.isFinite(roleId) && roleId > 0)));
  if (validRoleIds.length === 0) {
    return [];
  }

  await Promise.all([
    queryClient.cancelQueries({ queryKey: ["roleInfinite"] }),
    queryClient.cancelQueries({ queryKey: ["roleInfiniteByType"] }),
    queryClient.cancelQueries({ queryKey: ["getUserRolesByType"] }),
    queryClient.cancelQueries({ queryKey: ["getUserRolesByTypes"] }),
    queryClient.cancelQueries({ queryKey: ["getUserRoles"] }),
  ]);

  const snapshots = snapshotUserRoleListQueries(queryClient);
  const roleIdSet = new Set(validRoleIds);

  snapshots.forEach(({ queryKey }) => {
    queryClient.setQueryData(queryKey, old => updateRoleListCacheData(
      old,
      list => removeUserRoleList(list, roleIdSet),
    ));
  });

  return snapshots;
}

export function rollbackUserRoleListQueryCache(
  queryClient: QueryClient,
  snapshots?: RoleListQuerySnapshot,
): void {
  snapshots?.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

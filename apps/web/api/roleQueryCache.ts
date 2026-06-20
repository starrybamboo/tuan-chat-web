import type { QueryClient } from "@tanstack/react-query";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

export type RoleListQuerySnapshot = Array<{
  queryKey: readonly unknown[];
  data: unknown;
}>;

export type UserRoleCacheRecord = UserRole;

export type RoleAvatarFieldPatch = {
  roleId: number;
  avatarId?: number;
  avatarFileId?: number;
  avatarMediaType?: string;
};

const ROLE_DETAIL_CACHE_COMPLETE_FIELD = "__tcRoleDetailComplete";

type SeedUserRoleQueryCacheOptions = {
  detailComplete?: boolean;
};

function hasRoleId(role?: UserRoleCacheRecord | null): role is UserRoleCacheRecord & { roleId: number } {
  return typeof role?.roleId === "number" && role.roleId > 0;
}

function hasPatchRoleId(role?: RoleAvatarFieldPatch | null): role is RoleAvatarFieldPatch {
  return typeof role?.roleId === "number" && role.roleId > 0;
}

function hasAvatarId(role?: UserRoleCacheRecord | null): role is UserRoleCacheRecord & { avatarId: number } {
  return typeof role?.avatarId === "number" && role.avatarId > 0;
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
  role?: UserRoleCacheRecord | null,
  options?: SeedUserRoleQueryCacheOptions,
): void {
  if (!hasRoleId(role)) {
    return;
  }

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
      },
    };
  });

  if (!hasAvatarId(role)) {
    return;
  }

  queryClient.setQueryData(["getRoleAvatar", role.avatarId], (old: any) => {
    const previousData = old?.data ?? {};
    return {
      ...(old && typeof old === "object" ? old : {}),
      success: old?.success ?? true,
      data: {
        ...previousData,
        avatarId: role.avatarId,
        roleId: role.roleId,
        avatarFileId: role.avatarFileId,
        avatarMediaType: role.avatarMediaType,
      },
    };
  });
}

function isUserRoleListQueryKey(queryKey: readonly unknown[]): boolean {
  const scope = queryKey[0];
  return scope === "getUserRoles"
    || scope === "getUserRolesByType"
    || scope === "getUserRolesByTypes";
}

function isRoomRoleListQueryKey(queryKey: readonly unknown[]): boolean {
  const scope = queryKey[0];
  return scope === "roomRole" || scope === "roomNpcRole";
}

function shouldContainRole(queryKey: readonly unknown[], role: UserRoleCacheRecord): boolean {
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

  if (scope === "getUserRolesByType") {
    return queryKey[2] === roleType;
  }

  if (scope === "getUserRolesByTypes") {
    return queryKey.slice(2).includes(roleType);
  }

  return scope === "getUserRoles";
}

function getTypePriority(role: UserRoleCacheRecord): number {
  if (role.type === 1) return 0;
  if (role.type === 0) return 1;
  if (role.type === 2) return 2;
  return 3;
}

function sortUserRoles(roles: UserRoleCacheRecord[]): UserRoleCacheRecord[] {
  return [...roles].sort((a, b) => {
    const typePriorityDiff = getTypePriority(a) - getTypePriority(b);
    if (typePriorityDiff !== 0) {
      return typePriorityDiff;
    }
    return (b.roleId ?? 0) - (a.roleId ?? 0);
  });
}

function upsertUserRoleList(list: UserRoleCacheRecord[], role: UserRoleCacheRecord): UserRoleCacheRecord[] {
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
    };
  });

  if (!found) {
    next.push(role);
  }

  return sortUserRoles(next);
}

function removeUserRoleList(list: UserRoleCacheRecord[], roleIds: Set<number>): UserRoleCacheRecord[] {
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
  updateList: (list: UserRoleCacheRecord[]) => UserRoleCacheRecord[],
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

export function upsertUserRoleListQueryCache(queryClient: QueryClient, role?: UserRoleCacheRecord | null): void {
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

import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRoleAvatarCollectionSync,
  fetchRoleCollectionSync,
  getRoleAvatarListQueryKey,
  mergeRoleAvatarCollectionSync,
  mergeRoleCollectionSync,
} from "@tuanchat/query/roles";
import { getUserRolesByTypesQueryKey } from "@tuanchat/query/room-roles";

import { mobileApiClient } from "@/lib/api";
import {
  readMobileKeyValue,
  writeMobileKeyValue,
} from "@/lib/mobile-key-value-storage";
import {
  readMobileQuerySnapshot,
  writeMobileQuerySnapshot,
} from "@/lib/mobile-query-snapshot-cache";
import { createMobileQuerySnapshotKey } from "@/lib/use-mobile-query-snapshot";

const ROLE_SYNC_SCOPE = "role-sync-cursor";

type SyncCursorEntry = {
  latestSyncId?: unknown;
};

function cursorKey(kind: "roles" | "avatars", scopeId: number) {
  return `${kind}:${scopeId}`;
}

async function readSyncCursor(kind: "roles" | "avatars", scopeId: number, userId: number): Promise<number> {
  try {
    const entry = await readMobileKeyValue<SyncCursorEntry>(cursorKey(kind, scopeId), {
      scope: ROLE_SYNC_SCOPE,
      userId,
    });
    const latestSyncId = entry?.value?.latestSyncId;
    return typeof latestSyncId === "number" && Number.isFinite(latestSyncId) && latestSyncId > 0
      ? latestSyncId
      : 0;
  }
  catch (error) {
    console.warn("[role-sync] 读取本地游标失败，将重新读取基线:", error);
    return 0;
  }
}

async function writeSyncCursor(kind: "roles" | "avatars", scopeId: number, userId: number, latestSyncId: number) {
  if (!Number.isFinite(latestSyncId) || latestSyncId <= 0) {
    return;
  }
  await writeMobileKeyValue(
    cursorKey(kind, scopeId),
    { latestSyncId },
    { scope: ROLE_SYNC_SCOPE, userId },
  );
}

async function readSyncSnapshot<T>(key: string, scope: string, userId: number | null | undefined) {
  try {
    return await readMobileQuerySnapshot<T[]>(key, { scope, userId });
  }
  catch (error) {
    console.warn("[role-sync] 读取本地基线失败，将重新读取服务端基线:", error);
    return null;
  }
}

async function persistSyncProjection<T>(options: {
  cursorKind: "roles" | "avatars";
  latestSyncId: number;
  payload: T[];
  scope: string;
  scopeId: number;
  snapshotKey: string;
  ttlMs: number;
  userId: number;
}) {
  try {
    await writeMobileQuerySnapshot({
      key: options.snapshotKey,
      payload: options.payload,
      scope: options.scope,
      ttlMs: options.ttlMs,
      userId: options.userId,
    });
    // 快照先成功落盘再推进游标，避免崩溃后从缺失基线的中间位置继续同步。
    await writeSyncCursor(options.cursorKind, options.scopeId, options.userId, options.latestSyncId);
  }
  catch (error) {
    console.warn("[role-sync] 写入本地投影失败:", error);
  }
}

export function useIncrementalUserRolesQuery(
  userId: number | null,
  types: readonly number[],
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const queryClient = useQueryClient();
  const enabled = (options.enabled ?? true) && typeof userId === "number" && userId > 0;
  const queryKey = getUserRolesByTypesQueryKey(userId, types);
  const snapshotKey = createMobileQuerySnapshotKey(queryKey);

  return useQuery<UserRole[]>({
    enabled,
    queryKey,
    staleTime: options.staleTime ?? 60_000,
    queryFn: async () => {
      const cached = queryClient.getQueryData<UserRole[]>(queryKey);
      const [snapshot, cursor] = await Promise.all([
        cached === undefined ? readSyncSnapshot<UserRole>(snapshotKey, "my-roles", userId) : Promise.resolve(null),
        readSyncCursor("roles", userId!, userId!),
      ]);
      const current = cached ?? snapshot?.payload ?? [];
      const hasLocalBaseline = cached !== undefined || snapshot !== null;
      const response = await fetchRoleCollectionSync(
        mobileApiClient,
        userId!,
        cursor > 0 && hasLocalBaseline ? cursor : undefined,
      );
      const merged = mergeRoleCollectionSync(current, response);
      const requestedTypes = new Set(types);
      const filtered = merged.filter(role => typeof role.type === "number" && requestedTypes.has(role.type));

      await persistSyncProjection({
        cursorKind: "roles",
        latestSyncId: response.latestSyncId ?? cursor,
        payload: filtered,
        scope: "my-roles",
        scopeId: userId!,
        snapshotKey,
        ttlMs: 10 * 60_000,
        userId: userId!,
      });
      return filtered;
    },
  });
}

export function useIncrementalRoleAvatarsQuery(
  roleId: number | null | undefined,
  userId: number | null | undefined,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const queryClient = useQueryClient();
  const enabled = (options.enabled ?? true)
    && typeof roleId === "number" && roleId > 0
    && typeof userId === "number" && userId > 0;
  const queryKey = getRoleAvatarListQueryKey(roleId);
  const snapshotKey = createMobileQuerySnapshotKey(queryKey);

  return useQuery<RoleAvatar[]>({
    enabled,
    queryKey,
    staleTime: options.staleTime ?? 24 * 60 * 60_000,
    queryFn: async () => {
      const cached = queryClient.getQueryData<RoleAvatar[]>(queryKey);
      const [snapshot, cursor] = await Promise.all([
        cached === undefined ? readSyncSnapshot<RoleAvatar>(snapshotKey, "role-avatars", userId) : Promise.resolve(null),
        readSyncCursor("avatars", roleId!, userId!),
      ]);
      const current = cached ?? snapshot?.payload ?? [];
      const hasLocalBaseline = cached !== undefined || snapshot !== null;
      const response = await fetchRoleAvatarCollectionSync(
        mobileApiClient,
        roleId!,
        cursor > 0 && hasLocalBaseline ? cursor : undefined,
      );
      const merged = mergeRoleAvatarCollectionSync(current, response);

      await persistSyncProjection({
        cursorKind: "avatars",
        latestSyncId: response.latestSyncId ?? cursor,
        payload: merged,
        scope: "role-avatars",
        scopeId: roleId!,
        snapshotKey,
        ttlMs: 24 * 60 * 60_000,
        userId: userId!,
      });
      return merged;
    },
  });
}

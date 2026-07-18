import type { QueryClient } from "@tanstack/react-query";
import type { RoomRoleAddRequest } from "@tuanchat/openapi-client/models/RoomRoleAddRequest";
import type { RoomRoleDeleteRequest } from "@tuanchat/openapi-client/models/RoomRoleDeleteRequest";
import type { SpaceRole } from "@tuanchat/openapi-client/models/SpaceRole";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";

export function roomRoleQueryKey(roomId: number) {
  return ["roomRole", roomId] as const;
}

export function roomNpcRoleQueryKey(roomId: number) {
  return ["roomNpcRole", roomId] as const;
}

export function roomAllRoleQueryKey(roomId: number) {
  return ["roomRoles", roomId] as const;
}

function normalizeRoomRoleIds(request: RoomRoleAddRequest): number[] {
  return Array.from(new Set(
    (request.roleIdList ?? []).filter(roleId => typeof roleId === "number" && roleId > 0),
  ));
}

function mergeRoleList(existing: UserRole[], toAdd: UserRole[]) {
  if (toAdd.length === 0) {
    return existing;
  }
  const existingIds = new Set<number>(existing.map(role => role.roleId));
  const deduped = toAdd.filter(role => !existingIds.has(role.roleId));
  if (deduped.length === 0) {
    return existing;
  }
  return [...existing, ...deduped];
}

function getRoleListFromQueryData(data: unknown): UserRole[] | null {
  if (!data) {
    return null;
  }
  if (Array.isArray(data)) {
    return data as UserRole[];
  }
  if (Array.isArray((data as any).data)) {
    return (data as any).data as UserRole[];
  }
  return null;
}

function patchRoomRoleListData(old: unknown, addList: UserRole[]) {
  if (addList.length === 0) {
    return old;
  }

  if (!old) {
    return { success: true, data: addList };
  }

  if (Array.isArray(old)) {
    return mergeRoleList(old as UserRole[], addList);
  }

  if (Array.isArray((old as any).data)) {
    return {
      ...(old as any),
      data: mergeRoleList((old as any).data as UserRole[], addList),
    };
  }

  return old;
}

function patchRoomAllRoleData(old: unknown, baseRolesToAdd: UserRole[], npcRolesToAdd: UserRole[]) {
  const allRolesToAdd = [...baseRolesToAdd, ...npcRolesToAdd];
  if (allRolesToAdd.length === 0) {
    return old;
  }

  const nextGroups = (groups?: Record<string, unknown>) => ({
    ...groups,
    allRoles: mergeRoleList(Array.isArray(groups?.allRoles) ? groups.allRoles as UserRole[] : [], allRolesToAdd),
    baseRoles: mergeRoleList(Array.isArray(groups?.baseRoles) ? groups.baseRoles as UserRole[] : [], baseRolesToAdd),
    npcRoles: mergeRoleList(Array.isArray(groups?.npcRoles) ? groups.npcRoles as UserRole[] : [], npcRolesToAdd),
  });

  if (!old) {
    return { success: true, data: nextGroups() };
  }
  if (typeof old !== "object" || Array.isArray(old)) {
    return old;
  }
  const data = (old as { data?: unknown }).data;
  if (data !== undefined && (typeof data !== "object" || data === null || Array.isArray(data))) {
    return old;
  }
  return {
    ...old,
    data: nextGroups(data as Record<string, unknown> | undefined),
  };
}

function removeRoomRolesFromData(old: unknown, roleIds: Set<number>): unknown {
  if (Array.isArray(old)) {
    return old.filter(item => !roleIds.has((item as UserRole).roleId));
  }
  if (!old || typeof old !== "object") {
    return old;
  }
  const data = (old as any).data;
  if (Array.isArray(data)) {
    return { ...(old as any), data: removeRoomRolesFromData(data, roleIds) };
  }
  if (data && typeof data === "object") {
    return {
      ...(old as any),
      data: {
        ...data,
        allRoles: removeRoomRolesFromData(data.allRoles, roleIds),
        baseRoles: removeRoomRolesFromData(data.baseRoles, roleIds),
        npcRoles: removeRoomRolesFromData(data.npcRoles, roleIds),
      },
    };
  }
  return old;
}

export function optimisticRemoveRoomRoleQueryCache(queryClient: QueryClient, request: RoomRoleDeleteRequest) {
  const roleIds = new Set(request.roleIdList.filter(roleId => roleId > 0));
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: roomRoleQueryKey(request.roomId),
      update: current => removeRoomRolesFromData(current, roleIds),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: roomNpcRoleQueryKey(request.roomId),
      update: current => removeRoomRolesFromData(current, roleIds),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: roomAllRoleQueryKey(request.roomId),
      update: current => removeRoomRolesFromData(current, roleIds),
    }),
  ]);
}

export function rollbackRemoveRoomRoleQueryCache(
  queryClient: QueryClient,
  transaction: Parameters<typeof rollbackOptimisticQueryTransaction>[1],
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

function findCachedRoleById(queryClient: QueryClient, roleId: number): UserRole | null {
  const directRole = queryClient.getQueryData<any>(["getRole", roleId]);
  const roleFromDirect = directRole?.data as UserRole | undefined;
  if (roleFromDirect && roleFromDirect.roleId === roleId) {
    return roleFromDirect;
  }

  const candidateQueryGroups = [
    queryClient.getQueriesData({ queryKey: ["getUserRoles"] }),
    queryClient.getQueriesData({ queryKey: ["getUserRolesByTypes"] }),
    queryClient.getQueriesData({ queryKey: ["spaceRole"] }),
  ];

  for (const group of candidateQueryGroups) {
    for (const [, data] of group) {
      const list = getRoleListFromQueryData(data);
      const found = list?.find(role => role.roleId === roleId);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function getRoomRolesToAdd(queryClient: QueryClient, roleIds: number[]) {
  const roomRoleToAdd: UserRole[] = [];
  const roomNpcRoleToAdd: UserRole[] = [];

  for (const roleId of roleIds) {
    const cached = findCachedRoleById(queryClient, roleId);
    const optimisticRole: UserRole = cached ?? ({ roleId, roleName: `角色${roleId}`, avatarId: -1 } as any);
    if (cached?.type === 2) {
      roomNpcRoleToAdd.push(optimisticRole);
    }
    else {
      roomRoleToAdd.push(optimisticRole);
    }
  }

  return { roomNpcRoleToAdd, roomRoleToAdd };
}

function patchRoomRoleQueries(queryClient: QueryClient, roomId: number, roleIds: number[]): void {
  const { roomNpcRoleToAdd, roomRoleToAdd } = getRoomRolesToAdd(queryClient, roleIds);
  queryClient.setQueryData(roomRoleQueryKey(roomId), old => patchRoomRoleListData(old, roomRoleToAdd));
  queryClient.setQueryData(roomNpcRoleQueryKey(roomId), old => patchRoomRoleListData(old, roomNpcRoleToAdd));
  queryClient.setQueryData(
    roomAllRoleQueryKey(roomId),
    old => patchRoomAllRoleData(old, roomRoleToAdd, roomNpcRoleToAdd),
  );
}

export async function optimisticAddRoomRoleQueryCache(
  queryClient: QueryClient,
  request: RoomRoleAddRequest,
) {
  const roomId = request.roomId ?? -1;
  const roleIds = normalizeRoomRoleIds(request);
  if (roomId <= 0 || roleIds.length === 0) {
    return beginOptimisticQueryTransaction(queryClient, []);
  }

  const { roomNpcRoleToAdd, roomRoleToAdd } = getRoomRolesToAdd(queryClient, roleIds);
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: roomRoleQueryKey(roomId),
      update: current => patchRoomRoleListData(current, roomRoleToAdd),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: roomNpcRoleQueryKey(roomId),
      update: current => patchRoomRoleListData(current, roomNpcRoleToAdd),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: roomAllRoleQueryKey(roomId),
      update: current => patchRoomAllRoleData(current, roomRoleToAdd, roomNpcRoleToAdd),
    }),
  ]);
}

export function rollbackAddRoomRoleQueryCache(
  queryClient: QueryClient,
  transaction: Parameters<typeof rollbackOptimisticQueryTransaction>[1],
): void {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

export function reconcileAddRoomRoleQueryCache(
  queryClient: QueryClient,
  request: RoomRoleAddRequest,
): void {
  const roomId = request.roomId ?? -1;
  const roleIds = normalizeRoomRoleIds(request);
  if (roomId <= 0 || roleIds.length === 0) {
    return;
  }
  patchRoomRoleQueries(queryClient, roomId, roleIds);
}

export function optimisticAddSpaceRoleQueryCache(queryClient: QueryClient, request: SpaceRole) {
  const spaceId = request.spaceId ?? -1;
  const roleId = request.roleId ?? -1;
  if (spaceId <= 0 || roleId <= 0) {
    return beginOptimisticQueryTransaction(queryClient, []);
  }
  const cached = findCachedRoleById(queryClient, roleId);
  const role: UserRole = {
    ...(cached ?? {
      roleId,
      roleName: `角色${roleId}`,
      type: request.type ?? 0,
      userId: request.userId ?? 0,
    }),
    ...(typeof request.type === "number" ? { type: request.type } : {}),
    ...(typeof request.userId === "number" ? { userId: request.userId } : {}),
  };
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: ["spaceRole", spaceId],
      update: current => patchRoomRoleListData(current, [role]),
    }),
  ]);
}

export function rollbackAddSpaceRoleQueryCache(
  queryClient: QueryClient,
  transaction: Parameters<typeof rollbackOptimisticQueryTransaction>[1],
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

export async function invalidateRoomRoleQueries(queryClient: QueryClient, roomId?: number): Promise<void> {
  if (typeof roomId !== "number" || !Number.isFinite(roomId) || roomId <= 0) {
    return;
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: roomAllRoleQueryKey(roomId) }),
    queryClient.invalidateQueries({ queryKey: roomRoleQueryKey(roomId) }),
    queryClient.invalidateQueries({ queryKey: roomNpcRoleQueryKey(roomId) }),
  ]);
}

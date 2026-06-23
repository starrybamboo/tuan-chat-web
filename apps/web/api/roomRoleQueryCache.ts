import type { QueryClient } from "@tanstack/react-query";
import type { RoomRoleAddRequest } from "@tuanchat/openapi-client/models/RoomRoleAddRequest";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

export function roomRoleQueryKey(roomId: number) {
  return ["roomRole", roomId] as const;
}

export function roomNpcRoleQueryKey(roomId: number) {
  return ["roomNpcRole", roomId] as const;
}

type RoomRoleQuerySnapshot = {
  previousRoomRole: unknown;
  previousRoomNpcRole: unknown;
  roomId: number;
};

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
    queryClient.getQueriesData({ queryKey: ["spaceRepositoryRole"] }),
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
}

export async function optimisticAddRoomRoleQueryCache(
  queryClient: QueryClient,
  request: RoomRoleAddRequest,
): Promise<RoomRoleQuerySnapshot | undefined> {
  const roomId = request.roomId ?? -1;
  const roleIds = normalizeRoomRoleIds(request);
  if (roomId <= 0 || roleIds.length === 0) {
    return undefined;
  }

  await Promise.all([
    queryClient.cancelQueries({ queryKey: roomRoleQueryKey(roomId) }),
    queryClient.cancelQueries({ queryKey: roomNpcRoleQueryKey(roomId) }),
  ]);

  const previousRoomRole = queryClient.getQueryData(roomRoleQueryKey(roomId));
  const previousRoomNpcRole = queryClient.getQueryData(roomNpcRoleQueryKey(roomId));
  patchRoomRoleQueries(queryClient, roomId, roleIds);

  return { previousRoomNpcRole, previousRoomRole, roomId };
}

export function rollbackAddRoomRoleQueryCache(
  queryClient: QueryClient,
  snapshot?: RoomRoleQuerySnapshot,
): void {
  if (!snapshot) {
    return;
  }
  queryClient.setQueryData(roomRoleQueryKey(snapshot.roomId), snapshot.previousRoomRole);
  queryClient.setQueryData(roomNpcRoleQueryKey(snapshot.roomId), snapshot.previousRoomNpcRole);
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

export async function invalidateRoomRoleQueries(queryClient: QueryClient, roomId?: number): Promise<void> {
  if (typeof roomId !== "number" || !Number.isFinite(roomId) || roomId <= 0) {
    return;
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: roomRoleQueryKey(roomId) }),
    queryClient.invalidateQueries({ queryKey: roomNpcRoleQueryKey(roomId) }),
  ]);
}

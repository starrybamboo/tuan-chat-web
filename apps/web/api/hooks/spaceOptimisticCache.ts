import type { QueryClient } from "@tanstack/react-query";
import type { RoomUpdateRequest } from "@tuanchat/openapi-client/models/RoomUpdateRequest";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { SpaceArchiveRequest } from "@tuanchat/openapi-client/models/SpaceArchiveRequest";
import type { SpaceUpdateRequest } from "@tuanchat/openapi-client/models/SpaceUpdateRequest";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "@tuanchat/query/optimistic-cache";
import {
  getMyArchivedSpacesQueryKey,
  getUserActiveSpacesQueryKey,
  getUserSpacesQueryKey,
} from "@tuanchat/query/spaces";

function roomInfoQueryKey(roomId: number) {
  return ["getRoomInfo", roomId] as const;
}

function spaceInfoQueryKey(spaceId: number) {
  return ["getSpaceInfo", spaceId] as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function patchSpaceCacheValue(
  current: unknown,
  spaceId: number,
  update: (space: Space) => Space | null,
): unknown {
  if (Array.isArray(current)) {
    let changed = false;
    const next = current.flatMap((item) => {
      if (!isRecord(item) || item.spaceId !== spaceId) {
        return [item];
      }
      changed = true;
      const patched = update(item as Space);
      return patched ? [patched] : [];
    });
    return changed ? next : current;
  }
  if (!isRecord(current)) {
    return current;
  }
  if (current.spaceId === spaceId) {
    return update(current as Space);
  }
  if (Object.prototype.hasOwnProperty.call(current, "data")) {
    const patched = patchSpaceCacheValue(current.data, spaceId, update);
    return patched === current.data ? current : { ...current, data: patched };
  }
  return current;
}

function findSpace(current: unknown, spaceId: number): Space | undefined {
  if (Array.isArray(current)) {
    return current.map(item => findSpace(item, spaceId)).find(Boolean);
  }
  if (!isRecord(current)) {
    return undefined;
  }
  if (current.spaceId === spaceId) {
    return current as Space;
  }
  return findSpace(current.data, spaceId);
}

function findSpaceAcrossCaches(queryClient: QueryClient, spaceId: number) {
  for (const queryKey of [spaceInfoQueryKey(spaceId), getUserSpacesQueryKey(), getUserActiveSpacesQueryKey(), getMyArchivedSpacesQueryKey()]) {
    const found = findSpace(queryClient.getQueryData(queryKey), spaceId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function addSpaceToList(current: unknown, space: Space | undefined) {
  if (!space || !isRecord(current) || !Array.isArray(current.data)) {
    return current;
  }
  if (current.data.some((item: Space) => item.spaceId === space.spaceId)) {
    return current;
  }
  return { ...current, data: [...current.data, space] };
}

function removeSpaceFromList(current: unknown, spaceId: number) {
  return patchSpaceCacheValue(current, spaceId, () => null);
}

export function beginSpaceUpdateOptimisticMutation(queryClient: QueryClient, request: SpaceUpdateRequest) {
  const queryKeys = [spaceInfoQueryKey(request.spaceId), getUserSpacesQueryKey(), getUserActiveSpacesQueryKey(), getMyArchivedSpacesQueryKey()];
  return beginOptimisticQueryTransaction(queryClient, queryKeys.map(queryKey => optimisticQueryPatch<unknown>({
    queryKey,
    update: current => patchSpaceCacheValue(current, request.spaceId, space => ({ ...space, ...request })),
  })));
}

export function beginSpaceRemovalOptimisticMutation(queryClient: QueryClient, spaceId: number) {
  const queryKeys = [spaceInfoQueryKey(spaceId), getUserSpacesQueryKey(), getUserActiveSpacesQueryKey(), getMyArchivedSpacesQueryKey()];
  return beginOptimisticQueryTransaction(queryClient, queryKeys.map(queryKey => optimisticQueryPatch<unknown>({
    queryKey,
    update: current => patchSpaceCacheValue(current, spaceId, () => null),
  })));
}

export function beginSpaceArchiveOptimisticMutation(queryClient: QueryClient, request: SpaceArchiveRequest) {
  const archived = request.archiveRequested ?? request.archived;
  const space = findSpaceAcrossCaches(queryClient, request.spaceId);
  const patchedSpace: Space | undefined = space
    ? { ...space, active: !archived, archived, archiveView: archived, status: archived ? 2 : 0 }
    : undefined;
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: spaceInfoQueryKey(request.spaceId),
      update: current => patchSpaceCacheValue(current, request.spaceId, value => ({
        ...value,
        active: !archived,
        archived,
        archiveView: archived,
        status: archived ? 2 : 0,
      })),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: getUserSpacesQueryKey(),
      update: current => patchSpaceCacheValue(current, request.spaceId, value => ({ ...value, active: !archived, archived, status: archived ? 2 : 0 })),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: getUserActiveSpacesQueryKey(),
      update: current => archived
        ? removeSpaceFromList(current, request.spaceId)
        : addSpaceToList(current, patchedSpace),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: getMyArchivedSpacesQueryKey(),
      update: current => archived
        ? addSpaceToList(current, patchedSpace)
        : removeSpaceFromList(current, request.spaceId),
    }),
  ]);
}

function removeRoomFromCacheValue(current: unknown, roomId: number): unknown {
  if (!isRecord(current)) {
    return current;
  }
  if (current.roomId === roomId) {
    return null;
  }
  if (isRecord(current.data) && Array.isArray(current.data.rooms)) {
    const rooms = current.data.rooms.filter((room: RoomUpdateRequest) => room.roomId !== roomId);
    return rooms.length === current.data.rooms.length
      ? current
      : { ...current, data: { ...current.data, rooms } };
  }
  return current;
}

export function beginRoomRemovalOptimisticMutation(queryClient: QueryClient, roomId: number) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<unknown>({
      queryKey: roomInfoQueryKey(roomId),
      update: current => removeRoomFromCacheValue(current, roomId),
    }),
    optimisticQueryPatch<unknown>({
      queryKey: ["getUserRooms"],
      exact: false,
      update: current => removeRoomFromCacheValue(current, roomId),
    }),
  ]);
}

export function rollbackSpaceOptimisticMutation(
  queryClient: QueryClient,
  transaction: Parameters<typeof rollbackOptimisticQueryTransaction>[1],
) {
  rollbackOptimisticQueryTransaction(queryClient, transaction);
}

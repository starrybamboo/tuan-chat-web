import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultListSpace } from "@tuanchat/openapi-client/models/ApiResultListSpace";
import type { ApiResultRoomListResponse } from "@tuanchat/openapi-client/models/ApiResultRoomListResponse";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useQuery, useQueryClient } from "@tanstack/react-query";

export type ResourceQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  retry?: boolean | number;
};

type SpaceClient = Pick<TuanChat, "roomController" | "spaceController"> & {
  request?: TuanChat["request"];
};

type SpaceSyncRecord = Space & {
  syncId?: number;
  syncOperation?: "UPSERT" | "DELETE" | string;
};

type RoomSyncRecord = Room & {
  syncId?: number;
  syncOperation?: "UPSERT" | "DELETE" | string;
};

export type SpaceSyncResponse = {
  baseline?: boolean;
  latestSyncId?: number;
  spaces?: SpaceSyncRecord[];
};

export type RoomSyncResponse = {
  baseline?: boolean;
  latestSyncId?: number;
  spaceId?: number;
  rooms?: RoomSyncRecord[];
};

type ApiResult<T> = {
  success: boolean;
  errMsg?: string;
  data?: T;
};

type SpaceQueryData = ApiResultListSpace & { latestSyncId?: number };
type RoomQueryData = ApiResultRoomListResponse & {
  data?: (NonNullable<ApiResultRoomListResponse["data"]> & { latestSyncId?: number; baseline?: boolean });
};

export function getUserSpacesQueryKey() {
  return ["getUserSpaces"] as const;
}

export function getUserActiveSpacesQueryKey() {
  return ["getUserActiveSpaces"] as const;
}

export function getMyArchivedSpacesQueryKey() {
  return ["getMyArchivedSpaces"] as const;
}

export function getUserRoomsQueryKey(spaceId: number) {
  return ["getUserRooms", spaceId] as const;
}

function isSameSpace(left: Space, right: Space): boolean {
  return typeof left.spaceId === "number" && left.spaceId === right.spaceId;
}

function isSameRoom(left: Room, right: Room): boolean {
  return typeof left.roomId === "number" && left.roomId === right.roomId;
}

export function mergeSpaceCollectionSync(
  current: Space[],
  response: SpaceSyncResponse,
  activeOnly = false,
): Space[] {
  const next = new Map<number, Space>();
  if (!response.baseline) {
    current.forEach((space) => {
      if (typeof space.spaceId === "number") {
        next.set(space.spaceId, space);
      }
    });
  }
  for (const space of response.spaces ?? []) {
    if (typeof space.spaceId !== "number") {
      continue;
    }
    const shouldRemove = space.syncOperation === "DELETE"
      || space.status === 1
      || (activeOnly && space.status !== 0);
    if (shouldRemove) {
      next.delete(space.spaceId);
    }
    else {
      next.set(space.spaceId, space);
    }
  }
  return [...next.values()];
}

export function mergeRoomCollectionSync(current: Room[], response: RoomSyncResponse): Room[] {
  const next = new Map<number, Room>();
  if (!response.baseline) {
    current.forEach((room) => {
      if (typeof room.roomId === "number") {
        next.set(room.roomId, room);
      }
    });
  }
  for (const room of response.rooms ?? []) {
    if (typeof room.roomId !== "number") {
      continue;
    }
    if (room.syncOperation === "DELETE" || room.status === 1) {
      next.delete(room.roomId);
    }
    else {
      next.set(room.roomId, room);
    }
  }
  return [...next.values()];
}

export async function fetchSpaceCollectionSync(client: SpaceClient, afterSyncId = 0) {
  if (!client.request) {
    const fallback = await client.spaceController.getUserSpaces();
    return {
      baseline: true,
      latestSyncId: 0,
      spaces: fallback.data ?? [],
    } satisfies SpaceSyncResponse;
  }
  const result = await client.request.request<ApiResult<SpaceSyncResponse>>({
    method: "GET",
    url: "/space/list/sync",
    query: { afterSyncId },
  });
  if (!result.success || !result.data) {
    throw new Error(result.errMsg || "获取空间增量失败");
  }
  return result.data;
}

export async function fetchRoomCollectionSync(client: SpaceClient, spaceId: number, afterSyncId = 0) {
  if (!client.request) {
    const fallback = await client.roomController.getUserRooms(spaceId);
    return {
      baseline: true,
      latestSyncId: 0,
      rooms: fallback.data?.rooms ?? [],
      spaceId,
    } satisfies RoomSyncResponse;
  }
  const result = await client.request.request<ApiResult<RoomSyncResponse>>({
    method: "GET",
    url: "/room/list/sync",
    query: { afterSyncId, spaceId },
  });
  if (!result.success || !result.data) {
    throw new Error(result.errMsg || "获取房间增量失败");
  }
  return result.data;
}

async function fetchSpaceCollectionQuery(
  queryClient: QueryClient,
  client: SpaceClient,
  queryKey: readonly unknown[],
  activeOnly: boolean,
): Promise<SpaceQueryData> {
  const current = queryClient.getQueryData<SpaceQueryData>(queryKey);
  const response = await fetchSpaceCollectionSync(client, current?.latestSyncId ?? 0);
  return {
    success: true,
    data: mergeSpaceCollectionSync(current?.data ?? [], response, activeOnly),
    latestSyncId: response.latestSyncId ?? current?.latestSyncId ?? 0,
  };
}

async function fetchRoomCollectionQuery(
  queryClient: QueryClient,
  client: SpaceClient,
  spaceId: number,
): Promise<RoomQueryData> {
  const queryKey = getUserRoomsQueryKey(spaceId);
  const current = queryClient.getQueryData<RoomQueryData>(queryKey);
  const response = await fetchRoomCollectionSync(client, spaceId, current?.data?.latestSyncId ?? 0);
  return {
    success: true,
    data: {
      spaceId: response.spaceId ?? spaceId,
      rooms: mergeRoomCollectionSync(current?.data?.rooms ?? [], response),
      latestSyncId: response.latestSyncId ?? current?.data?.latestSyncId ?? 0,
      baseline: response.baseline,
    },
  };
}

export function upsertUserActiveSpacesData(
  currentData: ApiResultListSpace | undefined,
  space: Space,
): ApiResultListSpace | undefined {
  if (typeof space.spaceId !== "number") {
    return currentData;
  }

  const currentSpaces = currentData?.data ?? [];
  const hasExisting = currentSpaces.some(item => isSameSpace(item, space));
  const nextSpaces = hasExisting
    ? currentSpaces.map(item => (isSameSpace(item, space) ? { ...item, ...space } : item))
    : [...currentSpaces, space];

  return {
    ...(currentData ?? { success: true }),
    data: nextSpaces,
  };
}

export function upsertUserRoomData(
  currentData: ApiResultRoomListResponse | undefined,
  spaceId: number,
  room: Room,
): ApiResultRoomListResponse | undefined {
  if (typeof room.roomId !== "number") {
    return currentData;
  }

  const currentRooms = currentData?.data?.rooms ?? [];
  const hasExisting = currentRooms.some(item => isSameRoom(item, room));
  const nextRooms = hasExisting
    ? currentRooms.map(item => (isSameRoom(item, room) ? { ...item, ...room } : item))
    : [...currentRooms, room];

  return {
    ...(currentData ?? { success: true }),
    data: {
      ...currentData?.data,
      spaceId,
      rooms: nextRooms,
    },
  };
}

export function patchExistingUserRoomData(
  currentData: ApiResultRoomListResponse | undefined,
  roomPatch: Room,
): ApiResultRoomListResponse | undefined {
  if (typeof roomPatch.roomId !== "number" || !currentData?.data?.rooms) {
    return currentData;
  }

  let patched = false;
  const rooms = currentData.data.rooms.map(room => {
    if (!isSameRoom(room, roomPatch)) {
      return room;
    }
    patched = true;
    return { ...room, ...roomPatch };
  });

  if (!patched) {
    return currentData;
  }

  return {
    ...currentData,
    data: {
      ...currentData.data,
      rooms,
    },
  };
}

export function upsertUserActiveSpaceQueryData(queryClient: QueryClient, space: Space) {
  queryClient.setQueryData<ApiResultListSpace>(
    getUserActiveSpacesQueryKey(),
    current => upsertUserActiveSpacesData(current, space),
  );
  queryClient.setQueryData<ApiResultListSpace>(
    getUserSpacesQueryKey(),
    current => upsertUserActiveSpacesData(current, space),
  );
}

export function upsertUserRoomQueryData(queryClient: QueryClient, spaceId: number, room: Room) {
  queryClient.setQueryData<ApiResultRoomListResponse>(
    getUserRoomsQueryKey(spaceId),
    current => upsertUserRoomData(current, spaceId, room),
  );
}

export function useGetUserSpacesQuery(client: SpaceClient, options?: ResourceQueryOptions) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: getUserSpacesQueryKey(),
    queryFn: () => fetchSpaceCollectionQuery(queryClient, client, getUserSpacesQueryKey(), false),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? true,
    retry: options?.retry,
  });
}

export function useGetUserActiveSpacesQuery(client: SpaceClient, options?: ResourceQueryOptions) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: getUserActiveSpacesQueryKey(),
    queryFn: () => fetchSpaceCollectionQuery(queryClient, client, getUserActiveSpacesQueryKey(), true),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? true,
    retry: options?.retry,
  });
}

export function useGetMyArchivedSpacesQuery(client: SpaceClient, options?: ResourceQueryOptions) {
  return useQuery({
    queryKey: getMyArchivedSpacesQueryKey(),
    queryFn: () => client.spaceController.listMyArchivedSpaces(),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? true,
    retry: options?.retry,
  });
}

export function fetchUserSpacesWithCache(
  queryClient: QueryClient,
  client: SpaceClient,
  options?: ResourceQueryOptions,
) {
  return queryClient.fetchQuery({
    queryKey: getUserSpacesQueryKey(),
    queryFn: () => fetchSpaceCollectionQuery(queryClient, client, getUserSpacesQueryKey(), false),
    staleTime: options?.staleTime ?? 300_000,
  });
}

export function fetchUserActiveSpacesWithCache(
  queryClient: QueryClient,
  client: SpaceClient,
  options?: ResourceQueryOptions,
) {
  return queryClient.fetchQuery({
    queryKey: getUserActiveSpacesQueryKey(),
    queryFn: () => fetchSpaceCollectionQuery(queryClient, client, getUserActiveSpacesQueryKey(), true),
    staleTime: options?.staleTime ?? 300_000,
  });
}

export function useGetUserRoomsQuery(client: SpaceClient, spaceId: number, options?: ResourceQueryOptions) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: getUserRoomsQueryKey(spaceId),
    queryFn: () => fetchRoomCollectionQuery(queryClient, client, spaceId),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? spaceId !== -1,
    retry: options?.retry,
  });
}

export function fetchUserRoomsWithCache(queryClient: QueryClient, client: SpaceClient, spaceId: number, options?: ResourceQueryOptions) {
  return queryClient.fetchQuery({
    queryKey: getUserRoomsQueryKey(spaceId),
    queryFn: () => fetchRoomCollectionQuery(queryClient, client, spaceId),
    staleTime: options?.staleTime ?? 300_000,
  });
}

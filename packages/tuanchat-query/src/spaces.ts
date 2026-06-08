import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultListSpace } from "@tuanchat/openapi-client/models/ApiResultListSpace";
import type { ApiResultRoomListResponse } from "@tuanchat/openapi-client/models/ApiResultRoomListResponse";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useQuery } from "@tanstack/react-query";

export type ResourceQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  retry?: boolean | number;
};

type SpaceClient = Pick<TuanChat, "spaceController" | "roomController">;

export function getUserSpacesQueryKey() {
  return ["getUserSpaces"] as const;
}

export function getUserActiveSpacesQueryKey() {
  return ["getUserActiveSpaces"] as const;
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
  return useQuery({
    queryKey: getUserSpacesQueryKey(),
    queryFn: () => client.spaceController.getUserSpaces(),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? true,
    retry: options?.retry,
  });
}

export function useGetUserActiveSpacesQuery(client: SpaceClient, options?: ResourceQueryOptions) {
  return useQuery({
    queryKey: getUserActiveSpacesQueryKey(),
    queryFn: () => client.spaceController.getUserActiveSpaces(),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? true,
    retry: options?.retry,
  });
}

export function useGetUserRoomsQuery(client: SpaceClient, spaceId: number, options?: ResourceQueryOptions) {
  return useQuery({
    queryKey: getUserRoomsQueryKey(spaceId),
    queryFn: () => client.roomController.getUserRooms(spaceId),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? spaceId !== -1,
    retry: options?.retry,
  });
}

export function fetchUserRoomsWithCache(queryClient: QueryClient, client: SpaceClient, spaceId: number, options?: ResourceQueryOptions) {
  return queryClient.fetchQuery({
    queryKey: getUserRoomsQueryKey(spaceId),
    queryFn: () => client.roomController.getUserRooms(spaceId),
    staleTime: options?.staleTime ?? 300_000,
  });
}

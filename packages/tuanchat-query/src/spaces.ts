import { useQuery } from "@tanstack/react-query";

import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

export type ResourceQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
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

export function useGetUserSpacesQuery(client: SpaceClient, options?: ResourceQueryOptions) {
  return useQuery({
    queryKey: getUserSpacesQueryKey(),
    queryFn: () => client.spaceController.getUserSpaces(),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? true,
  });
}

export function useGetUserActiveSpacesQuery(client: SpaceClient, options?: ResourceQueryOptions) {
  return useQuery({
    queryKey: getUserActiveSpacesQueryKey(),
    queryFn: () => client.spaceController.getUserActiveSpaces(),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? true,
  });
}

export function useGetUserRoomsQuery(client: SpaceClient, spaceId: number, options?: ResourceQueryOptions) {
  return useQuery({
    queryKey: getUserRoomsQueryKey(spaceId),
    queryFn: () => client.roomController.getUserRooms(spaceId),
    staleTime: options?.staleTime ?? 300_000,
    enabled: options?.enabled ?? spaceId !== -1,
  });
}

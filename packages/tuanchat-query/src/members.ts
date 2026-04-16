import { useQuery } from "@tanstack/react-query";

import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

export type MemberQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean | "always";
};

type MemberClient = Pick<TuanChat, "roomMemberController" | "spaceMemberController">;

export function getSpaceMembersQueryKey(spaceId: number) {
  return ["getSpaceMemberList", spaceId] as const;
}

export function getRoomMembersQueryKey(roomId: number) {
  return ["getRoomMemberList", roomId] as const;
}

export function useGetSpaceMembersQuery(client: MemberClient, spaceId: number, options?: MemberQueryOptions) {
  return useQuery({
    queryKey: getSpaceMembersQueryKey(spaceId),
    queryFn: () => client.spaceMemberController.getMemberList(spaceId),
    staleTime: options?.staleTime ?? 300_000,
    refetchOnMount: options?.refetchOnMount,
    enabled: (options?.enabled ?? true) && spaceId > 0,
  });
}

export function useGetRoomMembersQuery(client: MemberClient, roomId: number, options?: MemberQueryOptions) {
  return useQuery({
    queryKey: getRoomMembersQueryKey(roomId),
    queryFn: () => client.roomMemberController.getMemberList1(roomId),
    staleTime: options?.staleTime ?? 300_000,
    refetchOnMount: options?.refetchOnMount,
    enabled: (options?.enabled ?? true) && roomId > 0,
  });
}

import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultListRoomMember } from "@tuanchat/openapi-client/models/ApiResultListRoomMember";
import type { ApiResultListSpaceMember } from "@tuanchat/openapi-client/models/ApiResultListSpaceMember";
import type { RoomMember } from "@tuanchat/openapi-client/models/RoomMember";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useQuery } from "@tanstack/react-query";

import { bindCancelablePromiseToSignal } from "./cancelable";
import { beginOptimisticQueryTransaction, optimisticQueryPatch } from "./optimistic-cache";

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

function buildRoomMemberFromSpaceCache(
  queryClient: QueryClient,
  roomId: number,
  spaceId: number,
  userId: number,
): RoomMember {
  const source = queryClient
    .getQueryData<ApiResultListSpaceMember>(getSpaceMembersQueryKey(spaceId))
    ?.data
    ?.find(member => member.userId === userId);
  return {
    avatarFileId: source?.avatarFileId,
    avatarMediaType: source?.avatarMediaType,
    roomId,
    userId,
    username: source?.username,
  };
}

/** 将已存在的空间成员即时加入房间成员缓存。 */
export function beginAddRoomMemberOptimisticMutation(
  queryClient: QueryClient,
  request: { roomId: number; spaceId: number; userId: number },
) {
  const member = buildRoomMemberFromSpaceCache(
    queryClient,
    request.roomId,
    request.spaceId,
    request.userId,
  );
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListRoomMember>({
      queryKey: getRoomMembersQueryKey(request.roomId),
      update: (current) => {
        if (current?.data?.some(item => item.userId === request.userId)) {
          return current;
        }
        return {
          ...(current ?? { success: true }),
          data: [...(current?.data ?? []), member],
        };
      },
    }),
  ]);
}

export function useGetSpaceMembersQuery(client: MemberClient, spaceId: number, options?: MemberQueryOptions) {
  return useQuery({
    queryKey: getSpaceMembersQueryKey(spaceId),
    queryFn: ({ signal }) => bindCancelablePromiseToSignal(client.spaceMemberController.getMemberList(spaceId), signal),
    staleTime: options?.staleTime ?? 300_000,
    refetchOnMount: options?.refetchOnMount,
    enabled: (options?.enabled ?? true) && spaceId > 0,
  });
}

export function useGetRoomMembersQuery(client: MemberClient, roomId: number, options?: MemberQueryOptions) {
  return useQuery({
    queryKey: getRoomMembersQueryKey(roomId),
    queryFn: ({ signal }) => bindCancelablePromiseToSignal(client.roomMemberController.getMemberList1(roomId), signal),
    staleTime: options?.staleTime ?? 300_000,
    refetchOnMount: options?.refetchOnMount,
    enabled: (options?.enabled ?? true) && roomId > 0,
  });
}

export function fetchSpaceMembersWithCache(queryClient: QueryClient, client: MemberClient, spaceId: number, options?: MemberQueryOptions) {
  return queryClient.fetchQuery({
    queryKey: getSpaceMembersQueryKey(spaceId),
    queryFn: () => client.spaceMemberController.getMemberList(spaceId),
    staleTime: options?.staleTime ?? 300_000,
  });
}

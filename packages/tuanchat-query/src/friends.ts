import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FriendListRequest } from "@tuanchat/openapi-client/models/FriendListRequest";
import type { FriendReqHandleRequest } from "@tuanchat/openapi-client/models/FriendReqHandleRequest";
import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type FriendClient = Pick<TuanChat, "friendController">;

export function getFriendsQueryKey(request: FriendListRequest = { pageNo: 1, pageSize: 100 }) {
  return ["friends", request] as const;
}

export function getFriendRequestsQueryKey(request: { pageNo?: number; pageSize?: number } = { pageNo: 1, pageSize: 50 }) {
  return ["friendRequests", request] as const;
}

export function getBlacklistQueryKey(request: { pageNo?: number; pageSize?: number } = { pageNo: 1, pageSize: 50 }) {
  return ["blacklist", request] as const;
}

export function getFriendCheckQueryKey(targetUserId: number) {
  return ["friendCheck", targetUserId] as const;
}

export function useFriendsQuery(
  client: FriendClient,
  request: FriendListRequest = { pageNo: 1, pageSize: 100 },
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<FriendResponse[]>({
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await client.friendController.getFriendList(request);
      return res.data ?? [];
    },
    queryKey: getFriendsQueryKey(request),
    staleTime: options.staleTime ?? 60_000,
  });
}

export function useFriendRequestsQuery(
  client: FriendClient,
  request: { pageNo?: number; pageSize?: number } = { pageNo: 1, pageSize: 50 },
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await client.friendController.getFriendRequestPage(request);
      return res.data?.list ?? [];
    },
    queryKey: getFriendRequestsQueryKey(request),
    staleTime: options.staleTime ?? 30_000,
  });
}

export function useBlacklistQuery(
  client: FriendClient,
  enabled = true,
  request: { pageNo?: number; pageSize?: number } = { pageNo: 1, pageSize: 50 },
) {
  return useQuery({
    enabled,
    queryFn: async () => {
      const res = await client.friendController.getBlackList(request);
      return res.data ?? [];
    },
    queryKey: getBlacklistQueryKey(request),
    staleTime: 30_000,
  });
}

export function useSendFriendRequestMutation(client: FriendClient) {
  return useMutation({
    mutationFn: (params: { targetUserId: number; verifyMsg: string }) =>
      client.friendController.sendFriendRequest(params),
    mutationKey: ["sendFriendRequest"],
  });
}

export function useAcceptFriendRequestMutation(client: FriendClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendReqId: number) =>
      client.friendController.acceptFriendRequest({ friendReqId } satisfies FriendReqHandleRequest),
    mutationKey: ["acceptFriendRequest"],
    onMutate: async (friendReqId) => {
      await queryClient.cancelQueries({ queryKey: ["friendRequests"] });
      const previousData = queryClient.getQueriesData({ queryKey: ["friendRequests"] });
      queryClient.setQueriesData({ queryKey: ["friendRequests"] }, (old: any) => {
        if (!Array.isArray(old))
          return old;
        return old.filter((r: any) => r?.id !== friendReqId);
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

export function useRejectFriendRequestMutation(client: FriendClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendReqId: number) =>
      client.friendController.rejectFriendRequest({ friendReqId } satisfies FriendReqHandleRequest),
    mutationKey: ["rejectFriendRequest"],
    onMutate: async (friendReqId) => {
      await queryClient.cancelQueries({ queryKey: ["friendRequests"] });
      const previousData = queryClient.getQueriesData({ queryKey: ["friendRequests"] });
      queryClient.setQueriesData({ queryKey: ["friendRequests"] }, (old: any) => {
        if (!Array.isArray(old))
          return old;
        return old.filter((r: any) => r?.id !== friendReqId);
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

export function useDeleteFriendMutation(client: FriendClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      client.friendController.deleteFriend({ targetUserId }),
    mutationKey: ["deleteFriend"],
    onSuccess: (_result, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["dmInbox"] });
      queryClient.invalidateQueries({ queryKey: getFriendCheckQueryKey(targetUserId) });
    },
  });
}

export function useBlockFriendMutation(client: FriendClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      client.friendController.blockFriend({ targetUserId }),
    mutationKey: ["blockFriend"],
    onSuccess: (_result, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["blacklist"] });
      queryClient.invalidateQueries({ queryKey: getFriendCheckQueryKey(targetUserId) });
    },
  });
}

export function useUnblockFriendMutation(client: FriendClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      client.friendController.unblockFriend({ targetUserId }),
    mutationKey: ["unblockFriend"],
    onSuccess: (_result, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["blacklist"] });
      queryClient.invalidateQueries({ queryKey: getFriendCheckQueryKey(targetUserId) });
    },
  });
}

export function useCheckFriendMutation(client: FriendClient) {
  return useMutation({
    mutationFn: (targetUserId: number) =>
      client.friendController.checkFriend({ targetUserId }),
    mutationKey: ["checkFriend"],
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mobileApiClient } from "@/lib/api";

export function useSendFriendRequestMutation() {
  return useMutation({
    mutationFn: (params: { targetUserId: number; verifyMsg: string }) =>
      mobileApiClient.friendController.sendFriendRequest(params),
  });
}

export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendReqId: number) =>
      mobileApiClient.friendController.acceptFriendRequest({ friendReqId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

export function useRejectFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendReqId: number) =>
      mobileApiClient.friendController.rejectFriendRequest({ friendReqId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

export function useDeleteFriendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      mobileApiClient.friendController.deleteFriend({ targetUserId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
      void queryClient.invalidateQueries({ queryKey: ["dmInbox"] });
    },
  });
}

export function useBlockFriendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      mobileApiClient.friendController.blockFriend({ targetUserId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
      void queryClient.invalidateQueries({ queryKey: ["blacklist"] });
    },
  });
}

export function useUnblockFriendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      mobileApiClient.friendController.unblockFriend({ targetUserId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blacklist"] });
    },
  });
}

export function useCheckFriendMutation() {
  return useMutation({
    mutationFn: (targetUserId: number) =>
      mobileApiClient.friendController.checkFriend({ targetUserId }),
  });
}

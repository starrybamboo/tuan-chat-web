import { mobileApiClient } from "@/lib/api";
import {
  useAcceptFriendRequestMutation as useSharedAcceptFriendRequestMutation,
  useBlockFriendMutation as useSharedBlockFriendMutation,
  useCheckFriendMutation as useSharedCheckFriendMutation,
  useDeleteFriendMutation as useSharedDeleteFriendMutation,
  useRejectFriendRequestMutation as useSharedRejectFriendRequestMutation,
  useSendFriendRequestMutation as useSharedSendFriendRequestMutation,
  useUnblockFriendMutation as useSharedUnblockFriendMutation,
} from "@tuanchat/query/friends";

export function useSendFriendRequestMutation() {
  return useSharedSendFriendRequestMutation(mobileApiClient);
}

export function useAcceptFriendRequestMutation() {
  return useSharedAcceptFriendRequestMutation(mobileApiClient);
}

export function useRejectFriendRequestMutation() {
  return useSharedRejectFriendRequestMutation(mobileApiClient);
}

export function useDeleteFriendMutation() {
  return useSharedDeleteFriendMutation(mobileApiClient);
}

export function useBlockFriendMutation() {
  return useSharedBlockFriendMutation(mobileApiClient);
}

export function useUnblockFriendMutation() {
  return useSharedUnblockFriendMutation(mobileApiClient);
}

export function useCheckFriendMutation() {
  return useSharedCheckFriendMutation(mobileApiClient);
}

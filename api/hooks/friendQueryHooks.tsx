import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { tuanchat } from "../instance";
import type { FriendCheckRequest } from "../models/FriendCheckRequest";
import type { FriendDeleteRequest } from "../models/FriendDeleteRequest";
import type { FriendListRequest } from "../models/FriendListRequest";
import type { FriendReqHandleRequest } from "../models/FriendReqHandleRequest";
import type { FriendReqSendRequest } from "../models/FriendReqSendRequest";
import type { PageBaseRequest } from "../models/PageBaseRequest";

/**
 * 获取当前登录用户的好友列表
 */
export function useGetFriendListQuery(requestBody: FriendListRequest) {
  return useQuery({
    queryKey: ["friendList", requestBody],
    queryFn: () => tuanchat.friendController.getFriendList(requestBody),
    staleTime: 300000, // 5分钟缓存
  });
}

/**
 * 检查与指定用户的好友关系
 */
export function useCheckFriendQuery(targetUserId: number, enabled = true) {
  const requestBody: FriendCheckRequest = { targetUserId };
  return useQuery({
    queryKey: ["friendCheck", targetUserId],
    queryFn: () => tuanchat.friendController.checkFriend(requestBody),
    enabled: enabled && targetUserId > 0,
    staleTime: 300000,
  });
}

/**
 * 获取好友申请列表（包含发送/接收）
 */
export function useGetFriendRequestPageQuery(requestBody: PageBaseRequest, enabled = true) {
  return useQuery({
    queryKey: ["friendRequestPage", requestBody],
    queryFn: () => tuanchat.friendController.getFriendRequestPage(requestBody),
    enabled,
    staleTime: 30000,
  });
}

/**
 * 发送好友申请
 */
export function useSendFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: FriendReqSendRequest) => tuanchat.friendController.sendFriendRequest(requestBody),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["friendCheck", variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
    },
  });
}

/**
 * 同意好友申请
 */
export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: FriendReqHandleRequest) => tuanchat.friendController.acceptFriendRequest(requestBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
      queryClient.invalidateQueries({ queryKey: ["friendList"] });
      queryClient.invalidateQueries({ queryKey: ["friendCheck"] });
    },
  });
}

/**
 * 拒绝好友申请
 */
export function useRejectFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: FriendReqHandleRequest) => tuanchat.friendController.rejectFriendRequest(requestBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
      queryClient.invalidateQueries({ queryKey: ["friendCheck"] });
    },
  });
}

/**
 * 删除好友（双向解除）
 */
export function useDeleteFriendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: FriendDeleteRequest) => tuanchat.friendController.deleteFriend(requestBody),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["friendList"] });
      queryClient.invalidateQueries({ queryKey: ["friendCheck", variables.targetUserId] });
    },
  });
}

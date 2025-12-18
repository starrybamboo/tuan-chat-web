import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MessageDirectReadUpdateRequest, MessageDirectRecallRequest, MessageDirectSendRequest } from "api";
import { tuanchat } from "../instance";
import { useMemo } from "react";

/**
 * 获取收件箱消息全量数据
 */
export function useGetInboxMessagePageQuery() {
  return useQuery({
    queryKey: ["getInboxMessagePage"],
    queryFn: () => tuanchat.messageDirectController.getInboxMessages("ANY_STRING"),
    staleTime: 300000
  });
}

/**
 * 获取与某个联系人的收件箱消息
 */
export function useGetInboxMessageWithUserQuery(userId: number, targetUserId: number) {
  const getInboxMessageWithUser = useQuery({
    queryKey: ["inboxMessageWithUser", userId, targetUserId],
    queryFn: async () => {
      const res = await tuanchat.messageDirectController.getInboxMessages("ANY_STRING");
      return res.data;
    },
    staleTime: 300000
  });
  const historyMessages = useMemo(() => {
    return getInboxMessageWithUser.data?.filter((msg) => {
      return (
        msg.senderId === userId && msg.receiverId === targetUserId ||
        msg.senderId === targetUserId && msg.receiverId === userId
      );
    }) || [];
  }, [getInboxMessageWithUser.data, userId, targetUserId]);
  const queryClient = useQueryClient();
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["inboxMessageWithUser", userId, targetUserId] });
    getInboxMessageWithUser.refetch();
  }

  return { historyMessages, refetch };
}

/**
 * 发送私聊消息
 */
export function useSendMessageDirectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: MessageDirectSendRequest) => tuanchat.messageDirectController.sendMessage(requestBody),
    mutationKey: ["sendMessageDirect"],
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getMessageDirectPage"] });
      queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
    },
  });
}

/**
 * 撤回私聊消息
 */
export function useRecallMessageDirectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: MessageDirectRecallRequest) => tuanchat.messageDirectController.recallMessage(messageId),
    mutationKey: ["recallMessageDirect"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getMessageDirectPage"] });
      queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
    },
  });
}

/**
 * 更新私聊线消息
 */
export function useUpdateReadPositionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestBody: MessageDirectReadUpdateRequest) => tuanchat.messageDirectController.updateReadPosition(requestBody),
    mutationKey: ["updateReadPosition"],
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
      queryClient.invalidateQueries({ queryKey: ["directMessages", variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["getMessageDirectPage"] });
    }
  });
}

/**
 * 获取所有好友的用户信息
 */
export function useGetFriendsUserInfoQuery(friends: (number | undefined)[]) {
  return useQueries({
    queries: friends.map(friendId => ({
      queryKey: ['getAllMyFriendsInfo', friendId],
      queryFn: () => tuanchat.userController.getUserInfo(friendId || -1),
      staleTime: 300000, 
    }))
  });
}
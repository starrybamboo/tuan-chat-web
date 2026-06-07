import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import type { MessageDirectRecallRequest, MessageDirectResponse } from "api";
import {
  getDirectInboxQueryKey,
  useDirectInboxMessagesQuery,
  useRecallDirectMessageMutation,
  useSendDirectMessageMutation,
  useUpdateDirectReadPositionMutation,
} from "@tuanchat/query/direct-message";
import { getUserInfoQueryKey, USER_INFO_STALE_TIME_MS } from "@tuanchat/query/users";

import { tuanchat } from "../instance";

function wrapDirectMessagesData(messages: MessageDirectResponse[] | undefined) {
  return messages ? { success: true, data: messages } : undefined;
}

/**
 * 获取收件箱消息全量数据。
 */
export function useGetInboxMessagePageQuery(enabled = true, currentUserId?: number | null) {
  const query = useDirectInboxMessagesQuery(tuanchat, currentUserId, {
    enabled,
    staleTime: 300_000,
  });

  return {
    ...query,
    data: wrapDirectMessagesData(query.data),
  };
}

/**
 * 获取与某个联系人的收件箱消息。
 */
export function useGetInboxMessageWithUserQuery(userId: number, targetUserId: number) {
  const inboxQuery = useDirectInboxMessagesQuery(tuanchat, userId, {
    enabled: userId > 0 && targetUserId > 0,
    staleTime: 300_000,
  });

  const historyMessages = useMemo(() => {
    return (inboxQuery.data ?? []).filter((msg) => {
      return (
        (msg.senderId === userId && msg.receiverId === targetUserId)
        || (msg.senderId === targetUserId && msg.receiverId === userId)
      );
    });
  }, [inboxQuery.data, targetUserId, userId]);

  return {
    historyMessages,
    refetch: inboxQuery.refetch,
  };
}

/**
 * 发送私聊消息。
 */
export function useSendMessageDirectMutation(currentUserId?: number | null) {
  return useSendDirectMessageMutation(tuanchat, currentUserId);
}

/**
 * 撤回私聊消息。
 */
export function useRecallMessageDirectMutation(currentUserId?: number | null) {
  return useRecallDirectMessageMutation(tuanchat, currentUserId);
}

/**
 * 更新私聊线消息已读位置。
 */
export function useUpdateReadPositionMutation() {
  const mutation = useUpdateDirectReadPositionMutation(tuanchat);
  return {
    ...mutation,
    mutate: (requestBody: { targetUserId: number }, options?: Parameters<typeof mutation.mutate>[1]) => {
      mutation.mutate(requestBody.targetUserId, options);
    },
    mutateAsync: (requestBody: { targetUserId: number }, options?: Parameters<typeof mutation.mutateAsync>[1]) => {
      return mutation.mutateAsync(requestBody.targetUserId, options);
    },
  };
}

/**
 * 获取所有好友的用户信息。
 */
export function useGetFriendsUserInfoQuery(friends: (number | undefined)[]) {
  return useQueries({
    queries: friends.map(friendId => ({
      queryKey: getUserInfoQueryKey(friendId || -1),
      queryFn: () => tuanchat.userController.getUserInfo(friendId || -1),
      staleTime: USER_INFO_STALE_TIME_MS,
      enabled: typeof friendId === "number" && friendId > 0,
    })),
  });
}

export { getDirectInboxQueryKey };
export type { MessageDirectRecallRequest };

import { useEffect, useMemo } from "react";

import type { MessageDirectRecallRequest, MessageDirectResponse } from "api";
import {
  getDirectInboxQueryKey,
  upsertDirectInboxQueryData,
  getDirectBadgeSummaryQueryKey,
  useDirectBadgeSummaryQuery,
  useDirectInboxMessagesQuery,
  useRecallDirectMessageMutation,
  useSendDirectMessageMutation,
  useUpdateDirectReadPositionMutation,
} from "@tuanchat/query/direct-message";
import { syncDirectConversation } from "@tuanchat/query/direct-message-conversation-sync";
import { projectDirectMessageEvents } from "@tuanchat/domain/direct-message";
import { getUserInfoQueryKey, USER_INFO_STALE_TIME_MS } from "@tuanchat/query/users";
import { useQueryClient } from "@tanstack/react-query";
import { loadChatHistoryDb } from "@/components/chat/infra/localDb/chatHistoryDbLoader";

import { tuanchat } from "../instance";

function wrapDirectMessagesData(messages: MessageDirectResponse[] | undefined) {
  return messages ? { success: true, data: messages } : undefined;
}

/**
 * 获取收件箱消息全量数据。
 */
export function useGetInboxMessagePageQuery(enabled = true, currentUserId?: number | null) {
  const queryClient = useQueryClient();
  const query = useDirectInboxMessagesQuery(tuanchat, currentUserId, {
    enabled,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!enabled || !currentUserId || currentUserId <= 0) {
      return;
    }
    let disposed = false;
    void loadChatHistoryDb()
      .then(db => db.getCachedDirectInboxMessages(currentUserId))
      .then((messages) => {
        if (!disposed && messages.length > 0) {
          upsertDirectInboxQueryData(queryClient, currentUserId, messages);
        }
      })
      .catch(error => console.warn("[MessageDirectQuery] Failed to restore direct SQLite cache:", error));
    return () => {
      disposed = true;
    };
  }, [currentUserId, enabled, queryClient]);

  useEffect(() => {
    if (!query.isSuccess || !currentUserId || currentUserId <= 0 || !query.data?.length) {
      return;
    }
    void loadChatHistoryDb()
      .then(db => db.upsertCachedDirectMessages(currentUserId, query.data))
      .catch(error => console.warn("[MessageDirectQuery] Failed to persist direct SQLite cache:", error));
  }, [currentUserId, query.data, query.isSuccess]);

  return {
    ...query,
    data: wrapDirectMessagesData(query.data),
  };
}

export function useGetDirectBadgeSummaryQuery(enabled = true, currentUserId?: number | null) {
  return useDirectBadgeSummaryQuery(tuanchat, currentUserId, {
    enabled,
    staleTime: 30_000,
  });
}

/**
 * 获取与某个联系人的收件箱消息。
 */
export function useGetInboxMessageWithUserQuery(userId: number, targetUserId: number) {
  const queryClient = useQueryClient();
  const inboxQuery = useDirectInboxMessagesQuery(tuanchat, userId, {
    enabled: userId > 0 && targetUserId > 0,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (userId <= 0 || targetUserId <= 0) {
      return;
    }
    let disposed = false;
    void loadChatHistoryDb()
      .then(async (db) => {
        const syncId = await db.getCachedDirectConversationMaxSyncId(userId, targetUserId);
        const result = await syncDirectConversation(tuanchat, { syncId, targetUserId });
        if (disposed || !result.data?.messages) {
          return;
        }
        await db.upsertCachedDirectMessages(userId, result.data.messages);
        upsertDirectInboxQueryData(queryClient, userId, result.data.messages);
      })
      .catch(error => console.warn("[MessageDirectQuery] Failed to reconcile direct conversation:", error));
    return () => {
      disposed = true;
    };
  }, [queryClient, targetUserId, userId]);

  const historyMessages = useMemo(() => {
    return projectDirectMessageEvents((inboxQuery.data ?? []).filter((msg) => {
      return (
        (msg.senderId === userId && msg.receiverId === targetUserId)
        || (msg.senderId === targetUserId && msg.receiverId === userId)
      );
    }));
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
export { getDirectInboxQueryKey };
export { getDirectBadgeSummaryQueryKey };
export type { MessageDirectRecallRequest };

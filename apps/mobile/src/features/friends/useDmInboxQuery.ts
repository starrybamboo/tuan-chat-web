import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { useQueryClient } from "@tanstack/react-query";
import { groupDirectConversations, isLocalDirectMessage, mergeDirectMessages } from "@tuanchat/domain/direct-message";
import { useDirectInboxMessagesQuery } from "@tuanchat/query/direct-message";
import { useEffect, useMemo } from "react";

import { hasPersistableDirectInboxMessages } from "@/features/friends/dmInboxCacheState";
import { mobileApiClient } from "@/lib/api";

import { shouldEnableDmInboxQuery, type UseDmInboxQueryOptions } from "./dmInboxQueryOptions";
import {
  clearCachedDirectMessages,
  readCachedDirectInboxMessages,
  writeCachedDirectMessages,
} from "./mobileDirectMessageCache";

export type DmConversation = {
  contactId: number;
  contactName: string;
  contactAvatarFileId: number | undefined;
  lastMessage: MessageDirectResponse;
  messages: MessageDirectResponse[];
  unreadCount: number;
};

export function mergeDirectInboxMessagesForQueryCache(
  cachedMessages: readonly MessageDirectResponse[] | undefined,
  currentMessages: readonly MessageDirectResponse[] | undefined,
): MessageDirectResponse[] {
  return mergeDirectMessages(cachedMessages, currentMessages);
}

export function useDmInboxQuery(
  currentUserId: number | null,
  options: UseDmInboxQueryOptions = {},
) {
  const queryClient = useQueryClient();
  const enabled = shouldEnableDmInboxQuery(currentUserId, options);

  const query = useDirectInboxMessagesQuery(mobileApiClient, currentUserId, {
    enabled,
  });
  const queryKey = useMemo(() => ["dmInbox", currentUserId ?? null] as const, [currentUserId]);

  // 服务端快照成功后只恢复 pending overlay，避免旧 confirmed read model 覆盖服务器结果。
  useEffect(() => {
    if (!enabled || typeof currentUserId !== "number" || currentUserId <= 0) {
      return;
    }

    let disposed = false;
    void readCachedDirectInboxMessages(currentUserId)
      .then((messages) => {
        if (disposed || messages.length === 0) {
          return;
        }

        const queryState = queryClient.getQueryState(queryKey);
        const messagesToRestore = queryState?.status === "success"
          ? messages.filter(isLocalDirectMessage)
          : messages;
        if (messagesToRestore.length === 0) {
          return;
        }

        queryClient.setQueryData<MessageDirectResponse[]>(queryKey, (currentMessages) => {
          return mergeDirectInboxMessagesForQueryCache(messagesToRestore, currentMessages);
        });
      })
      .catch((error) => {
        if (!disposed) {
          console.warn("[useDmInboxQuery] 读取私聊磁盘缓存失败:", error);
        }
      });

    return () => {
      disposed = true;
    };
  }, [currentUserId, enabled, queryClient, queryKey]);
  const hasQueryMessagesToPersist = useMemo(() => {
    return hasPersistableDirectInboxMessages(query.data);
  }, [query.data]);

  useEffect(() => {
    if (!query.isSuccess || typeof currentUserId !== "number" || currentUserId <= 0) {
      return;
    }

    if (!hasQueryMessagesToPersist) {
      void clearCachedDirectMessages(currentUserId).catch((error) => {
        console.warn("[useDmInboxQuery] 清理私聊磁盘缓存失败:", error);
      });
      return;
    }

    void writeCachedDirectMessages(currentUserId, query.data ?? []).catch((error) => {
      console.warn("[useDmInboxQuery] 写入私聊磁盘缓存失败:", error);
    });
  }, [currentUserId, hasQueryMessagesToPersist, query.data, query.isSuccess]);

  const data = useMemo(
    () => groupDirectConversations(query.data ?? [], currentUserId) as DmConversation[],
    [currentUserId, query.data],
  );

  return { ...query, data };
}

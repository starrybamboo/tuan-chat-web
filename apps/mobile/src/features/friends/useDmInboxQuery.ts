import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { groupDirectConversations, mergeDirectMessages } from "@tuanchat/domain/direct-message";
import { useDirectInboxMessagesQuery } from "@tuanchat/query/direct-message";
import { useEffect, useMemo, useState } from "react";

import { hasPersistableDirectInboxMessages } from "@/features/friends/dmInboxCacheState";
import { mobileApiClient } from "@/lib/api";

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

export function useDmInboxQuery(currentUserId: number | null) {
  const [cachedInbox, setCachedInbox] = useState<{
    currentUserId: number;
    messages: MessageDirectResponse[];
  } | null>(null);

  const query = useDirectInboxMessagesQuery(mobileApiClient, currentUserId, {
    enabled: typeof currentUserId === "number" && currentUserId > 0,
  });

  useEffect(() => {
    if (typeof currentUserId !== "number" || currentUserId <= 0) {
      return;
    }

    let disposed = false;
    void readCachedDirectInboxMessages(currentUserId)
      .then((messages) => {
        if (!disposed) {
          setCachedInbox({ currentUserId, messages });
        }
      })
      .catch((error) => {
        if (!disposed) {
          console.warn("[useDmInboxQuery] 读取私聊磁盘缓存失败:", error);
          setCachedInbox({ currentUserId, messages: [] });
        }
      });

    return () => {
      disposed = true;
    };
  }, [currentUserId]);

  const mergedMessages = useMemo(() => {
    const cachedMessages = cachedInbox?.currentUserId === currentUserId ? cachedInbox.messages : [];
    return mergeDirectMessages(cachedMessages, query.data);
  }, [cachedInbox, currentUserId, query.data]);
  const hasQueryMessagesToPersist = useMemo(() => {
    return hasPersistableDirectInboxMessages(query.data);
  }, [query.data]);

  useEffect(() => {
    if (!query.isSuccess || typeof currentUserId !== "number" || currentUserId <= 0) {
      return;
    }

    if (!hasQueryMessagesToPersist) {
      queueMicrotask(() => setCachedInbox({ currentUserId, messages: [] }));
      void clearCachedDirectMessages(currentUserId).catch((error) => {
        console.warn("[useDmInboxQuery] 清理私聊磁盘缓存失败:", error);
      });
      return;
    }

    if (mergedMessages.length === 0) {
      return;
    }

    void writeCachedDirectMessages(currentUserId, mergedMessages).catch((error) => {
      console.warn("[useDmInboxQuery] 写入私聊磁盘缓存失败:", error);
    });
  }, [currentUserId, hasQueryMessagesToPersist, mergedMessages, query.isSuccess]);

  const data = useMemo(
    () => groupDirectConversations(mergedMessages, currentUserId) as DmConversation[],
    [mergedMessages, currentUserId],
  );

  return { ...query, data };
}

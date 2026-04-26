import { useEffect, useMemo, useState } from "react";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { useAuthSession } from "@/features/auth/auth-session";
import { clearCachedRoomMessages, readCachedRoomMessages, writeCachedRoomMessages } from "@/features/messages/mobileRoomMessageCache";
import { mobileApiClient } from "@/lib/api";
import {
  flattenRoomMessagePages,
  mergeRoomMessages,
  useRoomMessagesInfiniteQuery as useSharedRoomMessagesInfiniteQuery,
} from "@tuanchat/query/chat";

export function useRoomMessagesQuery(roomId: number | null, pageSize: number = 20) {
  const { isAuthenticated } = useAuthSession();
  const [cachedMessages, setCachedMessages] = useState<ChatMessageResponse[]>([]);
  const query = useSharedRoomMessagesInfiniteQuery(mobileApiClient, roomId ?? -1, {
    enabled: isAuthenticated && typeof roomId === "number" && roomId > 0,
    pageSize,
    staleTime: 30_000,
  });

  const networkMessages = useMemo(() => {
    return flattenRoomMessagePages(query.data?.pages);
  }, [query.data?.pages]);

  const messages = useMemo(() => {
    return mergeRoomMessages(cachedMessages, networkMessages);
  }, [cachedMessages, networkMessages]);

  useEffect(() => {
    let disposed = false;

    if (!isAuthenticated || typeof roomId !== "number" || roomId <= 0) {
      queueMicrotask(() => setCachedMessages([]));
      return;
    }

    void readCachedRoomMessages(roomId).then((nextCachedMessages) => {
      if (!disposed) {
        setCachedMessages(nextCachedMessages);
      }
    });

    return () => {
      disposed = true;
    };
  }, [isAuthenticated, roomId]);

  useEffect(() => {
    if (!isAuthenticated || typeof roomId !== "number" || roomId <= 0) {
      return;
    }

    if (messages.length > 0) {
      void writeCachedRoomMessages(roomId, messages);
      return;
    }

    if (query.isSuccess && !query.isFetching) {
      void clearCachedRoomMessages(roomId);
    }
  }, [isAuthenticated, messages, query.isFetching, query.isSuccess, roomId]);

  return {
    ...query,
    isShowingCachedMessages: networkMessages.length === 0 && cachedMessages.length > 0,
    messages,
  };
}

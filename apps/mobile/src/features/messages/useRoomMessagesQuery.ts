import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { getAllRoomMessagesQueryKey, mergeRoomMessages } from "@tuanchat/query/chat";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/auth-session";
import { clearCachedRoomMessages, readCachedRoomMessages, writeCachedRoomMessages } from "@/features/messages/mobileRoomMessageCache";
import { mobileApiClient } from "@/lib/api";

export function useRoomMessagesQuery(roomId: number | null) {
  const { isAuthenticated } = useAuthSession();
  const [cachedMessages, setCachedMessages] = useState<ChatMessageResponse[]>([]);

  const query = useQuery<ChatMessageResponse[]>({
    enabled: isAuthenticated && typeof roomId === "number" && roomId > 0,
    queryFn: async () => {
      const res = await mobileApiClient.chatController.getAllMessage(roomId!);
      return (res as any).data ?? res ?? [];
    },
    queryKey: getAllRoomMessagesQueryKey(roomId ?? -1),
    staleTime: 0,
  });

  const networkMessages = useMemo(() => {
    return query.data ?? [];
  }, [query.data]);

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

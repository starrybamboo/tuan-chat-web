import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllRoomMessagesQueryKey } from "@tuanchat/query/chat";
import { getMaxRoomMessageSyncId } from "@tuanchat/query/room-message";
import { mergeRoomMessagesForLocalState } from "@tuanchat/query/room-message-lifecycle";
import { useEffect, useMemo } from "react";

import { useAuthSession } from "@/features/auth/auth-session";
import {
  clearCachedRoomMessages,
  readCachedRoomMessages,
  writeCachedRoomMessages,
} from "@/features/messages/mobileRoomMessageCache";
import {
  mergeRoomMessagesForQueryCache,
  shouldHydrateRoomMessagesFromDisk,
  shouldResetCachedRoomMessages,
} from "@/features/messages/roomMessageCacheState";
import { extractRoomMessagesFromQueryData } from "@/features/messages/roomMessagesQueryData";
import { fetchRoomMessagesWithLocalSync } from "@/features/messages/roomMessageSync";
import { mobileApiClient } from "@/lib/api";

export function useRoomMessagesQuery(
  roomId: number | null,
  options: { staleTime?: number } = {},
) {
  const { isAuthenticated } = useAuthSession();
  const queryClient = useQueryClient();
  const hasValidRoomId = typeof roomId === "number" && roomId > 0;
  const queryKey = useMemo(() => getAllRoomMessagesQueryKey(roomId ?? -1), [roomId]);

  const query = useQuery({
    enabled: isAuthenticated && hasValidRoomId,
    queryFn: async () => {
      const currentMessages = extractRoomMessagesFromQueryData(
        queryClient.getQueryData(queryKey),
      );
      const cachedMessages = await readCachedRoomMessages(roomId!);
      const maxKnownSyncId = Math.max(
        getMaxRoomMessageSyncId(currentMessages),
        getMaxRoomMessageSyncId(cachedMessages),
      );
      const syncResult = await fetchRoomMessagesWithLocalSync(roomId!, {
        client: mobileApiClient,
        getMaxCachedSyncId: async () => maxKnownSyncId,
      });

      if (shouldResetCachedRoomMessages(syncResult, true)) {
        void clearCachedRoomMessages(roomId!);
        return [];
      }

      if (syncResult.messages.length > 0) {
        void writeCachedRoomMessages(roomId!, syncResult.messages);
      }

      return mergeRoomMessagesForQueryCache({
        cachedMessages,
        currentMessages,
        fetchedMessages: syncResult.messages,
        roomId: roomId!,
      });
    },
    queryKey,
    staleTime: options.staleTime,
  });

  const messages = useMemo(() => {
    return extractRoomMessagesFromQueryData(query.data);
  }, [query.data]);

  useEffect(() => {
    let disposed = false;

    if (!isAuthenticated || typeof roomId !== "number" || roomId <= 0) {
      return;
    }

    void readCachedRoomMessages(roomId).then((nextCachedMessages) => {
      if (disposed || nextCachedMessages.length === 0) {
        return;
      }
      const queryState = queryClient.getQueryState(queryKey);
      // Query 已经成功时，磁盘只能作为恢复来源，不能再把旧快照灌回前台。
      if (!shouldHydrateRoomMessagesFromDisk(queryState?.status, nextCachedMessages)) {
        return;
      }
      queryClient.setQueryData<ChatMessageResponse[]>(queryKey, (currentData) => {
        const currentMessages = extractRoomMessagesFromQueryData(currentData);
        return mergeRoomMessagesForLocalState(nextCachedMessages, currentMessages);
      });
    });

    return () => {
      disposed = true;
    };
  }, [isAuthenticated, queryClient, queryKey, roomId]);

  return {
    ...query,
    isShowingCachedMessages: query.isFetching && messages.length > 0,
    messages,
  };
}

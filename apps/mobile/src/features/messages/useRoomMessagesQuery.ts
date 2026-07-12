import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mergeRoomMessagesForLocalState } from "@tuanchat/query/room-message-lifecycle";
import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/auth-session";
import {
  clearCachedRoomMessages,
  readCachedRoomMessages,
  writeCachedRoomMessages,
} from "@/features/messages/mobileRoomMessageCache";
import {
  shouldHydrateRoomMessagesFromDisk,
} from "@/features/messages/roomMessageCacheState";
import { extractRoomMessagesFromQueryData } from "@/features/messages/roomMessagesQueryData";
import { getRoomMessagesQueryKey } from "@/features/messages/roomMessagesQueryKey";
import { loadRoomMessagesQueryData } from "@/features/messages/roomMessagesQueryLoader";
import { fetchRoomMessagesWithLocalSync } from "@/features/messages/roomMessageSync";
import { traceRoomMessageTiming } from "@/features/messages/roomMessageTimingTrace";
import { getMobileApiBaseUrl, mobileApiClient } from "@/lib/api";

export function useRoomMessagesQuery(
  roomId: number | null,
  options: { staleTime?: number } = {},
) {
  const { isAuthenticated } = useAuthSession();
  const queryClient = useQueryClient();
  const hasValidRoomId = typeof roomId === "number" && roomId > 0;
  const queryKey = useMemo(() => getRoomMessagesQueryKey(roomId ?? -1), [roomId]);

  // Query 保存当前房间渲染热态；SQLite 只作为 message-stream 的恢复/补洞 read model。
  const query = useQuery({
    enabled: isAuthenticated && hasValidRoomId,
    queryFn: async ({ signal }) => loadRoomMessagesQueryData(roomId!, {
      clearCachedRoomMessages,
      fetchRoomMessages: async (resolvedRoomId, maxKnownSyncId) => {
        return fetchRoomMessagesWithLocalSync(resolvedRoomId, {
          apiBaseUrl: getMobileApiBaseUrl(),
          client: mobileApiClient,
          getMaxCachedSyncId: async () => maxKnownSyncId,
          signal,
        });
      },
      getCurrentMessages: () => extractRoomMessagesFromQueryData(
        queryClient.getQueryData(queryKey),
      ),
      publishCachedMessages: (nextCachedMessages) => {
        traceRoomMessageTiming("hydrate.start", {
          count: nextCachedMessages.length,
          roomId,
        });
        const queryState = queryClient.getQueryState(queryKey);
        if (!shouldHydrateRoomMessagesFromDisk(queryState?.status, nextCachedMessages)) {
          traceRoomMessageTiming("hydrate.skip", {
            roomId,
            status: queryState?.status ?? "missing",
          });
          return;
        }
        queryClient.setQueryData<ChatMessageResponse[]>(queryKey, (currentData) => {
          const currentMessages = extractRoomMessagesFromQueryData(currentData);
          return mergeRoomMessagesForLocalState(nextCachedMessages, currentMessages);
        });
        traceRoomMessageTiming("hydrate.end", {
          count: nextCachedMessages.length,
          roomId,
        });
      },
      readCachedRoomMessages,
      signal,
      writeCachedRoomMessages,
    }),
    queryKey,
    staleTime: options.staleTime ?? 0,
  });

  const messages = useMemo(() => {
    return extractRoomMessagesFromQueryData(query.data);
  }, [query.data]);

  return {
    ...query,
    isShowingCachedMessages: query.isFetching && messages.length > 0,
    messages,
  };
}

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { useAuthSession } from "@/features/auth/auth-session";
import {
  clearCachedRoomMessages,
  getCachedRoomMessagesMaxSyncId,
  readCachedRoomMessages,
  writeCachedRoomMessages,
} from "@/features/messages/mobileRoomMessageCache";
import { shouldResetCachedRoomMessages } from "@/features/messages/roomMessageCacheState";
import { extractRoomMessagesFromQueryData } from "@/features/messages/roomMessagesQueryData";
import { fetchRoomMessagesWithLocalSync } from "@/features/messages/roomMessageSync";
import { mobileApiClient } from "@/lib/api";
import { getAllRoomMessagesQueryKey } from "@tuanchat/query/chat";
import { mergeRoomMessagesForLocalState } from "@tuanchat/query/room-message-lifecycle";

type CachedRoomMessagesState = {
  messages: ChatMessageResponse[];
  roomId: number | null;
};

function deferStateUpdate(update: () => void) {
  void Promise.resolve().then(update);
}

export function useRoomMessagesQuery(
  roomId: number | null,
  options: { staleTime?: number } = {},
) {
  const { isAuthenticated } = useAuthSession();
  const [cachedMessagesState, setCachedMessagesState] = useState<CachedRoomMessagesState>({
    messages: [],
    roomId: null,
  });
  const hasValidRoomId = typeof roomId === "number" && roomId > 0;

  const query = useQuery({
    enabled: isAuthenticated && hasValidRoomId,
    queryFn: async () => {
      return fetchRoomMessagesWithLocalSync(roomId!, {
        client: mobileApiClient,
        getMaxCachedSyncId: getCachedRoomMessagesMaxSyncId,
      });
    },
    queryKey: getAllRoomMessagesQueryKey(roomId ?? -1),
    staleTime: options.staleTime,
  });

  const networkMessages = useMemo(() => {
    return extractRoomMessagesFromQueryData(query.data);
  }, [query.data]);

  const cachedMessages = useMemo(() => {
    if (!isAuthenticated || !hasValidRoomId || cachedMessagesState.roomId !== roomId) {
      return [];
    }
    return cachedMessagesState.messages;
  }, [cachedMessagesState, hasValidRoomId, isAuthenticated, roomId]);

  const messages = useMemo(() => {
    return mergeRoomMessagesForLocalState(cachedMessages, networkMessages);
  }, [cachedMessages, networkMessages]);

  useEffect(() => {
    let disposed = false;

    if (!isAuthenticated || typeof roomId !== "number" || roomId <= 0) {
      deferStateUpdate(() => {
        if (disposed) {
          return;
        }
        setCachedMessagesState((currentState) => {
          if (currentState.roomId === null && currentState.messages.length === 0) {
            return currentState;
          }
          return { messages: [], roomId: null };
        });
      });
      return () => {
        disposed = true;
      };
    }

    void readCachedRoomMessages(roomId).then((nextCachedMessages) => {
      if (!disposed) {
        setCachedMessagesState({ messages: nextCachedMessages, roomId });
      }
    });

    return () => {
      disposed = true;
    };
  }, [isAuthenticated, roomId]);

  useEffect(() => {
    let disposed = false;

    if (!isAuthenticated || typeof roomId !== "number" || roomId <= 0) {
      return;
    }

    if (shouldResetCachedRoomMessages(query.data, query.isSuccess)) {
      deferStateUpdate(() => {
        if (disposed) {
          return;
        }
        setCachedMessagesState((currentState) => {
          if (currentState.roomId === roomId && currentState.messages.length === 0) {
            return currentState;
          }
          return { messages: [], roomId };
        });
      });
      void clearCachedRoomMessages(roomId);
      return () => {
        disposed = true;
      };
    }

    if (messages.length > 0) {
      void writeCachedRoomMessages(roomId, messages);
    }
  }, [isAuthenticated, messages, query.data, query.isSuccess, roomId]);

  return {
    ...query,
    isShowingCachedMessages: networkMessages.length === 0 && cachedMessages.length > 0,
    messages,
  };
}

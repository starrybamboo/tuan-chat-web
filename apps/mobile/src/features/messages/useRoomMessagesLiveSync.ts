import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { useAuthSession } from "@/features/auth/auth-session";
import { writeCachedDirectMessages } from "@/features/friends/mobileDirectMessageCache";
import { writeCachedRoomMessages } from "@/features/messages/mobileRoomMessageCache";
import {
  extractChatMessageResponses,
  upsertLiveRoomMessageWithGapRepair,
} from "@/features/messages/roomMessageSync";
import { DEFAULT_TUANCHAT_API_BASE_URL, mobileApiClient } from "@/lib/api";
import { getDirectInboxQueryKey, upsertDirectInboxMessagesData } from "@tuanchat/query/direct-message";
import {
  bumpRoomSessionLatestSyncInCache,
  markRoomSessionReadInCache,
} from "@tuanchat/query/message-sessions";
import { getNotificationsUnreadCountQueryKey, prependNotificationToCaches } from "@tuanchat/query/notifications";

const GROUP_MESSAGE_PUSH_TYPE = 4;
const DIRECT_MESSAGE_PUSH_TYPE = 1;
const USER_NOTIFICATION_PUSH_TYPE = 23;
const TOKEN_INVALID_PUSH_TYPE = 100;

type WebSocketEnvelope = {
  data?: unknown;
  type?: number;
};

function isPositiveRoomId(roomId: number | null): roomId is number {
  return typeof roomId === "number" && Number.isInteger(roomId) && roomId > 0;
}

function createWebSocketUrl(token: string) {
  const explicitWebSocketUrl = (globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  }).process?.env?.EXPO_PUBLIC_TUANCHAT_API_WS_URL?.trim();
  const fallbackWebSocketUrl = DEFAULT_TUANCHAT_API_BASE_URL === "https://tuan.chat/api"
    ? "wss://tuan.chat/ws"
    : null;
  const normalizedBaseUrl = (explicitWebSocketUrl || fallbackWebSocketUrl || DEFAULT_TUANCHAT_API_BASE_URL)
    .trim()
    .replace(/\/$/, "");
  const webSocketBaseUrl = (explicitWebSocketUrl || fallbackWebSocketUrl)
    ? normalizedBaseUrl
    : `${normalizedBaseUrl.replace(/^http/i, "ws")}/ws`;
  const separator = webSocketBaseUrl.includes("?") ? "&" : "?";

  return `${webSocketBaseUrl}${separator}token=${encodeURIComponent(token)}`;
}

function parseWebSocketEnvelope(rawData: unknown): WebSocketEnvelope | null {
  if (typeof rawData !== "string" || rawData.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawData) as WebSocketEnvelope;
    return parsed && typeof parsed === "object" ? parsed : null;
  }
  catch {
    return null;
  }
}

function parseIncomingRoomMessage(
  rawData: unknown,
): { message: ChatMessageResponse | null; type: number | null } {
  const envelope = parseWebSocketEnvelope(rawData);
  const type = typeof envelope?.type === "number" ? envelope.type : null;
  if (type !== GROUP_MESSAGE_PUSH_TYPE) {
    return {
      message: null,
      type,
    };
  }

  const nextMessage = (envelope?.data as { message?: ChatMessageResponse["message"] } | undefined)?.message;
  if (!nextMessage || (nextMessage.threadId && nextMessage.threadId > 0)) {
    return {
      message: null,
      type,
    };
  }

  return {
    message: {
      message: nextMessage,
    },
    type,
  };
}

function parseIncomingDirectMessage(rawData: unknown): MessageDirectResponse | null {
  const envelope = parseWebSocketEnvelope(rawData);
  if (envelope?.type !== DIRECT_MESSAGE_PUSH_TYPE || !envelope.data || typeof envelope.data !== "object") {
    return null;
  }
  return envelope.data as MessageDirectResponse;
}

function parseIncomingNotification(rawData: unknown): Record<string, unknown> | null {
  const envelope = parseWebSocketEnvelope(rawData);
  if (envelope?.type !== USER_NOTIFICATION_PUSH_TYPE || !envelope.data || typeof envelope.data !== "object") {
    return null;
  }
  return envelope.data as Record<string, unknown>;
}

export function useRoomMessagesLiveSync(roomId: number | null, pageSize: number = 20) {
  const queryClient = useQueryClient();
  const { isAuthenticated, session, signOut } = useAuthSession();
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const closedByHookRef = useRef(false);

  const webSocketUrl = useMemo(() => {
    const token = session?.token?.trim();
    if (!token) {
      return null;
    }

    return createWebSocketUrl(token);
  }, [session?.token]);

  useEffect(() => {
    if (!isAuthenticated || !isPositiveRoomId(roomId) || !webSocketUrl) {
      return;
    }

    const resolvedRoomId = roomId;
    const resolvedWebSocketUrl = webSocketUrl;
    let disposed = false;

    const cleanupReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const closeSocket = () => {
      cleanupReconnectTimer();
      if (socketRef.current) {
        closedByHookRef.current = true;
        socketRef.current.close();
        socketRef.current = null;
      }
    };

    function scheduleReconnect() {
      cleanupReconnectTimer();
      const delay = Math.min(30_000, 1000 * (2 ** reconnectAttemptRef.current));
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        if (!disposed) {
          connect();
        }
      }, delay);
    }

    function connect() {
      if (disposed) {
        return;
      }

      const currentSocket = socketRef.current;
      if (currentSocket && (
        currentSocket.readyState === WebSocket.CONNECTING
        || currentSocket.readyState === WebSocket.OPEN
      )) {
        return;
      }

      cleanupReconnectTimer();
      closedByHookRef.current = false;

      const socket = new WebSocket(resolvedWebSocketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onmessage = (event) => {
        const directMessage = parseIncomingDirectMessage(event.data);
        if (directMessage) {
          const currentUserId = session?.userId ?? directMessage.userId ?? null;
          queryClient.setQueryData<MessageDirectResponse[]>(
            getDirectInboxQueryKey(currentUserId),
            current => upsertDirectInboxMessagesData(current, [directMessage]),
          );
          void writeCachedDirectMessages(currentUserId, [directMessage]).catch((error) => {
            console.warn("[useRoomMessagesLiveSync] 写入私聊 WebSocket 磁盘缓存失败:", error);
          });
          return;
        }

        const notification = parseIncomingNotification(event.data);
        if (notification) {
          prependNotificationToCaches(queryClient, notification as any);
          queryClient.invalidateQueries({ queryKey: getNotificationsUnreadCountQueryKey() });
          return;
        }

        const { message, type } = parseIncomingRoomMessage(event.data);
        if (message) {
          const messageRoomId = message.message.roomId;
          const messageSyncId = message.message.syncId;
          if (typeof messageRoomId === "number" && messageRoomId > 0 && typeof messageSyncId === "number") {
            bumpRoomSessionLatestSyncInCache(queryClient, messageRoomId, messageSyncId);
          }
          if (messageRoomId === resolvedRoomId) {
            upsertLiveRoomMessageWithGapRepair(resolvedRoomId, message, {
              fetchHistoryMessages: async (targetRoomId, syncId) => {
                const result = await mobileApiClient.chatController.getHistoryMessages({
                  roomId: targetRoomId,
                  syncId,
                });
                return extractChatMessageResponses(result);
              },
              queryClient,
              writeCachedRoomMessages,
            });
            if (typeof messageSyncId === "number") {
              markRoomSessionReadInCache(queryClient, resolvedRoomId, messageSyncId);
            }
          }
          return;
        }

        if (type === TOKEN_INVALID_PUSH_TYPE) {
          closeSocket();
          void signOut();
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        if (!disposed && !closedByHookRef.current) {
          scheduleReconnect();
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      closeSocket();
    };
  }, [isAuthenticated, pageSize, queryClient, roomId, session?.userId, signOut, webSocketUrl]);
}

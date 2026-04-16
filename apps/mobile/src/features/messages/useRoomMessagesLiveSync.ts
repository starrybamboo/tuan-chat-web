import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { RoomMessagesInfiniteQueryData } from "@tuanchat/query/chat";

import { useAuthSession } from "@/features/auth/auth-session";
import { DEFAULT_TUANCHAT_API_BASE_URL } from "@/lib/api";
import {
  getRoomMessagesQueryKey,
  upsertRoomMessagesInfiniteData,
} from "@tuanchat/query/chat";

const GROUP_MESSAGE_PUSH_TYPE = 4;
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
  const webSocketBaseUrl = explicitWebSocketUrl
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
  roomId: number,
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
  if (!nextMessage || nextMessage.roomId !== roomId || (nextMessage.threadId && nextMessage.threadId > 0)) {
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
        const { message, type } = parseIncomingRoomMessage(event.data, resolvedRoomId);
        if (message) {
          queryClient.setQueryData<RoomMessagesInfiniteQueryData>(
            getRoomMessagesQueryKey(resolvedRoomId, pageSize),
            currentData => (
              upsertRoomMessagesInfiniteData(currentData, resolvedRoomId, [message], pageSize)
            ),
          );
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
  }, [isAuthenticated, pageSize, queryClient, roomId, signOut, webSocketUrl]);
}

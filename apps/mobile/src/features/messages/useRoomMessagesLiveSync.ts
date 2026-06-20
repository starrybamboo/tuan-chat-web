import type { ApiResultRoomListResponse } from "@tuanchat/openapi-client/models/ApiResultRoomListResponse";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { NotificationItemResponse } from "@tuanchat/openapi-client/models/NotificationItemResponse";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { getDirectContactId, getDirectMessagePreviewText, isDirectReadLineMessage } from "@tuanchat/domain/direct-message";
import { getMessagePreviewText } from "@tuanchat/domain/message-preview";
import { getDirectInboxQueryKey, upsertDirectInboxMessagesData } from "@tuanchat/query/direct-message";
import {
  bumpRoomSessionLatestSyncInCache,
  markRoomSessionReadInCache,
} from "@tuanchat/query/message-sessions";
import { getNotificationsUnreadCountQueryKey, prependNotificationToCaches } from "@tuanchat/query/notifications";
import { useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { writeCachedDirectMessages } from "@/features/friends/mobileDirectMessageCache";
import { writeCachedRoomMessages } from "@/features/messages/mobileRoomMessageCache";
import {
  extractChatMessageResponses,
  upsertLiveRoomMessageWithGapRepair,
  upsertLiveRoomMessagesWithGapRepair,
} from "@/features/messages/roomMessageSync";
import { useMobileNotificationSession } from "@/features/notifications/mobileNotificationSessionContext";
import { readNotificationPreferences } from "@/features/notifications/notificationPreferences";
import { DEFAULT_TUANCHAT_API_BASE_URL, mobileApiClient } from "@/lib/api";

const GROUP_MESSAGE_PUSH_TYPE = 4;
const GROUP_MESSAGE_BATCH_PUSH_TYPE = 25;
const DIRECT_MESSAGE_PUSH_TYPE = 1;
const USER_NOTIFICATION_PUSH_TYPE = 23;
const TOKEN_INVALID_PUSH_TYPE = 100;

type WebSocketEnvelope = {
  data?: unknown;
  type?: number;
};

export type RoomMessagesLiveSyncOptions = {
  currentContactId?: number | null;
  currentRoomId?: number | null;
  currentSpaceId?: number | null;
  isChatRouteActive?: boolean;
};

type RoomNotificationMeta = {
  name: string | null;
  spaceId: number | null;
};

function isPositiveRoomId(roomId: number | null): roomId is number {
  return typeof roomId === "number" && Number.isInteger(roomId) && roomId > 0;
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function canPresentNotification(kind: "messages" | "system", category?: string | null) {
  const prefs = await readNotificationPreferences();
  if (!prefs.enabled) {
    return false;
  }
  if (kind === "messages") {
    return prefs.messages;
  }
  if (category?.toUpperCase().includes("FRIEND")) {
    return prefs.friendRequests;
  }
  return prefs.system;
}

function getRoomNotificationMeta(
  queryClient: QueryClient,
  roomId: number,
  fallbackSpaceId: number | null,
): RoomNotificationMeta {
  for (const [queryKey, data] of queryClient.getQueriesData<ApiResultRoomListResponse>({ queryKey: ["getUserRooms"] })) {
    const response = data?.data;
    const room = response?.rooms?.find(item => item.roomId === roomId);
    if (!room) {
      continue;
    }

    const querySpaceId = Array.isArray(queryKey) && isPositiveId(queryKey[1]) ? queryKey[1] : null;
    return {
      name: readString(room.name),
      spaceId: room.spaceId ?? response?.spaceId ?? querySpaceId ?? fallbackSpaceId,
    };
  }

  return {
    name: null,
    spaceId: fallbackSpaceId,
  };
}

function getRoomNotificationTargetPath(roomId: number, meta: RoomNotificationMeta) {
  return meta.spaceId ? `/chat/${meta.spaceId}/${roomId}` : "/chat";
}

function getRoomMessageSpeakerLabel(message: ChatMessageResponse["message"]) {
  return readString(message.customRoleName) ?? (isPositiveId(message.userId) ? `用户 #${message.userId}` : null);
}

function shouldNotifyDirectMessage(
  directMessage: MessageDirectResponse,
  currentUserId: number | null,
  currentContactId: number | null,
  appState: string,
  isChatRouteActive: boolean,
) {
  if (directMessage.status === 1 || isDirectReadLineMessage(directMessage)) {
    return false;
  }
  if (isPositiveId(currentUserId) && directMessage.senderId === currentUserId) {
    return false;
  }

  const contactId = getDirectContactId(directMessage, currentUserId);
  return !(appState === "active" && isChatRouteActive && contactId === currentContactId);
}

function shouldNotifyRoomMessage(
  message: ChatMessageResponse,
  currentUserId: number | null,
  currentRoomId: number | null,
  currentContactId: number | null,
  appState: string,
  isChatRouteActive: boolean,
) {
  if (message.message.status === 1) {
    return false;
  }
  if (isPositiveId(currentUserId) && message.message.userId === currentUserId) {
    return false;
  }

  return !(
    appState === "active"
    && isChatRouteActive
    && currentContactId == null
    && message.message.roomId === currentRoomId
  );
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

function parseIncomingRoomMessages(
  rawData: unknown,
): { messages: ChatMessageResponse[]; type: number | null } {
  const envelope = parseWebSocketEnvelope(rawData);
  const type = typeof envelope?.type === "number" ? envelope.type : null;
  if (type === GROUP_MESSAGE_BATCH_PUSH_TYPE) {
    const batch = Array.isArray(envelope?.data) ? envelope.data : [];
    return {
      messages: batch
        .map(item => (item as { message?: ChatMessageResponse["message"] } | undefined)?.message)
        .filter((message): message is ChatMessageResponse["message"] => !!message)
        .map(message => ({ message })),
      type,
    };
  }
  if (type !== GROUP_MESSAGE_PUSH_TYPE) {
    return {
      messages: [],
      type,
    };
  }

  const nextMessage = (envelope?.data as { message?: ChatMessageResponse["message"] } | undefined)?.message;
  if (!nextMessage) {
    return {
      messages: [],
      type,
    };
  }

  return {
    messages: [{
      message: nextMessage,
    }],
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

function normalizeIncomingNotification(notification: Record<string, unknown>): NotificationItemResponse {
  return {
    notificationId: isPositiveId(notification.notificationId) ? notification.notificationId : undefined,
    category: readString(notification.category) ?? undefined,
    title: readString(notification.title) ?? undefined,
    content: readString(notification.content) ?? undefined,
    targetPath: readString(notification.targetPath) ?? undefined,
    resourceType: readString(notification.resourceType) ?? undefined,
    resourceId: isPositiveId(notification.resourceId) ? notification.resourceId : undefined,
    isRead: typeof notification.isRead === "boolean" ? notification.isRead : undefined,
    readTime: readString(notification.readTime) ?? undefined,
    createTime: readString(notification.createTime) ?? undefined,
    payload: notification.payload && typeof notification.payload === "object"
      ? notification.payload as NotificationItemResponse["payload"]
      : undefined,
  };
}

export function useRoomMessagesLiveSync(options: RoomMessagesLiveSyncOptions = {}) {
  const {
    currentContactId = null,
    currentRoomId = null,
    currentSpaceId = null,
    isChatRouteActive = false,
  } = options;
  const queryClient = useQueryClient();
  const { isAuthenticated, session, signOut } = useAuthSession();
  const { presentNotification } = useMobileNotificationSession();
  const appStateRef = useRef(AppState.currentState);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const closedByHookRef = useRef(false);

  // 当前会话/路由状态用 ref 读取，房间或页面切换时不重建 WebSocket 连接。
  const optionsRef = useRef({ currentContactId, currentRoomId, currentSpaceId, isChatRouteActive });
  const presentNotificationRef = useRef(presentNotification);
  const sessionRef = useRef(session);

  useEffect(() => {
    optionsRef.current = { currentContactId, currentRoomId, currentSpaceId, isChatRouteActive };
    presentNotificationRef.current = presentNotification;
    sessionRef.current = session;
  });

  const webSocketUrl = useMemo(() => {
    const token = session?.token?.trim();
    if (!token) {
      return null;
    }

    return createWebSocketUrl(token);
  }, [session?.token]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appStateRef.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !webSocketUrl) {
      return;
    }

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

    async function presentDirectMessageNotification(directMessage: MessageDirectResponse) {
      const { currentContactId: contactSelection, isChatRouteActive: chatActive } = optionsRef.current;
      const currentUserId = sessionRef.current?.userId ?? directMessage.userId ?? null;
      if (!shouldNotifyDirectMessage(
        directMessage,
        currentUserId,
        contactSelection,
        appStateRef.current,
        chatActive,
      )) {
        return;
      }

      const contactId = getDirectContactId(directMessage, currentUserId);
      if (!contactId || !(await canPresentNotification("messages"))) {
        return;
      }

      const senderName = readString(directMessage.senderUsername)
        ?? (isPositiveId(directMessage.senderId) ? `用户 #${directMessage.senderId}` : "私聊消息");
      const preview = getDirectMessagePreviewText(directMessage).trim() || "你收到一条新消息";

      await presentNotificationRef.current({
        body: preview,
        resourceId: directMessage.messageId ?? null,
        resourceType: "DIRECT_MESSAGE",
        tag: `dm:${directMessage.messageId ?? directMessage.syncId ?? `${directMessage.senderId ?? ""}:${directMessage.receiverId ?? ""}:${directMessage.createTime ?? preview}`}`,
        targetPath: `/chat/private/${contactId}`,
        title: senderName,
      });
    }

    async function presentRoomMessagesNotification(messages: ChatMessageResponse[]) {
      const { currentContactId: contactSelection, currentRoomId: roomSelection, currentSpaceId: spaceSelection, isChatRouteActive: chatActive } = optionsRef.current;
      const resolvedRoomId = isPositiveRoomId(roomSelection) ? roomSelection : null;
      const currentUserId = sessionRef.current?.userId ?? null;
      const visibleMessages = messages.filter(message => shouldNotifyRoomMessage(
        message,
        currentUserId,
        resolvedRoomId,
        contactSelection,
        appStateRef.current,
        chatActive,
      ));
      if (visibleMessages.length === 0 || !(await canPresentNotification("messages"))) {
        return;
      }

      const messagesByRoom = new Map<number, ChatMessageResponse[]>();
      for (const message of visibleMessages) {
        const messageRoomId = message.message.roomId;
        if (!isPositiveRoomId(messageRoomId)) {
          continue;
        }
        const roomMessages = messagesByRoom.get(messageRoomId) ?? [];
        roomMessages.push(message);
        messagesByRoom.set(messageRoomId, roomMessages);
      }

      for (const [messageRoomId, roomMessages] of messagesByRoom) {
        const latestMessage = roomMessages[roomMessages.length - 1];
        if (!latestMessage) {
          continue;
        }

        const roomMeta = getRoomNotificationMeta(
          queryClient,
          messageRoomId,
          messageRoomId === resolvedRoomId ? spaceSelection : null,
        );
        const speaker = getRoomMessageSpeakerLabel(latestMessage.message);
        const preview = getMessagePreviewText(latestMessage.message).trim() || "你收到一条新消息";
        const body = roomMessages.length > 1
          ? `${speaker ? `${speaker}: ` : ""}${preview} 等 ${roomMessages.length} 条新消息`
          : `${speaker ? `${speaker}: ` : ""}${preview}`;

        await presentNotificationRef.current({
          body,
          resourceId: latestMessage.message.messageId ?? null,
          resourceType: "ROOM_MESSAGE",
          tag: `room:${messageRoomId}:${latestMessage.message.messageId ?? latestMessage.message.syncId}`,
          targetPath: getRoomNotificationTargetPath(messageRoomId, roomMeta),
          title: roomMeta.name ?? "群聊消息",
        });
      }
    }

    async function presentUserNotification(notification: NotificationItemResponse) {
      if (!(await canPresentNotification("system", notification.category ?? null))) {
        return;
      }

      const title = readString(notification.title) ?? "团剧通知";
      const body = readString(notification.content) ?? readString(notification.title) ?? "你有一条新通知";
      await presentNotificationRef.current({
        body,
        resourceId: notification.resourceId ?? notification.notificationId ?? null,
        resourceType: notification.resourceType ?? "USER_NOTIFICATION",
        tag: `notification:${notification.notificationId ?? notification.category ?? title}:${notification.createTime ?? body}`,
        targetPath: notification.targetPath ?? "/notifications",
        title,
      });
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
          const currentUserId = sessionRef.current?.userId ?? directMessage.userId ?? null;
          queryClient.setQueryData<MessageDirectResponse[]>(
            getDirectInboxQueryKey(currentUserId),
            current => upsertDirectInboxMessagesData(current, [directMessage]),
          );
          void writeCachedDirectMessages(currentUserId, [directMessage]).catch((error) => {
            console.warn("[useRoomMessagesLiveSync] 写入私聊 WebSocket 磁盘缓存失败:", error);
          });
          void presentDirectMessageNotification(directMessage).catch((error) => {
            console.warn("[useRoomMessagesLiveSync] 私聊本地通知失败:", error);
          });
          return;
        }

        const notification = parseIncomingNotification(event.data);
        if (notification) {
          prependNotificationToCaches(queryClient, notification as any);
          queryClient.invalidateQueries({ queryKey: getNotificationsUnreadCountQueryKey() });
          void presentUserNotification(normalizeIncomingNotification(notification)).catch((error) => {
            console.warn("[useRoomMessagesLiveSync] 站内本地通知失败:", error);
          });
          return;
        }

        const { messages, type } = parseIncomingRoomMessages(event.data);
        if (messages.length > 0) {
          const resolvedRoomId = isPositiveRoomId(optionsRef.current.currentRoomId)
            ? optionsRef.current.currentRoomId
            : null;
          let latestReadSyncId: number | null = null;
          const currentRoomMessages: ChatMessageResponse[] = [];
          for (const message of messages) {
            const messageRoomId = message.message.roomId;
            const messageSyncId = message.message.syncId;
            if (typeof messageRoomId === "number" && messageRoomId > 0 && typeof messageSyncId === "number") {
              bumpRoomSessionLatestSyncInCache(queryClient, messageRoomId, messageSyncId);
            }
            if (resolvedRoomId != null && messageRoomId === resolvedRoomId) {
              currentRoomMessages.push(message);
              if (typeof messageSyncId === "number") {
                latestReadSyncId = Math.max(latestReadSyncId ?? messageSyncId, messageSyncId);
              }
            }
          }
          if (resolvedRoomId != null && currentRoomMessages.length === 1) {
            upsertLiveRoomMessageWithGapRepair(resolvedRoomId, currentRoomMessages[0], {
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
          }
          else if (resolvedRoomId != null && currentRoomMessages.length > 1) {
            upsertLiveRoomMessagesWithGapRepair(resolvedRoomId, currentRoomMessages, {
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
          }
          if (resolvedRoomId != null && typeof latestReadSyncId === "number") {
            markRoomSessionReadInCache(queryClient, resolvedRoomId, latestReadSyncId);
          }
          void presentRoomMessagesNotification(messages).catch((error) => {
            console.warn("[useRoomMessagesLiveSync] 群聊本地通知失败:", error);
          });
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
  }, [isAuthenticated, queryClient, signOut, webSocketUrl]);
}

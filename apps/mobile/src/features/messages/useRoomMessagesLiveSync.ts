import type { ApiResultRoomListResponse } from "@tuanchat/openapi-client/models/ApiResultRoomListResponse";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { NotificationItemResponse } from "@tuanchat/openapi-client/models/NotificationItemResponse";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import {
  getDirectContactId,
  getDirectMessagePreviewText,
  isDirectReadLineMessage,
  isDirectRecallEvent,
} from "@tuanchat/domain/direct-message";
import { getMessagePreviewText } from "@tuanchat/domain/message-preview";
import { getDirectInboxQueryKey, upsertDirectInboxMessagesData } from "@tuanchat/query/direct-message";
import {
  bumpRoomSessionLatestSyncInCache,
  getUserMessageSessionsQueryKey,
} from "@tuanchat/query/message-sessions";
import { getNotificationsUnreadCountQueryKey, prependNotificationToCaches } from "@tuanchat/query/notifications";
import { useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { writeCachedDirectMessages } from "@/features/friends/mobileDirectMessageCache";
import {
  applyMobileChatStatusEvent,
  parseMobileChatStatusEvent,
  registerMobileChatStatusSender,
} from "@/features/messages/mobileChatStatus";
import { writeCachedRoomMessages } from "@/features/messages/mobileRoomMessageCache";
import {
  extractChatMessageResponses,
  upsertLiveRoomMessageWithGapRepair,
  upsertLiveRoomMessagesWithGapRepair,
} from "@/features/messages/roomMessageSync";
import { useMobileNotificationSession } from "@/features/notifications/mobileNotificationSessionContext";
import { readNotificationPreferences } from "@/features/notifications/notificationPreferences";
import { logNotificationTrace } from "@/features/notifications/notificationTrace";
import {
  clearRoomReadPositionSyncTimers,
  markRoomReadOptimistically,
  scheduleDebouncedRoomReadPositionSync,
  shouldAutoMarkFocusedRoomRead,
  type RoomReadPositionSyncState,
} from "@/features/rooms/roomReadPositionSync";
import { mobileApiClient } from "@/lib/api";

import {
  MobileRoomMessageDeliveryUnknownError,
  parseMobileRoomMessageSendResult,
  registerMobileRoomMessageWebSocketSender,
  ROOM_MESSAGE_SEND_REQUEST_TYPE,
  ROOM_MESSAGE_SEND_RESULT_TYPE,
  type MobileRoomMessageSendResult,
} from "./mobileRoomMessageTransport";
import { createMobileWebSocketUrl, maskMobileWebSocketUrl } from "./mobileWebSocketUrl";

const GROUP_MESSAGE_PUSH_TYPE = 4;
const GROUP_MESSAGE_BATCH_PUSH_TYPE = 25;
const DIRECT_MESSAGE_PUSH_TYPE = 1;
const USER_NOTIFICATION_PUSH_TYPE = 23;
const TOKEN_INVALID_PUSH_TYPE = 100;
const CHAT_STATUS_REQ_TYPE = 4;
const CHAT_STATUS_PUSH_TYPE = 17;
// 心跳：上行 type 与服务端 WSReqTypeEnum.HEARTBEAT 对齐；下行 pong 复用同一 type。
const HEARTBEAT_REQ_TYPE = 2;
// 发送心跳的间隔。服务端读空闲阈值为 60s，这里取 25s 留足余量（每个心跳都会换回一个 pong）。
const HEARTBEAT_INTERVAL_MS = 25_000;
// 看门狗：连接处于 OPEN 但超过该时长没收到任何帧（含 pong），判定为僵尸连接并强制重连。
const CONNECTION_STALE_TIMEOUT_MS = 60_000;
// 看门狗轮询间隔。
const WATCHDOG_INTERVAL_MS = 10_000;
const ROOM_MESSAGE_SEND_ACK_TIMEOUT_MS = 15_000;

type WebSocketEnvelope = {
  data?: unknown;
  type?: number;
};

type PendingRoomMessageSend = {
  reject: (error: Error) => void;
  resolve: (result: MobileRoomMessageSendResult) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type RoomMessagesLiveSyncOptions = {
  currentContactId?: number | null;
  currentRoomId?: number | null;
  currentSpaceId?: number | null;
  isCurrentRoomFocused?: boolean;
  isChatRouteActive?: boolean;
};

type RoomNotificationMeta = {
  name: string | null;
  spaceId: number | null;
};

type CachedRoomRolesData = {
  allRoles?: readonly UserRole[];
} | readonly UserRole[];

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
  let result = true;
  if (!prefs.enabled) {
    result = false;
  }
  else if (kind === "messages") {
    result = prefs.messages;
  }
  else if (category?.toUpperCase().includes("FRIEND")) {
    result = prefs.friendRequests;
  }
  else {
    result = prefs.system;
  }

  logNotificationTrace("preferences.check", {
    category,
    kind,
    prefs,
    result,
  });

  return result;
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
  return meta.spaceId ? `/chat/${meta.spaceId}/${roomId}` : `/chat/room/${roomId}`;
}

function readRolesFromCachedRoomRoles(data: CachedRoomRolesData | undefined): readonly UserRole[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data && "allRoles" in data ? data.allRoles ?? [] : [];
}

function getCachedRoomRoleName(
  queryClient: QueryClient,
  roomId: number | null | undefined,
  roleId: number | null | undefined,
) {
  if (!isPositiveId(roomId) || !isPositiveId(roleId)) {
    return null;
  }

  for (const [, data] of queryClient.getQueriesData<CachedRoomRolesData>({ queryKey: ["roomRoles", roomId] })) {
    for (const role of readRolesFromCachedRoomRoles(data)) {
      if (role.roleId === roleId) {
        const roleName = readString(role.roleName);
        if (roleName) {
          return roleName;
        }
      }
    }
  }

  return null;
}

function getRoomMessageSpeakerLabel(queryClient: QueryClient, message: ChatMessageResponse["message"]) {
  return readString(message.customRoleName)
    ?? getCachedRoomRoleName(queryClient, message.roomId, message.roleId)
    ?? (isPositiveId(message.userId) ? `用户 #${message.userId}` : null);
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

function parseIncomingChatStatus(rawData: unknown) {
  const envelope = parseWebSocketEnvelope(rawData);
  if (envelope?.type !== CHAT_STATUS_PUSH_TYPE) {
    return null;
  }
  return parseMobileChatStatusEvent(envelope.data);
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
    isCurrentRoomFocused = false,
    isChatRouteActive = false,
  } = options;
  const queryClient = useQueryClient();
  const { isAuthenticated, session, signOut } = useAuthSession();
  const { presentNotification } = useMobileNotificationSession();
  const appStateRef = useRef(AppState.currentState);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingRoomMessageSendsRef = useRef(new Map<string, PendingRoomMessageSend>());
  const reconnectAttemptRef = useRef(0);
  const closedByHookRef = useRef(false);
  // 心跳定时器：连接 OPEN 后周期性发送上行心跳。
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 看门狗定时器：周期性检查"最近是否收到过帧"，识别 readyState 仍为 OPEN 的僵尸连接。
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readPositionSyncStateRef = useRef<RoomReadPositionSyncState>({
    pendingSyncIdsByRoom: {},
    timersByRoom: {},
  });
  // 最近一次从服务端收到任何帧（消息或 pong）的时间戳，看门狗据此判断连接是否假死。
  const lastReceivedAtRef = useRef(0);
  const directReceivedCountRef = useRef(0);

  // 当前会话/路由状态用 ref 读取，房间或页面切换时不重建 WebSocket 连接。
  const optionsRef = useRef({ currentContactId, currentRoomId, currentSpaceId, isChatRouteActive, isCurrentRoomFocused });
  const presentNotificationRef = useRef(presentNotification);
  const sessionRef = useRef(session);

  useEffect(() => {
    optionsRef.current = { currentContactId, currentRoomId, currentSpaceId, isChatRouteActive, isCurrentRoomFocused };
    presentNotificationRef.current = presentNotification;
    sessionRef.current = session;
  });

  useEffect(() => {
    const syncState = readPositionSyncStateRef.current;
    return () => clearRoomReadPositionSyncTimers(syncState);
  }, []);

  const webSocketUrl = useMemo(() => {
    const token = session?.token?.trim();
    if (!token) {
      return null;
    }

    return createMobileWebSocketUrl(token);
  }, [session?.token]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      logNotificationTrace("app-state.change", {
        from: appStateRef.current,
        to: nextAppState,
      });
      appStateRef.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !webSocketUrl) {
      logNotificationTrace("ws.effect.skip", {
        hasWebSocketUrl: Boolean(webSocketUrl),
        isAuthenticated,
      });
      return;
    }

    const pendingRoomMessageSends = pendingRoomMessageSendsRef.current;
    const resolvedWebSocketUrl = webSocketUrl;
    let disposed = false;

    logNotificationTrace("ws.effect.start", {
      url: maskMobileWebSocketUrl(resolvedWebSocketUrl),
    });

    const cleanupReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const closeSocket = () => {
      cleanupReconnectTimer();
      stopHeartbeat();
      stopWatchdog();
      if (socketRef.current) {
        logNotificationTrace("ws.close-by-hook", {
          readyState: socketRef.current.readyState,
        });
        closedByHookRef.current = true;
        socketRef.current.close();
        socketRef.current = null;
      }
    };

    const unregisterStatusSender = registerMobileChatStatusSender((chatStatusEvent) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      socket.send(JSON.stringify({
        data: chatStatusEvent,
        type: CHAT_STATUS_REQ_TYPE,
      }));
      return true;
    });

    const unregisterRoomMessageSender = registerMobileRoomMessageWebSocketSender((requestId, request: ChatMessageRequest) => {
      const socket = socketRef.current;
      const sinceLastReceived = Date.now() - lastReceivedAtRef.current;
      if (
        !socket
        || socket.readyState !== WebSocket.OPEN
        || appStateRef.current !== "active"
        || sinceLastReceived > CONNECTION_STALE_TIMEOUT_MS
      ) {
        return null;
      }

      let resolvePending!: (result: MobileRoomMessageSendResult) => void;
      let rejectPending!: (error: Error) => void;
      const pendingPromise = new Promise<MobileRoomMessageSendResult>((resolve, reject) => {
        resolvePending = resolve;
        rejectPending = reject;
      });
      const timeout = setTimeout(() => {
        pendingRoomMessageSends.delete(requestId);
        rejectPending(new MobileRoomMessageDeliveryUnknownError());
      }, ROOM_MESSAGE_SEND_ACK_TIMEOUT_MS);
      pendingRoomMessageSends.set(requestId, {
        reject: rejectPending,
        resolve: resolvePending,
        timeout,
      });

      try {
        socket.send(JSON.stringify({
          data: JSON.stringify(request),
          requestId,
          type: ROOM_MESSAGE_SEND_REQUEST_TYPE,
        }));
        return pendingPromise;
      }
      catch {
        clearTimeout(timeout);
        pendingRoomMessageSends.delete(requestId);
        return null;
      }
    });

    function scheduleReconnect() {
      cleanupReconnectTimer();
      const delay = Math.min(30_000, 1000 * (2 ** reconnectAttemptRef.current));
      logNotificationTrace("ws.reconnect.schedule", {
        attempt: reconnectAttemptRef.current + 1,
        delay,
      });
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        if (!disposed) {
          connect();
        }
      }, delay);
    }

    function stopHeartbeat() {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    }

    function stopWatchdog() {
      if (watchdogTimerRef.current) {
        clearInterval(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    }

    // 强制重连：用于看门狗判定连接假死时。区别于 closeSocket（hook 主动关闭、不重连），
    // 这里要触发 onclose 之外的显式重连，因此手动关闭并直接排程重连。
    function forceReconnect(reason: string) {
      logNotificationTrace("ws.force-reconnect", { reason });
      stopHeartbeat();
      stopWatchdog();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        // 标记为 hook 关闭，避免 onclose 再排一次重连（这里统一由本函数排程）。
        closedByHookRef.current = true;
        try {
          socket.close();
        }
        catch {
          // 忽略关闭异常（连接可能已处于异常态）。
        }
      }
      if (!disposed) {
        scheduleReconnect();
      }
    }

    function startHeartbeat() {
      stopHeartbeat();
      heartbeatTimerRef.current = setInterval(() => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          return;
        }
        try {
          socket.send(JSON.stringify({ type: HEARTBEAT_REQ_TYPE }));
          logNotificationTrace("ws.heartbeat.send", {
            appState: appStateRef.current,
          });
        }
        catch (error) {
          logNotificationTrace("ws.heartbeat.error", {
            message: error instanceof Error ? error.message : String(error),
          });
          // 发送失败说明连接已不可用，直接强制重连。
          forceReconnect("heartbeat-send-failed");
        }
      }, HEARTBEAT_INTERVAL_MS);
    }

    function startWatchdog() {
      stopWatchdog();
      watchdogTimerRef.current = setInterval(() => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          return;
        }
        const sinceLastReceived = Date.now() - lastReceivedAtRef.current;
        if (sinceLastReceived > CONNECTION_STALE_TIMEOUT_MS) {
          // readyState 仍为 OPEN 但长时间收不到任何帧（含 pong），判定为僵尸连接。
          logNotificationTrace("ws.watchdog.stale", {
            appState: appStateRef.current,
            sinceLastReceived,
          });
          forceReconnect("watchdog-stale");
        }
      }, WATCHDOG_INTERVAL_MS);
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
        logNotificationTrace("dm.notification.skip-by-context", {
          appState: appStateRef.current,
          contactSelection,
          currentUserId,
          directMessageId: directMessage.messageId ?? null,
          isChatRouteActive: chatActive,
          receiverId: directMessage.receiverId ?? null,
          senderId: directMessage.senderId ?? null,
          status: directMessage.status ?? null,
          syncId: directMessage.syncId ?? null,
        });
        return;
      }

      const contactId = getDirectContactId(directMessage, currentUserId);
      if (!contactId) {
        logNotificationTrace("dm.notification.skip-no-contact", {
          currentUserId,
          directMessageId: directMessage.messageId ?? null,
          receiverId: directMessage.receiverId ?? null,
          senderId: directMessage.senderId ?? null,
        });
        return;
      }

      if (!(await canPresentNotification("messages"))) {
        logNotificationTrace("dm.notification.skip-by-preferences", {
          contactId,
          directMessageId: directMessage.messageId ?? null,
        });
        return;
      }

      const senderName = readString(directMessage.senderUsername)
        ?? (isPositiveId(directMessage.senderId) ? `用户 #${directMessage.senderId}` : "私聊消息");
      const preview = getDirectMessagePreviewText(directMessage).trim() || "你收到一条新消息";
      logNotificationTrace("dm.notification.present", {
        appState: appStateRef.current,
        contactId,
        directMessageId: directMessage.messageId ?? null,
        previewLength: preview.length,
        senderId: directMessage.senderId ?? null,
        syncId: directMessage.syncId ?? null,
        targetPath: `/chat/private/${contactId}`,
      });

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
        logNotificationTrace("room.notification.skip", {
          appState: appStateRef.current,
          currentUserId,
          inputCount: messages.length,
          resolvedRoomId,
          visibleCount: visibleMessages.length,
        });
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
        const speaker = getRoomMessageSpeakerLabel(queryClient, latestMessage.message);
        const preview = getMessagePreviewText(latestMessage.message).trim() || "你收到一条新消息";
        const body = roomMessages.length > 1
          ? `${speaker ? `${speaker}: ` : ""}${preview} 等 ${roomMessages.length} 条新消息`
          : `${speaker ? `${speaker}: ` : ""}${preview}`;

        logNotificationTrace("room.notification.present", {
          latestMessageId: latestMessage.message.messageId ?? null,
          messageCount: roomMessages.length,
          roomId: messageRoomId,
          syncId: latestMessage.message.syncId ?? null,
          targetPath: getRoomNotificationTargetPath(messageRoomId, roomMeta),
        });

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
        logNotificationTrace("system.notification.skip-by-preferences", {
          category: notification.category ?? null,
          notificationId: notification.notificationId ?? null,
        });
        return;
      }

      const title = readString(notification.title) ?? "团剧通知";
      const body = readString(notification.content) ?? readString(notification.title) ?? "你有一条新通知";
      logNotificationTrace("system.notification.present", {
        category: notification.category ?? null,
        notificationId: notification.notificationId ?? null,
        resourceId: notification.resourceId ?? null,
        resourceType: notification.resourceType ?? null,
        targetPath: notification.targetPath ?? "/notifications",
      });
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

      logNotificationTrace("ws.connect.start", {
        appState: appStateRef.current,
        url: maskMobileWebSocketUrl(resolvedWebSocketUrl),
      });

      const socket = new WebSocket(resolvedWebSocketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        logNotificationTrace("ws.open", {
          appState: appStateRef.current,
        });
        reconnectAttemptRef.current = 0;
        // 连接建立即视为"刚收到过数据"，避免看门狗在握手后立刻误判。
        lastReceivedAtRef.current = Date.now();
        startHeartbeat();
        startWatchdog();
      };

      socket.onmessage = (event) => {
        // 收到任何帧都刷新存活时间戳，供看门狗判断连接是否假死。
        lastReceivedAtRef.current = Date.now();

        const envelope = parseWebSocketEnvelope(event.data);
        logNotificationTrace("ws.message", {
          appState: appStateRef.current,
          hasData: Boolean(envelope?.data),
          rawLength: typeof event.data === "string" ? event.data.length : null,
          type: typeof envelope?.type === "number" ? envelope.type : null,
        });

        if (envelope?.type === ROOM_MESSAGE_SEND_RESULT_TYPE) {
          const result = parseMobileRoomMessageSendResult(envelope.data);
          const pending = result ? pendingRoomMessageSends.get(result.requestId) : undefined;
          if (result && pending) {
            clearTimeout(pending.timeout);
            pendingRoomMessageSends.delete(result.requestId);
            pending.resolve(result);
          }
          return;
        }

        // 心跳响应（pong）：仅用于确认连接存活，时间戳已在上面刷新，无需进入业务解析。
        if (envelope?.type === HEARTBEAT_REQ_TYPE) {
          logNotificationTrace("ws.heartbeat.pong", {
            appState: appStateRef.current,
          });
          return;
        }

        const chatStatusEvent = parseIncomingChatStatus(event.data);
        if (chatStatusEvent) {
          applyMobileChatStatusEvent(chatStatusEvent);
          return;
        }

        const directMessage = parseIncomingDirectMessage(event.data);
        if (directMessage) {
          directReceivedCountRef.current += 1;
          const content = readString((directMessage as { content?: unknown }).content);
          logNotificationTrace("dm.received", {
            appState: appStateRef.current,
            contentPreview: content ? content.slice(0, 80) : null,
            messageId: directMessage.messageId ?? null,
            receiverId: directMessage.receiverId ?? null,
            receivedSeq: directReceivedCountRef.current,
            senderId: directMessage.senderId ?? null,
            status: directMessage.status ?? null,
            syncId: directMessage.syncId ?? null,
          });
          const currentUserId = sessionRef.current?.userId ?? directMessage.userId ?? null;
          queryClient.setQueryData<MessageDirectResponse[]>(
            getDirectInboxQueryKey(currentUserId),
            current => upsertDirectInboxMessagesData(current, [directMessage]),
          );
          void writeCachedDirectMessages(currentUserId, [directMessage]).catch((error) => {
            console.warn("[useRoomMessagesLiveSync] 写入私聊 WebSocket 磁盘缓存失败:", error);
          });
          if (!isDirectReadLineMessage(directMessage) && !isDirectRecallEvent(directMessage)) {
            void presentDirectMessageNotification(directMessage).catch((error) => {
              console.warn("[useRoomMessagesLiveSync] 私聊本地通知失败:", error);
            });
          }
          return;
        }

        const notification = parseIncomingNotification(event.data);
        if (notification) {
          const normalizedNotification = normalizeIncomingNotification(notification);
          logNotificationTrace("system.received", {
            category: readString(notification.category),
            notificationId: isPositiveId(notification.notificationId) ? notification.notificationId : null,
            targetPath: readString(notification.targetPath),
          });
          prependNotificationToCaches(queryClient, normalizedNotification);
          queryClient.invalidateQueries({ queryKey: getNotificationsUnreadCountQueryKey() });
          void presentUserNotification(normalizedNotification).catch((error) => {
            console.warn("[useRoomMessagesLiveSync] 站内本地通知失败:", error);
          });
          return;
        }

        const { messages, type } = parseIncomingRoomMessages(event.data);
        if (messages.length > 0) {
          logNotificationTrace("room.received", {
            count: messages.length,
            rooms: Array.from(new Set(messages.map(message => message.message.roomId).filter(isPositiveId))),
            type,
          });
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
          if (resolvedRoomId != null && typeof latestReadSyncId === "number" && shouldAutoMarkFocusedRoomRead({
            currentRoomId: resolvedRoomId,
            isRoomFocused: appStateRef.current === "active" && optionsRef.current.isCurrentRoomFocused,
            targetSyncId: latestReadSyncId,
          })) {
            markRoomReadOptimistically(queryClient, resolvedRoomId, latestReadSyncId);
            scheduleDebouncedRoomReadPositionSync(
              readPositionSyncStateRef.current,
              resolvedRoomId,
              latestReadSyncId,
              (roomId, syncId) => {
                void mobileApiClient.messageSession.updateReadPosition1({ roomId, syncId }).catch((error) => {
                  console.warn("[useRoomMessagesLiveSync] 同步房间已读位置失败:", error);
                  queryClient.invalidateQueries({ queryKey: getUserMessageSessionsQueryKey() });
                });
              },
            );
          }
          void presentRoomMessagesNotification(messages).catch((error) => {
            console.warn("[useRoomMessagesLiveSync] 群聊本地通知失败:", error);
          });
          return;
        }

        if (type === TOKEN_INVALID_PUSH_TYPE) {
          logNotificationTrace("ws.token-invalid");
          closeSocket();
          void signOut();
        }
      };

      socket.onerror = () => {
        logNotificationTrace("ws.error");
        socket.close();
      };

      socket.onclose = (event) => {
        logNotificationTrace("ws.close", {
          closedByHook: closedByHookRef.current,
          code: (event as { code?: number }).code ?? null,
          reason: (event as { reason?: string }).reason ?? null,
          wasClean: (event as { wasClean?: boolean }).wasClean ?? null,
        });
        // 连接关闭后停掉心跳/看门狗，避免在已死连接上空转或重复排程。
        stopHeartbeat();
        stopWatchdog();
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        if (!disposed && !closedByHookRef.current) {
          scheduleReconnect();
        }
      };
    }

    // 回前台时主动复查连接：OS 在后台会挂起 JS 定时器，进后台期间排程的重连
    // 可能从未执行，且经历过后台的 socket 常是"readyState 仍为 OPEN 的僵尸连接"。
    // 这里在切回 active 时强制做一次健康检查，不健康就清空退避计数并立即重连。
    const foregroundSubscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active" || disposed) {
        return;
      }
      const socket = socketRef.current;
      const sinceLastReceived = Date.now() - lastReceivedAtRef.current;
      const isHealthy = socket
        && socket.readyState === WebSocket.OPEN
        && sinceLastReceived <= CONNECTION_STALE_TIMEOUT_MS;
      logNotificationTrace("ws.foreground.check", {
        hasSocket: Boolean(socket),
        isHealthy: Boolean(isHealthy),
        readyState: socket?.readyState ?? null,
        sinceLastReceived,
      });
      if (isHealthy) {
        return;
      }
      // 回前台立即重连，不沿用后台累积的指数退避。
      reconnectAttemptRef.current = 0;
      forceReconnect("foreground-unhealthy");
    });

    connect();

    return () => {
      logNotificationTrace("ws.effect.cleanup");
      disposed = true;
      unregisterStatusSender();
      unregisterRoomMessageSender();
      for (const pending of pendingRoomMessageSends.values()) {
        clearTimeout(pending.timeout);
        pending.reject(new MobileRoomMessageDeliveryUnknownError());
      }
      pendingRoomMessageSends.clear();
      foregroundSubscription.remove();
      stopHeartbeat();
      stopWatchdog();
      closeSocket();
    };
  }, [isAuthenticated, queryClient, signOut, webSocketUrl]);
}

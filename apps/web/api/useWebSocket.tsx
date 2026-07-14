import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";
import { formatLocalDateTime } from "@/utils/dateUtil";
import { useQueryClient } from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useRef} from "react";
import { useImmer } from "use-immer";
import { recoverAuthTokenFromSession } from "./authRecovery";
import type { ChatStatusEvent, DirectMessageEvent } from "./wsModels";
import {
  useGetUserSessionsQuery,
  useUpdateReadPosition1Mutation
} from "./hooks/messageSessionQueryHooks";
import type {MessageSessionResponse} from "@tuanchat/openapi-client/models/MessageSessionResponse";
import type { CrossTabNotificationGuard } from "@/utils/crossTabNotificationGuard";
import { createCrossTabNotificationGuard } from "@/utils/crossTabNotificationGuard";
import { appendUrlQueryParam, resolveRuntimeWebSocketBaseUrl } from "@/utils/runtimeUrl";
import type { ChatStatus, OptimisticDirectMessagePending, WsMessage } from "./webSocketRuntimeTypes";
import { AUTH_SESSION_CHANGED_EVENT } from "@/utils/auth/sessionEvents";
import { useWebSocketMessageHandlers } from "./useWebSocketMessageHandlers";
import { useWebSocketNotifications } from "./useWebSocketNotifications";
import {
  removeDirectInboxMessageFromCache,
  upsertDirectInboxQueryData,
} from "@tuanchat/query/direct-message";
import {
  bumpRoomSessionLatestSyncInCache,
  getRoomUnreadCountsFromSessions,
} from "@tuanchat/query/message-sessions";
import { normalizeWebSocketRequestForSend } from "./webSocketProtocol";

/**
 * 成员的输入状态（不包含roomId）
 * @param userId
 * @param status 聊天状态对象，type 用于状态匹配，description 用于显示文案
 */
/**
 * @property connect 连接WebSocket
 * @property send 发送消息 发送聊天消息到指定房间(type: 3) 聊天状态控制 (type: 4)
 * @property isConnected 检查连接状态
 * @property unreadMessagesNumber 未读消息数量（群聊部分）
 * @property updateLastReadSyncId 更新未读消息 （群聊部分） 如果lastReadSyncIdΪundefined，则使用latestSyncId
 * @property chatStatus 成员的输入状态，按 roomId 保存 { userId, status: { type, description } }
 * @property updateChatStatus 更新成员输入状态，匹配逻辑使用 status.type
 */
export interface WebsocketUtils {
  connect: () => void;
  send: (request: WsMessage<any>) => void;
  sendWithResult: (request: WsMessage<any>) => Promise<boolean>;
  isConnected: () => boolean;
  unreadMessagesNumber: Record<number, number>; // 存储未读消息数
  updateLastReadSyncId: (roomId: number, lastReadSyncId?: number) => void;
  chatStatus: Record<number, ChatStatus[]>;
  updateChatStatus: (chatStatusEvent:ChatStatusEvent)=> void;
  pushOptimisticDirectMessage: (request: MessageDirectSendRequest) => number | null;
  removeOptimisticDirectMessage: (optimisticMessageId: number) => void;
}

const EMPTY_SESSIONS: MessageSessionResponse[] = [];

const WS_URL = resolveRuntimeWebSocketBaseUrl(import.meta.env.VITE_API_WS_URL);
const WS_RECONNECTED_EVENT = "tc:ws-reconnected";
const OPTIMISTIC_DIRECT_MESSAGE_ID_BASE = Date.now() * 1000;
const OPTIMISTIC_DIRECT_MESSAGE_TIMEOUT_MS = 30_000;
const WS_DEBUG_LOG_ENABLED = import.meta.env.DEV;
type WsDebugState = {
  implementedTypes: number[];
  unhandledTypes: number[];
  countByType: Record<number, number>;
  lastMessageByType: Record<number, any>;
};

export function useWebSocket() {
  const readCurrentToken = useCallback(() => {
    if (typeof window === "undefined")
      return "";
    return (window.localStorage.getItem("token") || "").trim();
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const isConnected = useCallback(() => wsRef.current?.readyState === WebSocket.OPEN, []);
  const isConnecting = useCallback(() => wsRef.current?.readyState === WebSocket.CONNECTING, []);
  const hasOpenedOnceRef = useRef(false);
  // 标记“组件主动关闭”（例如 React StrictMode 的 effect cleanup），避免误判为网络错误并触发重连/报错。
  const closingRef = useRef(false);
  const connectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const heartbeatTimer = useRef<NodeJS.Timeout>(setTimeout(() => {}));
  // 私聊乐观态统一进入 dmInbox query；pending map 只保存确认匹配与超时清理元数据。
  const optimisticDirectMessageIdRef = useRef<number>(OPTIMISTIC_DIRECT_MESSAGE_ID_BASE);
  const optimisticDirectMessageRequestMapRef = useRef<Map<number, OptimisticDirectMessagePending>>(new Map());

  const queryClient = useQueryClient();
  const crossTabNotificationGuardRef = useRef<CrossTabNotificationGuard | null>(null);

  const getCrossTabNotificationGuard = useCallback(() => {
    if (crossTabNotificationGuardRef.current == null) {
      crossTabNotificationGuardRef.current = createCrossTabNotificationGuard();
    }
    return crossTabNotificationGuardRef.current;
  }, []);

  useEffect(() => {
    getCrossTabNotificationGuard();
    return () => {
      crossTabNotificationGuardRef.current?.dispose();
      crossTabNotificationGuardRef.current = null;
    };
  }, [getCrossTabNotificationGuard]);

  const isCurrentTabInForeground = useCallback(() => {
    return getCrossTabNotificationGuard().isCurrentTabSelected();
  }, [getCrossTabNotificationGuard]);

  const shouldShowCrossTabSystemNotification = useCallback(() => {
    return getCrossTabNotificationGuard().shouldShowSystemNotification();
  }, [getCrossTabNotificationGuard]);

  const cleanupRoomDescriptionDocOnDissolve = useCallback((roomId: number) => {
    void roomId;
  }, []);

  /**
   * 群聊的未读消息数
   */
  const roomSessions: MessageSessionResponse[] = useGetUserSessionsQuery().data?.data ?? EMPTY_SESSIONS;
  const { mutate: updateReadPosition1 } = useUpdateReadPosition1Mutation();
  const unreadMessagesNumber = useMemo(
    () => getRoomUnreadCountsFromSessions(roomSessions),
    [roomSessions],
  );
  const updateLatestSyncId = useCallback((roomId: number, latestSyncId: number) => {
    bumpRoomSessionLatestSyncInCache(queryClient, roomId, latestSyncId);
  }, [queryClient]);
  /**
   * 更新群聊的最后阅读的消息位置
   * @param roomId
   * @param lastReadSyncId
   */
  const updateLastReadSyncId = useCallback((roomId: number, lastReadSyncId?: number) => {
    const session = roomSessions.find(session => session.roomId === roomId);
    if (!session) return;

    const targetReadySyncId = lastReadSyncId ?? session.latestSyncId ?? session.lastReadSyncId ?? 0;
    if (targetReadySyncId === (session.lastReadSyncId ?? 0))
      return;

    updateReadPosition1({
      roomId,
      syncId: targetReadySyncId,
    });
  }, [roomSessions, updateReadPosition1]);
  // 输入状态, 按照roomId进行分组
  const [chatStatus, updateChatStatus] = useImmer<Record<number, ChatStatus[]>>({});

  // Sa-Token tokenValue（不再是 userId）。注意：不要在这里固定读取，避免 token 变更后仍用旧值。
  // 配置参数
  const HEARTBEAT_INTERVAL = 25000;

  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // 这里代表“前端已显式实现处理逻辑”的 WS type（对应 onMessage 的 switch cases）。
  // 未在该列表中的 type，会在运行时第一次收到时通过 default 分支提示。
  const implementedWsTypes = useRef<Set<number>>(new Set([1, 2, 4, 11, 12, 14, 15, 17, 19, 21, 22, 23, 24, 25, 100]));
  const unhandledWsTypes = useRef<Set<number>>(new Set());
  const countByTypeRef = useRef<Record<number, number>>({});

  const syncWsDebugToWindow = useCallback(() => {
    const g = globalThis as any;
    const state: WsDebugState = {
      implementedTypes: Array.from(implementedWsTypes.current).sort((a, b) => a - b),
      unhandledTypes: Array.from(unhandledWsTypes.current).sort((a, b) => a - b),
      countByType: countByTypeRef.current,
      lastMessageByType: g.__TC_WS_DEBUG__?.lastMessageByType ?? {},
    };
    g.__TC_WS_DEBUG__ = state;
  }, []);

  const trackWsMessage = useCallback((message: WsMessage<any>) => {
    const msgType = message?.type;
    if (typeof msgType !== "number") return;

    countByTypeRef.current[msgType] = (countByTypeRef.current[msgType] ?? 0) + 1;

    const g = globalThis as any;
    if (!g.__TC_WS_DEBUG__) {
      g.__TC_WS_DEBUG__ = {
        implementedTypes: [],
        unhandledTypes: [],
        countByType: {},
        lastMessageByType: {},
      } satisfies WsDebugState;
    }

    g.__TC_WS_DEBUG__.countByType = countByTypeRef.current;
    g.__TC_WS_DEBUG__.lastMessageByType = {
      ...(g.__TC_WS_DEBUG__.lastMessageByType ?? {}),
      [msgType]: message,
    };

    syncWsDebugToWindow();
  }, [syncWsDebugToWindow]);

  useEffect(() => {
    // React 18 StrictMode(dev) 会触发 effect: setup -> cleanup -> setup。
    // 如果这里立刻 new WebSocket，然后马上在 cleanup close，浏览器会打印“closed before established”。
    // 因此把 connect 延迟到下一 tick，并在 cleanup 里取消。
    closingRef.current = false;
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
    }
    connectTimerRef.current = setTimeout(() => {
      if (!closingRef.current) {
        connect();
      }
    }, 0);
    return () => {
      closingRef.current = true;
      if (connectTimerRef.current) {
        clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      stopHeartbeat();
      if (wsRef.current) {
        // 设置 onclose Ϊ null 防止在手动关闭时触发重连逻辑
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  /**
   * 核心连接逻辑
   */
  const connect = useCallback(() => {
    // OPEN/CONNECTING 都视为“已在连接生命周期中”，避免重复创建连接。
    if (isConnected() || isConnecting()){
      return;
    }

    const currentToken = readCurrentToken();
    if (!currentToken) {
      void recoverAuthTokenFromSession(import.meta.env.VITE_API_BASE_URL).then((recoveredToken) => {
        if (recoveredToken && !closingRef.current) {
          connect();
        }
      });

      stopHeartbeat();
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      reconnectAttempts.current = 0;
      return;
    }

    // 本次 connect 属于“正常建立连接”，重置手动关闭标记。
    closingRef.current = false;
    try {
      if (!WS_URL) {
        console.error("WebSocket base URL is not configured");
        return;
      }
      const wsUrl = currentToken ? appendUrlQueryParam(WS_URL, "token", currentToken) : WS_URL;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      socket.onopen = () => {
        if (closingRef.current || wsRef.current !== socket) {
          return;
        }
        if (WS_DEBUG_LOG_ENABLED) {
          console.info("WebSocket connected");
        }
        syncWsDebugToWindow();
        const isReconnected = hasOpenedOnceRef.current;
        hasOpenedOnceRef.current = true;
        if (isReconnected && typeof window !== "undefined") {
          // 重连成功后通知各房间的历史管理器主动增量补拉，避免“无后续新消息”时漏同步。
          window.dispatchEvent(new CustomEvent(WS_RECONNECTED_EVENT));
        }
        reconnectAttempts.current = 0;
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
        }
        startHeartbeat();
      };

      socket.onclose = (event) => {
        if (closingRef.current || wsRef.current !== socket) {
          return;
        }
        if (WS_DEBUG_LOG_ENABLED) {
          console.info(`Close code: ${event.code}, Reason: ${event.reason}`);
        }
        stopHeartbeat();
        wsRef.current = null;

        const token = readCurrentToken();
        if (!token) {
          reconnectAttempts.current = 0;
          if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
          }
          return;
        }

        // 设定重连延迟（指数退避）
        const attempt = reconnectAttempts.current;
        const delay = Math.min(200 * (2 ** attempt), 60000);

        if (WS_DEBUG_LOG_ENABLED) {
          console.info(`WebSocket closed. Attempting to reconnect in ${delay / 1000} seconds.`);
        }

        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
        }

        reconnectTimer.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      };
      socket.onmessage = (event) => {
        if (closingRef.current || wsRef.current !== socket) {
          return;
        }
        try {
          const message: WsMessage<any> = JSON.parse(event.data);
          trackWsMessage(message);
          onMessage(message);
        }
        catch (error) {
          console.error("Message parsing failed:", error);
        }
      };
      socket.onerror = (error) => {
        if (closingRef.current || wsRef.current !== socket) {
          return;
        }
        if (WS_DEBUG_LOG_ENABLED) {
          console.warn("WebSocket error, closing current socket before reconnect:", error);
        }
        socket.close();
      };
    }
    catch (error) {
      console.error("Connection failed:", error);
    }
  }, []);

  const resolveSelfUserId = useCallback((fallbackUserId?: number) => {
    const uidRaw = (typeof window !== "undefined") ? window.localStorage.getItem("uid") : null;
    const uidFallback = uidRaw && !Number.isNaN(Number(uidRaw)) ? Number(uidRaw) : 0;
    if (uidFallback > 0) {
      return uidFallback;
    }
    return (typeof fallbackUserId === "number" && fallbackUserId > 0) ? fallbackUserId : 0;
  }, []);

  const removeOptimisticDirectMessage = useCallback((optimisticMessageId: number) => {
    const pendingMessage = optimisticDirectMessageRequestMapRef.current.get(optimisticMessageId);
    if (!pendingMessage) {
      return;
    }
    clearTimeout(pendingMessage.cleanupTimer);
    optimisticDirectMessageRequestMapRef.current.delete(optimisticMessageId);
    removeDirectInboxMessageFromCache(queryClient, resolveSelfUserId(), optimisticMessageId);
  }, [queryClient, resolveSelfUserId]);

  const pushOptimisticDirectMessage = useCallback((request: MessageDirectSendRequest) => {
    const receiverId = Number(request?.receiverId);
    const selfUserId = resolveSelfUserId();
    if (!Number.isFinite(receiverId) || receiverId <= 0 || selfUserId <= 0) {
      return null;
    }

    const optimisticMessageId = optimisticDirectMessageIdRef.current++;
    const now = Date.now();
    const nowIso = formatLocalDateTime(new Date(now));
    const optimisticMessage: DirectMessageEvent = {
      messageId: optimisticMessageId,
      senderId: selfUserId,
      receiverId,
      userId: selfUserId,
      syncId: optimisticMessageId,
      content: request.content ?? "",
      messageType: request.messageType,
      replyMessageId: request.replyMessageId,
      status: 0,
      extra: request.extra ?? {},
      createTime: nowIso,
      updateTime: nowIso,
    };

    const cleanupTimer = setTimeout(() => {
      removeOptimisticDirectMessage(optimisticMessageId);
    }, OPTIMISTIC_DIRECT_MESSAGE_TIMEOUT_MS);

    optimisticDirectMessageRequestMapRef.current.set(optimisticMessageId, {
      channelId: receiverId,
      cleanupTimer,
      request,
      createdAt: now,
    });

    upsertDirectInboxQueryData(queryClient, selfUserId, [optimisticMessage]);

    return optimisticMessageId;
  }, [queryClient, removeOptimisticDirectMessage, resolveSelfUserId]);

  const {
    notifyNewDirectMessage,
    notifyNewFriendRequest,
    notifyNewGroupMessage,
    notifyNewUserNotification,
  } = useWebSocketNotifications({
    queryClient,
    isCurrentTabInForeground,
    shouldShowCrossTabSystemNotification,
    resolveSelfUserId,
  });

  const { handleChatStatusChange, onMessage } = useWebSocketMessageHandlers({
    queryClient,
    wsRef,
    closingRef,
    reconnectAttempts,
    optimisticDirectMessageRequestMapRef,
    unhandledWsTypes,
    connect,
    cleanupRoomDescriptionDocOnDissolve,
    notifyNewDirectMessage,
    notifyNewFriendRequest,
    notifyNewGroupMessage,
    notifyNewUserNotification,
    resolveSelfUserId,
    syncWsDebugToWindow,
    updateChatStatus,
    updateLatestSyncId,
  });
  /**
   * 心跳逻辑
   */
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 2 })); // 发送标准心跳
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    heartbeatTimer.current && clearInterval(heartbeatTimer.current);
  }, []);

  const closeSocket = useCallback(() => {
    stopHeartbeat();
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    reconnectAttempts.current = 0;
    closingRef.current = true;
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [stopHeartbeat]);

  useEffect(() => {
    const handleAuthSessionChanged = () => {
      if (readCurrentToken()) {
        closingRef.current = false;
        connect();
        return;
      }
      closeSocket();
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthSessionChanged);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthSessionChanged);
  }, [closeSocket, connect, readCurrentToken]);

  /**
   * 发送消息给后端
   * @param request 要发送的对象
   * 发送聊天消息到指定房间(type: 3)
   * 聊天状态控制 (type: 4)
   */
  const sendWithResult = useCallback(async (request: WsMessage<any>) => {
    if (!readCurrentToken()) {
      return false;
    }

    if (!isConnected()) {
      connect();
    }
    for (let i = 0; i < 50; i++) {
      if (wsRef.current?.readyState === WebSocket.OPEN)
        break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return false;
    }
    wsRef.current.send(JSON.stringify(normalizeWebSocketRequestForSend(request)));
    return true;
  }, [connect, isConnected, readCurrentToken]);

  const send = useCallback((request: WsMessage<any>) => {
    void sendWithResult(request);
  }, [sendWithResult]);

  useEffect(() => {
    return () => {
      for (const pendingMessage of optimisticDirectMessageRequestMapRef.current.values()) {
        clearTimeout(pendingMessage.cleanupTimer);
      }
      optimisticDirectMessageRequestMapRef.current.clear();
    };
  }, []);

  const webSocketUtils: WebsocketUtils = useMemo(() => ({
    connect,
    send,
    sendWithResult,
    isConnected,
    unreadMessagesNumber,
    updateLastReadSyncId,
    chatStatus,
    updateChatStatus: handleChatStatusChange,
    pushOptimisticDirectMessage,
    removeOptimisticDirectMessage,
  }), [
    connect,
    send,
    sendWithResult,
    isConnected,
    unreadMessagesNumber,
    updateLastReadSyncId,
    chatStatus,
    handleChatStatusChange,
    pushOptimisticDirectMessage,
    removeOptimisticDirectMessage,
  ]);
  return webSocketUtils;
}

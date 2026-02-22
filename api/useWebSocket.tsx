import type { ChatMessageRequest } from "./models/ChatMessageRequest";
import type { ChatMessageResponse } from "./models/ChatMessageResponse";
import { getLocalStorageValue, useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { formatLocalDateTime } from "@/utils/dateUtil";
import { useQueryClient } from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import { useImmer } from "use-immer";
import {useGlobalContext} from "@/components/globalContextProvider";
import toast from "react-hot-toast";
import React from "react";
import { useNavigate } from "react-router";
import { handleUnauthorized } from "@/utils/auth/unauthorized";
import { recoverAuthTokenFromSession } from "./core/authRecovery";
import type {
    ChatStatusEvent,
    ChatStatusType,
    DirectMessageEvent,
    MemberChangePush, RoleChangePush, RoomExtraChangeEvent, RoomDndMapChangeEvent,
  } from "./wsModels";
import type { NewFriendRequestPush } from "./wsModels";
import type { SpaceSidebarTreeUpdatedPush } from "./wsModels";
import type { RoomDismissPush } from "./wsModels";
import {tuanchat} from "./instance";
import {
  useGetUserSessionsQuery,
  useUpdateReadPosition1Mutation
} from "./hooks/messageSessionQueryHooks";
import type {MessageSessionResponse} from "./models/MessageSessionResponse";
import type {ApiResultListMessageSessionResponse} from "./models/ApiResultListMessageSessionResponse";
import type { ApiResultRoom } from "./models/ApiResultRoom";
import type { ApiResultRoomListResponse } from "./models/ApiResultRoomListResponse";
import type { ApiResultUserInfoResponse } from "./models/ApiResultUserInfoResponse";
import { MessageType } from "./wsModels";
import { requestPlayBgmMessageWithUrl } from "@/components/chat/infra/audioMessage/audioMessageBgmCoordinator";
import { useAudioMessageAutoPlayStore } from "@/components/chat/stores/audioMessageAutoPlayStore";
import { applyRoomDndMapChange, roomDndMapQueryKey } from "@/components/chat/shared/map/roomDndMapApi";
import { readGroupMessagePopupEnabledFromLocalStorage } from "@/components/settings/notificationPreferences";
import { showDesktopNotification } from "@/utils/desktopNotification";

/**
 * 成员的输入状态（不包含roomId）
 * @param userId
 * @param status (0:空闲, 1:正在输入, 2:等待扮演, 3:暂离)
 */
export interface ChatStatus {
  userId: number;
  status: ChatStatusType;
}
interface WsMessage<T> {
  type: number;
  data?: T;
}

/**
 * @property connect 连接WebSocket
 * @property send 发送消息 发送聊天消息到指定房间(type: 3) 聊天状态控制 (type: 4)
 * @property isConnected 检查连接状态
 * @property receivedMessages 已接收的群聊消息，使用方法：receivedMessages[roomId]
 * @property receivedDirectMessages 已接收的私聊消息，使用方法：receivedDirectMessages[userId]
 * @property unreadMessagesNumber 未读消息数量（群聊部分）
 * @property updateLastReadSyncId 更新未读消息 （群聊部分） 如果lastReadSyncIdΪundefined，则使用latestSyncId
 * @property chatStatus 成员的输入状态 (0:空闲, 1:正在输入, 2:等待扮演, 3:暂离), 默认为1 (空闲）
 * @property updateChatStatus 成员的输入状态 (0:空闲, 1:正在输入, 2:等待扮演, 3:暂离), 默认为1 (空闲）
 */
export interface WebsocketUtils {
  connect: () => void;
  send: (request: WsMessage<any>) => void;
  isConnected: () => boolean;
  receivedMessages: Record<number, ChatMessageResponse[]>;
  receivedDirectMessages: Record<number, DirectMessageEvent[]>;
  unreadMessagesNumber: Record<number, number>; // 存储未读消息数
  updateLastReadSyncId: (roomId: number, lastReadSyncId?: number) => void;
  chatStatus: Record<number, ChatStatus[]>;
  updateChatStatus: (chatStatusEvent:ChatStatusEvent)=> void;
}

const EMPTY_SESSIONS: MessageSessionResponse[] = [];

const WS_URL = import.meta.env.VITE_API_WS_URL;
const WS_RECONNECTED_EVENT = "tc:ws-reconnected";

type WsDebugState = {
  implementedTypes: number[];
  unhandledTypes: number[];
  countByType: Record<number, number>;
  lastMessageByType: Record<number, any>;
};

function FriendRequestToastContent({
  toastId,
  displayName,
  avatar,
  verifyMsg,
}: {
  toastId: string;
  displayName: string;
  avatar?: string;
  verifyMsg?: string;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="w-[320px] max-w-[90vw] rounded-lg border border-base-300 bg-base-100 p-3 shadow-xl"
      role="button"
      tabIndex={0}
      onClick={() => {
        toast.dismiss(toastId);
        navigate("/chat/private?tab=pending");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toast.dismiss(toastId);
          navigate("/chat/private?tab=pending");
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className="avatar">
          <div className="w-10 rounded-full">
            {avatar
              ? <img src={avatar} alt={displayName} />
              : <div className="w-10 h-10 rounded-full bg-base-200" />}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">
            {displayName}
            <span className="opacity-70"> 向你发送了好友申请</span>
          </div>
          {verifyMsg
            ? <div className="text-xs opacity-70 truncate mt-0.5">{verifyMsg}</div>
            : null}
        </div>
      </div>
    </div>
  );
}

function DirectMessageToastContent({
  toastId,
  senderId,
  displayName,
  avatar,
  previewText,
}: {
  toastId: string;
  senderId: number;
  displayName: string;
  avatar?: string;
  previewText: string;
}) {
  const navigate = useNavigate();

  const jumpToPrivateChat = () => {
    toast.dismiss(toastId);
    navigate(`/chat/private/${senderId}`);
  };

  return (
    <div
      className="w-[320px] max-w-[90vw] rounded-lg border border-base-300 bg-base-100 p-3 shadow-xl"
      role="button"
      tabIndex={0}
      onClick={jumpToPrivateChat}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          jumpToPrivateChat();
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className="avatar">
          <div className="w-10 rounded-full">
            {avatar
              ? <img src={avatar} alt={displayName} />
              : <div className="w-10 h-10 rounded-full bg-base-200" />}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">
            {displayName}
            <span className="opacity-70"> 给你发来私信</span>
          </div>
          <div className="text-xs opacity-70 truncate mt-0.5">{previewText}</div>
        </div>
      </div>
    </div>
  );
}

function GroupMessageToastContent({
  toastId,
  targetPath,
  roomName,
  senderName,
  senderAvatar,
  previewText,
}: {
  toastId: string;
  targetPath: string | null;
  roomName: string;
  senderName: string;
  senderAvatar?: string;
  previewText: string;
}) {
  const navigate = useNavigate();

  const jumpToGroupChat = () => {
    toast.dismiss(toastId);
    if (targetPath) {
      navigate(targetPath);
    }
  };

  return (
    <div
      className="w-[360px] max-w-[90vw] rounded-lg border border-base-300 bg-base-100 p-3 shadow-xl"
      role="button"
      tabIndex={0}
      onClick={jumpToGroupChat}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          jumpToGroupChat();
        }
      }}
    >
      <div className="text-xs font-medium opacity-70 truncate">{roomName}</div>
      <div className="mt-2 flex items-center gap-3">
        <div className="avatar">
          <div className="w-9 rounded-full">
            {senderAvatar
              ? <img src={senderAvatar} alt={senderName} />
              : <div className="w-9 h-9 rounded-full bg-base-200" />}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">
            {senderName}
            <span className="opacity-70"> 在群聊中发来新消息</span>
          </div>
          <div className="text-xs opacity-70 truncate mt-0.5">{previewText}</div>
        </div>
      </div>
    </div>
  );
}

function getDirectMessagePreview(message: DirectMessageEvent): string {
  const content = (message?.content ?? "").trim();

  if (content.length > 0) {
    return content;
  }

  if (message?.messageType === MessageType.IMG) {
    return "[图片]";
  }
  if (message?.messageType === MessageType.FILE) {
    return "[文件]";
  }
  if (message?.messageType === MessageType.SOUND) {
    return "[音频]";
  }
  if (message?.messageType === MessageType.VIDEO) {
    return "[视频]";
  }
  return "[新消息]";
}

function getGroupMessagePreview(chatMessageResponse: ChatMessageResponse): string {
  const message = chatMessageResponse?.message;
  const content = (message?.content ?? "").trim();

  if (content.length > 0) {
    return content;
  }

  if (message?.messageType === MessageType.IMG) {
    return "[图片]";
  }
  if (message?.messageType === MessageType.FILE) {
    return "[文件]";
  }
  if (message?.messageType === MessageType.SOUND) {
    return "[音频]";
  }
  if (message?.messageType === MessageType.VIDEO) {
    return "[视频]";
  }
  if (message?.messageType === MessageType.DICE) {
    return "[骰子消息]";
  }
  if (message?.messageType === MessageType.EFFECT) {
    return "[特效消息]";
  }
  if (message?.messageType === MessageType.ROOM_JUMP) {
    return "[群聊跳转]";
  }
  return "[新消息]";
}

function getActivePrivateContactId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const match = window.location.pathname.match(/^\/chat\/private\/(\d+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getActiveGroupRoomId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const match = window.location.pathname.match(/^\/chat\/([^/]+)\/(\d+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  const spaceIdOrMode = match[1];
  if (spaceIdOrMode === "private") {
    return null;
  }

  const roomId = Number(match[2]);
  return Number.isFinite(roomId) && roomId > 0 ? roomId : null;
}

export function useWebSocket() {
  const globalContext = useGlobalContext();
  const readCurrentToken = useCallback(() => {
    if (typeof window === "undefined")
      return "";
    return (window.localStorage.getItem("token") || "").trim();
  }, []);

  const notifyNewFriendRequest = useCallback(async (event: NewFriendRequestPush) => {
    const friendReqId = event?.data?.friendReqId;
    const toastId = typeof friendReqId === "number" ? `friend-req-${friendReqId}` : "friend-req";

    try {
      // 优先拉取好友申请列表详情，拿到头像/昵称
      const res = await tuanchat.friendController.getFriendRequestPage({ pageNo: 1, pageSize: 50 });
      const list = res.data?.list ?? [];
      const req = Array.isArray(list)
        ? list.find(r => (typeof friendReqId === "number" ? r?.id === friendReqId : false))
        : undefined;

      const isReceived = (req?.type ?? "received") === "received";
      const userInfo = isReceived ? req?.fromUser : req?.toUser;
      const displayName = userInfo?.username
        || (isReceived ? (req?.fromId != null ? `用户${req.fromId}` : "某位用户") : (req?.toId != null ? `用户${req.toId}` : "某位用户"));
      const avatar = userInfo?.avatar;
      const verifyMsg = (req?.verifyMsg ?? event?.data?.verifyMsg ?? "").trim();

      toast.custom(
        t => (
          <div className={t.visible ? "animate-enter" : "animate-leave"}>
            <FriendRequestToastContent
              toastId={t.id}
              displayName={displayName}
              avatar={avatar}
              verifyMsg={verifyMsg}
            />
          </div>
        ),
        {
          id: toastId,
          position: "top-center",
          duration: 8000,
        },
      );
    }
    catch {
      // 拉取详情失败时，给一个单次兜底提示（避免“简易 + 详细”双弹窗）。
      toast("收到新的好友申请", {
        id: toastId,
        position: "top-center",
        duration: 6000,
      });
    }
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const isConnected = useCallback(() => wsRef.current?.readyState === WebSocket.OPEN, []);
  const isConnecting = useCallback(() => wsRef.current?.readyState === WebSocket.CONNECTING, []);
  const hasOpenedOnceRef = useRef(false);
  // 标记“组件主动关闭”（例如 React StrictMode 的 effect cleanup），避免误判为网络错误并触发重连/报错。
  const closingRef = useRef(false);
  const connectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const heartbeatTimer = useRef<NodeJS.Timeout>(setTimeout(() => {}));
  // 接受消息的存储
  const [receivedMessages, updateReceivedMessages] = useImmer<Record<number, ChatMessageResponse[]>>({});
  const [receivedDirectMessages, updateReceivedDirectMessages] = useImmer<Record<number, DirectMessageEvent[]>>({});

  const queryClient = useQueryClient();

  const cleanupRoomDescriptionDocOnDissolve = useCallback((roomId: number) => {
    if (typeof window === "undefined")
      return;

    const docId = `room:${roomId}:description`;

    // 优先从 roomInfo 缓存拿 spaceId（避免对所有 space 做 best-effort 删除）。
    const roomInfo = queryClient.getQueryData<ApiResultRoom>(["getRoomInfo", roomId]);
    const cachedSpaceId = roomInfo?.data?.spaceId;
    const spaceIdFromRoomInfo = (typeof cachedSpaceId === "number" && Number.isFinite(cachedSpaceId) && cachedSpaceId > 0)
      ? cachedSpaceId
      : null;

    void (async () => {
      try {
        const { deleteSpaceDoc } = await import("@/components/chat/infra/blocksuite/deleteSpaceDoc");

        if (spaceIdFromRoomInfo != null) {
          await deleteSpaceDoc({ spaceId: spaceIdFromRoomInfo, docId });
          return;
        }

        // roomInfo 缓存缺失时，best-effort：对当前缓存中出现过的 space 都尝试删除一次（不存在则 no-op）。
        const queries = queryClient.getQueriesData<ApiResultRoomListResponse>({ queryKey: ["getUserRooms"] });
        const spaceIds = new Set<number>();
        for (const [key] of queries) {
          const maybeSpaceId = Array.isArray(key) ? key[1] : null;
          const sid = typeof maybeSpaceId === "number" ? maybeSpaceId : Number(maybeSpaceId);
          if (Number.isFinite(sid) && sid > 0) {
            spaceIds.add(sid);
          }
        }

        await Promise.allSettled(Array.from(spaceIds).map(spaceId => deleteSpaceDoc({ spaceId, docId })));
      }
      catch {
        // ignore
      }
    })();
  }, [queryClient]);

  /**
   * 群聊的未读消息数
   */
  const roomSessions: MessageSessionResponse[] = useGetUserSessionsQuery().data?.data ?? EMPTY_SESSIONS;
  const { mutate: updateReadPosition1 } = useUpdateReadPosition1Mutation();
  const unreadMessagesNumber: Record<number, number> = useMemo(() => {
    return roomSessions.reduce((acc, session) => {
      // Keep 0 for rooms without messages so UI can treat them as subscribed.
      if (session.roomId != null) {
        const latestSyncId = session.latestSyncId ?? 0;
        const lastReadSyncId = session.lastReadSyncId ?? 0;
        acc[session.roomId] = Math.max(0, latestSyncId - lastReadSyncId);
      }
      return acc;
    }, {} as Record<number, number>);
  }, [roomSessions]);
  const updateLatestSyncId = useCallback((roomId: number, latestSyncId: number) => {
    queryClient.setQueriesData<ApiResultListMessageSessionResponse>({ queryKey: ["getUserSessions"] }, (oldData) => {
      if (!oldData?.data) return oldData;
      const nextData = oldData.data.map(session => {
        if (session.roomId === roomId) {
          const prevLatest = session.latestSyncId ?? 0;
          return {
            ...session,
            // 只在“已订阅会话”内推进 latestSyncId，避免把已取消提醒的房间重新加入未读体系。
            latestSyncId: Math.max(prevLatest, latestSyncId),
          };
        }
        return session;
      });

      return {
        ...oldData,
        data: nextData,
      };
    });
  }, [queryClient]);
  /**
   * 更新群聊的最后阅读的消息位置
   * @param roomId
   * @param lastReadSyncId
   */
  const updateLastReadSyncId = useCallback((roomId: number, lastReadSyncId?: number) => {
    // Reduce updates to avoid render loops.
    const oldData = queryClient.getQueryData<ApiResultListMessageSessionResponse>(["getUserSessions"]);
    if (!oldData?.data) return;
    const session = oldData.data.find(session => session.roomId === roomId);
    if (!session) return;

    // If lastReadSyncId is missing, fall back to latestSyncId.
    const targetReadySyncId = lastReadSyncId ?? session.latestSyncId ?? session.lastReadSyncId ?? 0;
    if (targetReadySyncId === (session.lastReadSyncId ?? 0))
      return;

    queryClient.setQueriesData<ApiResultListMessageSessionResponse>({ queryKey: ["getUserSessions"] }, (oldData) => {
      if (!oldData?.data) return;
      // Best-effort async update; ok if it occasionally misses.
      updateReadPosition1({
        roomId,
        syncId: targetReadySyncId,
      });
      return {
        ...oldData,
        data: oldData.data.map(session => {
          if (session.roomId === roomId) {
            return {
              ...session,
              lastReadSyncId: targetReadySyncId,
            };
          }
          return session;
        }),
      };
    });
  }, [queryClient, updateReadPosition1]);
  // 输入状态, 按照roomId进行分组
  const [chatStatus, updateChatStatus] = useImmer<Record<number, ChatStatus[]>>({});

  // Sa-Token tokenValue（不再是 userId）。注意：不要在这里固定读取，避免 token 变更后仍用旧值。
  // 配置参数
  const HEARTBEAT_INTERVAL = 25000;

  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // 这里代表“前端已显式实现处理逻辑”的 WS type（对应 onMessage 的 switch cases）。
  // 未在该列表中的 type，会在运行时第一次收到时通过 default 分支提示。
  const implementedWsTypes = useRef<Set<number>>(new Set([1, 4, 11, 12, 14, 15, 16, 17, 21, 22, 100]));
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
    // 连接前，先重置消息
    queryClient.resetQueries({ queryKey: ["getMsgPage"] });
    try {
      const wsUrl = currentToken ? `${WS_URL}?token=${encodeURIComponent(currentToken)}` : WS_URL;
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
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

      wsRef.current.onclose = (event) => {
        if (closingRef.current) {
          return;
        }
        console.log(`Close code: ${event.code}, Reason: ${event.reason}`);
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

        console.log(`WebSocket closed. Attempting to reconnect in ${delay / 1000} seconds.`);

        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
        }

        reconnectTimer.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      };
      wsRef.current.onmessage = (event) => {
        try {
          const message: WsMessage<any> = JSON.parse(event.data);
          trackWsMessage(message);
          onMessage(message);
        }
        catch (error) {
          console.error("Message parsing failed:", error);
        }
      };
      wsRef.current.onerror = (error) => {
        if (closingRef.current) {
          return;
        }
        console.error("WebSocket error:", error);
        wsRef.current?.close();
      };
    }
    catch (error) {
      console.error("Connection failed:", error);
    }
  }, []);

  const resolveSelfUserId = useCallback((fallbackUserId?: number) => {
    const uidRaw = (typeof window !== "undefined") ? window.localStorage.getItem("uid") : null;
    const uidFallback = uidRaw && !Number.isNaN(Number(uidRaw)) ? Number(uidRaw) : 0;
    const userIdFromContext = globalContext.userId ?? uidFallback;
    if (userIdFromContext > 0) {
      return userIdFromContext;
    }
    return (typeof fallbackUserId === "number" && fallbackUserId > 0) ? fallbackUserId : 0;
  }, [globalContext.userId]);

  const notifyNewDirectMessage = useCallback(async (message: DirectMessageEvent, selfUserId: number) => {
    if (message?.messageType === 10000) {
      return;
    }

    if (message?.senderId === selfUserId) {
      return;
    }

    const activePrivateContactId = getActivePrivateContactId();
    if (activePrivateContactId != null && activePrivateContactId === message.senderId) {
      return;
    }

    const toastId = `direct-msg-${message.messageId}`;
    let senderInfo = queryClient.getQueryData<ApiResultUserInfoResponse>(["getUserInfo", message.senderId])?.data;

    if (!senderInfo) {
      try {
        const userResp = await tuanchat.userController.getUserInfo(message.senderId);
        senderInfo = userResp.data;
        queryClient.setQueryData(["getUserInfo", message.senderId], userResp);
      }
      catch {
        // ignore
      }
    }

    const displayName = senderInfo?.username || `用户${message.senderId}`;
    const avatar = senderInfo?.avatar || senderInfo?.avatarThumbUrl;
    const previewText = getDirectMessagePreview(message);

    toast.custom(
      t => (
        <div className={t.visible ? "animate-enter" : "animate-leave"}>
          <DirectMessageToastContent
            toastId={t.id}
            senderId={message.senderId}
            displayName={displayName}
            avatar={avatar}
            previewText={previewText}
          />
        </div>
      ),
      {
        id: toastId,
        position: "top-center",
        duration: 6000,
      },
    );

    void showDesktopNotification({
      title: `${displayName} 给你发来私信`,
      body: previewText,
      icon: avatar,
      targetPath: `/chat/private/${message.senderId}`,
      tag: toastId,
    });
  }, [queryClient]);

  const notifyNewGroupMessage = useCallback(async (chatMessageResponse: ChatMessageResponse) => {
    const message = chatMessageResponse?.message;
    if (!message) {
      return;
    }

    if (!readGroupMessagePopupEnabledFromLocalStorage()) {
      return;
    }

    if (message.status !== 0) {
      return;
    }

    const selfUserId = resolveSelfUserId();
    if (selfUserId > 0 && message.userId === selfUserId) {
      return;
    }

    const activeGroupRoomId = getActiveGroupRoomId();
    if (activeGroupRoomId != null && activeGroupRoomId === message.roomId) {
      return;
    }

    const toastId = `group-msg-${message.messageId}`;
    let roomName = `群聊${message.roomId}`;
    let roomSpaceId: number | null = null;

    const cachedRoomInfo = queryClient.getQueryData<ApiResultRoom>(["getRoomInfo", message.roomId])?.data;
    if (cachedRoomInfo) {
      roomName = (cachedRoomInfo.name ?? "").trim() || roomName;
      if (typeof cachedRoomInfo.spaceId === "number" && cachedRoomInfo.spaceId > 0) {
        roomSpaceId = cachedRoomInfo.spaceId;
      }
    }

    if (roomSpaceId == null) {
      const roomListQueries = queryClient.getQueriesData<ApiResultRoomListResponse>({ queryKey: ["getUserRooms"] });
      for (const [, queryData] of roomListQueries) {
        const rooms = queryData?.data?.rooms;
        if (!Array.isArray(rooms)) {
          continue;
        }
        const matchedRoom = rooms.find(r => r?.roomId === message.roomId);
        if (!matchedRoom) {
          continue;
        }
        roomName = (matchedRoom.name ?? "").trim() || roomName;
        if (typeof matchedRoom.spaceId === "number" && matchedRoom.spaceId > 0) {
          roomSpaceId = matchedRoom.spaceId;
        }
        break;
      }
    }

    if (roomSpaceId == null) {
      try {
        const roomInfoResp = await tuanchat.roomController.getRoomInfo(message.roomId);
        const roomInfo = roomInfoResp.data;
        if (roomInfo) {
          queryClient.setQueryData(["getRoomInfo", message.roomId], roomInfoResp);
          roomName = (roomInfo.name ?? "").trim() || roomName;
          if (typeof roomInfo.spaceId === "number" && roomInfo.spaceId > 0) {
            roomSpaceId = roomInfo.spaceId;
          }
        }
      }
      catch {
        // ignore
      }
    }

    let senderInfo = queryClient.getQueryData<ApiResultUserInfoResponse>(["getUserInfo", message.userId])?.data;
    if (!senderInfo) {
      try {
        const userResp = await tuanchat.userController.getUserInfo(message.userId);
        senderInfo = userResp.data;
        queryClient.setQueryData(["getUserInfo", message.userId], userResp);
      }
      catch {
        // ignore
      }
    }

    const senderName = senderInfo?.username || `用户${message.userId}`;
    const senderAvatar = senderInfo?.avatar || senderInfo?.avatarThumbUrl;
    const previewText = getGroupMessagePreview(chatMessageResponse);
    const targetPath = roomSpaceId == null ? null : `/chat/${roomSpaceId}/${message.roomId}`;

    toast.custom(
      t => (
        <div className={t.visible ? "animate-enter" : "animate-leave"}>
          <GroupMessageToastContent
            toastId={t.id}
            targetPath={targetPath}
            roomName={roomName}
            senderName={senderName}
            senderAvatar={senderAvatar}
            previewText={previewText}
          />
        </div>
      ),
      {
        id: toastId,
        position: "top-center",
        duration: 7000,
      },
    );

    void showDesktopNotification({
      title: `${roomName} · ${senderName}`,
      body: previewText,
      icon: senderAvatar,
      targetPath,
      tag: toastId,
    });
  }, [queryClient, resolveSelfUserId]);

  /**
   * 对收到的消息，按照type进行分类处理
   */
  const onMessage = useCallback((message: WsMessage<any>) => {
    switch (message.type) {
      case 1:{  // 私聊新消息
        handleDirectChatMessage(message.data as DirectMessageEvent)
        break;
      }
      case 4:{ // 群聊新消息
        handleChatMessage(message.data as ChatMessageResponse);
        break;
      }
      case 11:{ // 成员变动
        const event = message as MemberChangePush;
        queryClient.invalidateQueries({ queryKey: ["getRoomMemberList",event.data.roomId] });
        // 如果是加入群组，要更新订阅信息，以及所有的房间信息
        if (event.data.changeType === 1){
          // getUserSessions 的 queryKey 只有 ['getUserSessions']，这里带 roomId 会导致无法命中缓存。
          queryClient.invalidateQueries({ queryKey: ['getUserSessions'] });
          queryClient.invalidateQueries({ queryKey: ['getRoomSession'] });
        }
        // 如果是加入或者退出群组，要更新所有的房间信息
        if (event.data.changeType === 1 || event.data.changeType === 2){
          // 延迟500ms，防止数据更新不及时
          setTimeout(()=>{
            queryClient.invalidateQueries({ queryKey: ["getUserSpaces"] });
            queryClient.invalidateQueries({ queryKey: ["getUserRooms"] });
          },500)
        }
        break;
      }
      case 12:{ // 角色变动
        const event = message as RoleChangePush
        queryClient.invalidateQueries({ queryKey: ["spaceRole"] });
        queryClient.invalidateQueries({ queryKey: ["roomRole",event.data.roomId] });
        break;
      }
      case 14:{ // 房间解散
        const event = message as RoomDismissPush;
        cleanupRoomDescriptionDocOnDissolve(event.data.roomId);
        queryClient.invalidateQueries({ queryKey: ["getUserSpaces"] });
        queryClient.invalidateQueries({ queryKey: ["getUserRooms"] });
        break;
      }
      case 15:{ // 房间extra变动
        const event = message.data as RoomExtraChangeEvent;
        queryClient.invalidateQueries({queryKey: ['getRoomExtra',event.roomId,event.key]});
        console.log("Room extra change:", event);
        break;
      }
        case 19:{ // 房间DND地图变动
          const event = message.data as RoomDndMapChangeEvent;
          queryClient.setQueryData(roomDndMapQueryKey(event.roomId), (prev) => {
            return applyRoomDndMapChange(prev as any, event);
          });
          break;
        }
      case 16: { // 房间禁言状态变动
        const { roomId } = message.data;
        queryClient.invalidateQueries({ queryKey: ['getRoomExtra', roomId] });
        queryClient.invalidateQueries({ queryKey: ['getRoomInfo', roomId] });
        break;
      }
      case 17: { // 成员的发言状态变动
        handleChatStatusChange(message.data as ChatStatusEvent)
        break;
      }
      case 21: { // 新的好友申请
        const event = message as NewFriendRequestPush;
        console.info("New friend request push:", event.data);
        // 当前前端可能尚未接入好友申请列表，这里先做“缓存刷新钩子”，未来接入后能自动生效。
        queryClient.invalidateQueries({ queryKey: ["friendReqPage"] });
        queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
        queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
        notifyNewFriendRequest(event);
        break;
      }
      case 22: { // 空间频道树变更
        const event = message as SpaceSidebarTreeUpdatedPush;
        const spaceId = event?.data?.spaceId;
        if (typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0) {
          queryClient.invalidateQueries({ queryKey: ["getSpaceSidebarTree", spaceId] });
        }
        break;
      }
      case 100: { // Token invalidated
        try {
          closingRef.current = true;
          wsRef.current?.close();
        }
        catch {
          // ignore
        }

        void recoverAuthTokenFromSession(import.meta.env.VITE_API_BASE_URL).then((recoveredToken) => {
          if (recoveredToken) {
            closingRef.current = false;
            reconnectAttempts.current = 0;
            connect();
            return;
          }
          handleUnauthorized({ source: "ws" });
        });
        break;
      }
      default: {
        const msgType = message.type;
        const firstTime = !unhandledWsTypes.current.has(msgType);
        unhandledWsTypes.current.add(msgType);
        if (firstTime) {
          console.warn(
            `[WS] Unhandled message type: ${msgType}. 已记录到 window.__TC_WS_DEBUG__，请补齐前端处理逻辑。`,
            message,
          );
        }
        syncWsDebugToWindow();
        break;
      }
    }
  }, []);

  /**
   * 处理群聊消息
   * @param chatMessageResponse
   */
  const handleChatMessage = async (chatMessageResponse: ChatMessageResponse) => {
    if (!(chatMessageResponse?.message.createTime) && chatMessageResponse != undefined) {
      chatMessageResponse.message.createTime = formatLocalDateTime(new Date());
    }
    if (chatMessageResponse != undefined && chatMessageResponse) {
      const roomId = chatMessageResponse.message.roomId;
      if (chatMessageResponse.message.status === 0) {
        updateLatestSyncId(roomId, chatMessageResponse.message.syncId)
      }

      let messagesToAdd: ChatMessageResponse[] = [];
      const currentMessages = receivedMessages[roomId] || [];
      // 检查syncId是否连续
      if (currentMessages.length > 0) {
        const lastSyncId = currentMessages[currentMessages.length - 1].message.syncId;
        if (chatMessageResponse.message.syncId - lastSyncId > 1) {
          // 直接获取所有syncId大于lastsSyncId的消息。
          const lostMessagesResponse = await tuanchat.chatController.getHistoryMessages({
            roomId,
            syncId: lastSyncId + 1
          });
          const lostMessages = lostMessagesResponse.data ?? [];
          messagesToAdd.push(...lostMessages);
        }
      }
      if (messagesToAdd.length === 0 || messagesToAdd[messagesToAdd.length-1].message.messageId !== chatMessageResponse.message.messageId){
        messagesToAdd.push(chatMessageResponse);
      }

      // --- 音频自动播放同步：在把消息写入本地缓存前先记录自动播放/停止事件 ---
      for (const msg of messagesToAdd) {
        const m = msg?.message;
        if (!m)
          continue;

        // (1) SOUND 自动播放：根据 purpose/标注/标签识别 bgm 或 se
        if (m.messageType === MessageType.SOUND) {
          const sound = (m.extra as any)?.soundMessage ?? (m.extra as any);
          const url = typeof sound?.url === "string" ? sound.url.trim() : "";
          if (url && typeof m.messageId === "number") {
            const rawPurpose = typeof sound?.purpose === "string"
              ? sound.purpose.trim().toLowerCase()
              : "";
            const annotations = Array.isArray(m.annotations) ? m.annotations : [];
            const hasBgmAnnotation = annotations.some(item => typeof item === "string" && item.toLowerCase() === "sys:bgm");
            const hasSeAnnotation = annotations.some(item => typeof item === "string" && item.toLowerCase() === "sys:se");
            const content = (m.content ?? "").toString();
            const purpose = rawPurpose === "bgm" || hasBgmAnnotation || content.includes("[播放BGM]")
              ? "bgm"
              : rawPurpose === "se" || hasSeAnnotation || content.includes("[播放音效]")
                ? "se"
                : undefined;
            if (purpose) {
              useAudioMessageAutoPlayStore.getState().enqueueFromWs({
                roomId: m.roomId,
                messageId: m.messageId,
                purpose,
              });
              if (purpose === "bgm") {
                void requestPlayBgmMessageWithUrl(m.roomId, m.messageId, url);
              }
            }
          }
        }

        // (2) KP 停止全员 BGM：SYSTEM 且内容包含停止指令
        if (m.messageType === MessageType.SYSTEM) {
          const content = (m.content ?? "").toString();
          if (
            content.includes("[ֹͣBGM]")
            || content.includes("[停止全员BGM]")
            || content.includes("[停止BGM]")
          ) {
            useAudioMessageAutoPlayStore.getState().markBgmStopFromWs(m.roomId);
          }
        }
      }

      updateReceivedMessages(draft => {
        if (draft[roomId]) {
          draft[roomId].push(...messagesToAdd);
        } else {
          draft[roomId] = messagesToAdd;
        }
      });
      // 更新发送用户的输入状态（设置为空闲，避免重复状态更新）
      const sendingUserId = chatMessageResponse.message.userId;
      if (sendingUserId) {
        // 使用延迟设置为空闲，避免与其他窗口的状态更新冲突
        setTimeout(() => {
          handleChatStatusChange({roomId, userId: sendingUserId, status:"idle"});
        }, 500); // 延迟500ms再设置为空闲
      }

      void notifyNewGroupMessage(chatMessageResponse);
    }
  };
  /**
   * 处理私聊消息
   */
  const handleDirectChatMessage = (message: DirectMessageEvent) => {
    const {receiverId, senderId} = message;
    // receivedDirectMessages 需要按“对端 contactId”分组。
    const selfUserId = resolveSelfUserId(message.userId);
    const channelId = selfUserId === senderId
      ? receiverId
      : (selfUserId === receiverId ? senderId : senderId);

    let isNewMessage = false;
    updateReceivedDirectMessages((draft)=>{
      // 去重，比如撤回操作就会出现相同消息id的情况。
      if (channelId in draft) {
        // 查找已存在消息的索引
        const existingIndex = draft[channelId].findIndex(
            msg => message.messageId === msg.messageId,
        );
        if (existingIndex !== -1) {
          // 更新已存在的消息
          draft[channelId][existingIndex] = message;
        }
        else {
          isNewMessage = true;
          draft[channelId].push(message);
        }
      }
      else {
        isNewMessage = true;
        draft[channelId] = [message];
      }
    });

    if (isNewMessage) {
      // 收件箱列表/私聊列表依赖 getInboxMessagePage，WS 来了也要让 Query 缓存同步，避免发送方必须刷新。
      queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
      queryClient.invalidateQueries({ queryKey: ["inboxMessageWithUser"] });

      // 好友申请同意后，发送方需要立刻看到好友列表/申请列表变化。
      if ((message?.content ?? "").trim() === "好友申请同意") {
        queryClient.invalidateQueries({ queryKey: ["friendList"] });
        queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
        queryClient.invalidateQueries({ queryKey: ["friendCheck"] });
      }

      if (message.senderId !== selfUserId) {
        void notifyNewDirectMessage(message, selfUserId);
      }
    }
  };
  /**
   * 处理群聊成员状态变动
   */
  const handleChatStatusChange = useCallback((chatStatusEvent: ChatStatusEvent) => {
    const {roomId, userId, status} = chatStatusEvent
    updateChatStatus(draft => {
      if (!draft[roomId]) draft[roomId] = [];
      const userIndex = draft[roomId].findIndex(u => u.userId === userId);
      if (status === "idle") { // Idle -> remove
        if (userIndex !== -1) draft[roomId].splice(userIndex, 1);
      } else {
        if (userIndex !== -1) draft[roomId][userIndex].status = status;
        else draft[roomId].push({ userId, status });
      }
    });
  }, [updateChatStatus]);
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

  /**
   * 发送消息给后端
   * @param request 要发送的对象
   * 发送聊天消息到指定房间(type: 3)
   * 聊天状态控制 (type: 4)
   */
  const send = useCallback(async (request: WsMessage<any>) => {
    if (!readCurrentToken()) {
      return;
    }

    if (!isConnected()) {
      connect();
    }
    console.log("发送消息: ",request);
    for (let i = 0; i < 50; i++) {
      if (wsRef.current?.readyState === WebSocket.OPEN)
        break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify(request));
  }, [connect, isConnected, readCurrentToken]);

  const webSocketUtils: WebsocketUtils = useMemo(() => ({
    connect,
    send,
    isConnected,
    receivedMessages,
    receivedDirectMessages,
    unreadMessagesNumber,
    updateLastReadSyncId,
    chatStatus,
    updateChatStatus: handleChatStatusChange,
  }), [
    connect,
    send,
    isConnected,
    receivedMessages,
    receivedDirectMessages,
    unreadMessagesNumber,
    updateLastReadSyncId,
    chatStatus,
    handleChatStatusChange,
  ]);
  return webSocketUtils;
}

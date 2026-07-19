import type { QueryClient } from "@tanstack/react-query";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MutableRefObject } from "react";

import {
  replaceDirectOptimisticMessageInCache,
  upsertDirectInboxQueryData,
} from "@tuanchat/query/direct-message";
import { useCallback } from "react";

import { resolveAudioAutoPlayPurposeFromAnnotationTransition } from "@/components/chat/infra/audioMessage/audioMessageAutoPlayPolicy";
import { triggerAudioAutoPlay } from "@/components/chat/infra/audioMessage/audioMessageAutoPlayRuntime";
import { loadChatHistoryDb } from "@/components/chat/infra/localDb/chatHistoryDbLoader";
import { emitRoomMessagesReceived } from "@/components/chat/infra/localDb/roomMessageEvents";
import { applyRoomDndMapChange, roomDndMapQueryKey } from "@/components/chat/shared/map/roomDndMapApi";
import { useAudioMessageAutoPlayStore } from "@/components/chat/stores/audioMessageAutoPlayStore";
import { FEEDBACK_ISSUE_TARGET_TYPE } from "@/components/feedback/feedbackTypes";
import { getSoundMessageExtra } from "@/types/messageExtra";
import { handleUnauthorized } from "@/utils/auth/unauthorized";
import { mediaFileUrl } from "@/utils/media/mediaUrl";

import type { ChatStatus, OptimisticDirectMessagePending, WsMessage } from "./webSocketRuntimeTypes";
import type {
  ChatStatusEvent,
  DirectMessageEvent,
  FriendRequestAcceptedPush,
  MemberChangePush,
  NewFriendRequestPush,
  RoleChangePush,
  RoomDismissPush,
  RoomDndMapChangeEvent,
  RoomExtraChangeEvent,
  SpaceSidebarTreeUpdatedPush,
  UserNotificationPush,
} from "./wsModels";

import { recoverAuthTokenFromSession } from "./authRecovery";
import { FEEDBACK_ISSUES_QUERY_KEY, feedbackIssueDetailQueryKey } from "./feedbackQueryCache";
import { buildCommentPageQueryPrefix } from "./hooks/commentQueryHooks";
import { spaceSidebarTreeQueryKey } from "./hooks/spaceSidebarTreeHooks";
import { prependNotificationToCaches } from "./notificationQueryCache";
import { invalidateMemberChangeQueries, invalidateRoleChangeQueries } from "./wsInvalidation";
import { MessageType } from "./wsModels";

const WS_HANDLER_DEBUG_LOG_ENABLED = import.meta.env.DEV;
const GROUP_MESSAGE_PUSH_TYPE = 4;
const GROUP_MESSAGE_BATCH_PUSH_TYPE = 25;

type ImmerUpdater<T> = (recipe: (draft: T) => void) => void;

type UseWebSocketMessageHandlersOptions = {
  queryClient: QueryClient;
  wsRef: MutableRefObject<WebSocket | null>;
  closingRef: MutableRefObject<boolean>;
  reconnectAttempts: MutableRefObject<number>;
  optimisticDirectMessageRequestMapRef: MutableRefObject<Map<number, OptimisticDirectMessagePending>>;
  unhandledWsTypes: MutableRefObject<Set<number>>;
  connect: () => void;
  cleanupRoomDescriptionDocOnDissolve: (roomId: number) => void;
  notifyNewDirectMessage: (message: DirectMessageEvent, selfUserId: number) => Promise<void>;
  notifyNewFriendRequest: (event: NewFriendRequestPush) => Promise<void>;
  notifyNewGroupMessage: (message: ChatMessageResponse) => Promise<void>;
  notifyNewUserNotification: (notification: UserNotificationPush["data"]) => Promise<void>;
  resolveSelfUserId: (fallbackUserId?: number) => number;
  syncWsDebugToWindow: () => void;
  updateChatStatus: ImmerUpdater<Record<number, ChatStatus[]>>;
  updateLatestSyncId: (roomId: number, latestSyncId: number) => void;
};

function normalizeExtraForMatch(extra: unknown): string {
  try {
    return JSON.stringify(extra ?? {});
  }
  catch {
    return "{}";
  }
}

function isChatMessageResponse(value: unknown): value is ChatMessageResponse {
  return !!(value as ChatMessageResponse | undefined)?.message;
}

function toDirectInboxMessage(message: DirectMessageEvent): MessageDirectResponse {
  return {
    messageId: message.messageId,
    userId: message.userId,
    syncId: message.syncId,
    senderId: message.senderId,
    senderUsername: message.senderUsername,
    senderAvatarFileId: message.senderAvatarFileId,
    senderAvatarMediaType: message.senderAvatarMediaType,
    receiverId: message.receiverId,
    receiverUsername: message.receiverUsername,
    receiverAvatarFileId: message.receiverAvatarFileId,
    receiverAvatarMediaType: message.receiverAvatarMediaType,
    content: message.content,
    messageType: message.messageType,
    replyMessageId: message.replyMessageId,
    status: message.status,
    extra: message.extra,
    createTime: message.createTime,
  } as MessageDirectResponse;
}

function upsertDirectMessageIntoInboxCache(
  queryClient: QueryClient,
  selfUserId: number,
  inboxMessage: MessageDirectResponse,
  optimisticMessageId?: number | null,
): void {
  if (!Number.isFinite(selfUserId) || selfUserId <= 0) {
    return;
  }

  if (typeof optimisticMessageId === "number") {
    replaceDirectOptimisticMessageInCache(queryClient, selfUserId, optimisticMessageId, inboxMessage);
    return;
  }

  upsertDirectInboxQueryData(queryClient, selfUserId, [inboxMessage]);
}

async function triggerRoomSoundAutoPlayFromWs(chatMessageResponse: ChatMessageResponse): Promise<void> {
  const message = chatMessageResponse.message;
  if (message.messageType !== MessageType.SOUND) {
    return;
  }

  const sound = getSoundMessageExtra(message.extra);
  const source = sound?.source;
  const url = source?.kind === "external"
    ? source.url
    : mediaFileUrl(source?.fileId, "audio", "high");
  if (!url || typeof message.messageId !== "number") {
    return;
  }

  let previousMessage: ChatMessageResponse["message"] | undefined;
  try {
    const db = await loadChatHistoryDb();
    previousMessage = (await db.getMessageById(message.messageId))?.message;
  }
  catch (error) {
    console.error("[WS] Failed to read previous room sound message:", error);
  }

  const purpose = resolveAudioAutoPlayPurposeFromAnnotationTransition(previousMessage, message);
  if (!purpose) {
    return;
  }

  triggerAudioAutoPlay({
    source: "ws",
    roomId: message.roomId,
    messageId: message.messageId,
    purpose,
    url,
  });
}

export function parseRoomMessagePushPayload(type: number, data: unknown): ChatMessageResponse[] {
  if (type === GROUP_MESSAGE_PUSH_TYPE) {
    return isChatMessageResponse(data) ? [data] : [];
  }
  if (type !== GROUP_MESSAGE_BATCH_PUSH_TYPE || !Array.isArray(data)) {
    return [];
  }
  return data.filter(isChatMessageResponse);
}

export function useWebSocketMessageHandlers({
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
}: UseWebSocketMessageHandlersOptions) {
  const handleChatStatusChange = useCallback((chatStatusEvent: ChatStatusEvent) => {
    const { roomId, userId, status } = chatStatusEvent;
    updateChatStatus((draft) => {
      if (!draft[roomId])
        draft[roomId] = [];
      const userIndex = draft[roomId].findIndex(u => u.userId === userId);
      if (status.type === "idle") {
        for (let index = draft[roomId].length - 1; index >= 0; index--) {
          if (draft[roomId][index].userId === userId)
            draft[roomId].splice(index, 1);
        }
        return;
      }

      if (userIndex !== -1) {
        draft[roomId][userIndex].status = status;
        for (let index = draft[roomId].length - 1; index > userIndex; index--) {
          if (draft[roomId][index].userId === userId)
            draft[roomId].splice(index, 1);
        }
      }
      else {
        draft[roomId].push({ userId, status });
      }
    });
  }, [updateChatStatus]);

  const handleChatMessage = useCallback((chatMessageResponse: ChatMessageResponse) => {
    if (chatMessageResponse == undefined || !chatMessageResponse) {
      return;
    }

    const roomId = chatMessageResponse.message.roomId;
    if (
      typeof chatMessageResponse.message.syncId === "number"
      && Number.isFinite(chatMessageResponse.message.syncId)
      && chatMessageResponse.message.syncId > 0
    ) {
      updateLatestSyncId(roomId, chatMessageResponse.message.syncId);
    }

    const message = chatMessageResponse.message;
    void triggerRoomSoundAutoPlayFromWs(chatMessageResponse);

    if (message.messageType === MessageType.SYSTEM) {
      const content = (message.content ?? "").toString();
      if (
        content.includes("[停止全员BGM]")
        || content.includes("[停止BGM]")
      ) {
        useAudioMessageAutoPlayStore.getState().markBgmStopFromWs(message.roomId);
      }
    }

    emitRoomMessagesReceived(roomId, [chatMessageResponse]);

    const sendingUserId = chatMessageResponse.message.userId;
    if (sendingUserId) {
      setTimeout(() => {
        handleChatStatusChange({
          roomId,
          userId: sendingUserId,
          status: { type: "idle", description: "空闲" },
        });
      }, 500);
    }

    void notifyNewGroupMessage(chatMessageResponse);
  }, [handleChatStatusChange, notifyNewGroupMessage, updateLatestSyncId]);

  const handleChatMessages = useCallback((chatMessageResponses: ChatMessageResponse[]) => {
    for (const chatMessageResponse of chatMessageResponses) {
      handleChatMessage(chatMessageResponse);
    }
  }, [handleChatMessage]);

  const handleDirectChatMessage = useCallback((message: DirectMessageEvent) => {
    const { receiverId, senderId } = message;
    const selfUserId = resolveSelfUserId(message.userId);
    const channelId = selfUserId === senderId
      ? receiverId
      : (selfUserId === receiverId ? senderId : senderId);

    const normalizedIncomingContent = message.content ?? "";
    const normalizedIncomingReplyId = message.replyMessageId ?? null;
    const normalizedIncomingExtra = normalizeExtraForMatch(message.extra);

    let matchedOptimisticMessageId: number | null = null;
    let matchedPendingWritePromise: Promise<void> | undefined;
    let matchedCreatedAt = Number.POSITIVE_INFINITY;
    if (message.senderId === selfUserId && channelId > 0) {
      for (const [optimisticMessageId, pending] of optimisticDirectMessageRequestMapRef.current.entries()) {
        const request = pending.request;
        if (pending.channelId !== channelId)
          continue;
        if (request.receiverId !== message.receiverId)
          continue;
        if (request.messageType !== message.messageType)
          continue;
        if ((request.replyMessageId ?? null) !== normalizedIncomingReplyId)
          continue;
        if ((request.content ?? "") !== normalizedIncomingContent)
          continue;
        if (normalizeExtraForMatch(request.extra) !== normalizedIncomingExtra)
          continue;
        if (pending.createdAt < matchedCreatedAt) {
          matchedOptimisticMessageId = optimisticMessageId;
          matchedCreatedAt = pending.createdAt;
        }
      }
    }

    if (matchedOptimisticMessageId !== null) {
      const pendingMessage = optimisticDirectMessageRequestMapRef.current.get(matchedOptimisticMessageId);
      if (pendingMessage) {
        clearTimeout(pendingMessage.cleanupTimer);
        matchedPendingWritePromise = pendingMessage.pendingWritePromise;
        optimisticDirectMessageRequestMapRef.current.delete(matchedOptimisticMessageId);
      }
    }

    const inboxMessage = toDirectInboxMessage(message);
    upsertDirectMessageIntoInboxCache(queryClient, selfUserId, inboxMessage, matchedOptimisticMessageId);
    if (selfUserId > 0) {
      void (matchedPendingWritePromise ?? Promise.resolve())
        .then(() => loadChatHistoryDb())
        .then((db) => {
          if (matchedOptimisticMessageId !== null) {
            return db.promotePendingDirectMessage(selfUserId, matchedOptimisticMessageId, inboxMessage);
          }
          return db.upsertCachedDirectMessages(selfUserId, [inboxMessage]);
        })
        .catch(error => console.warn("[WS] Failed to reconcile direct message in SQLite:", error));
    }
    queryClient.invalidateQueries({ queryKey: ["dmInbox"] });
    queryClient.invalidateQueries({ queryKey: ["directBadgeSummary"] });

    if ((message?.content ?? "").trim() === "好友申请同意") {
      queryClient.invalidateQueries({ queryKey: ["friendList"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
      queryClient.invalidateQueries({ queryKey: ["friendCheck"] });
    }

    if (message.senderId !== selfUserId) {
      void notifyNewDirectMessage(message, selfUserId);
    }
  }, [
    notifyNewDirectMessage,
    optimisticDirectMessageRequestMapRef,
    queryClient,
    resolveSelfUserId,
  ]);

  const onMessage = useCallback((message: WsMessage<unknown>) => {
    const wsMessageHandlers: Record<number, () => void> = {
      1: () => {
        handleDirectChatMessage(message.data as DirectMessageEvent);
      },
      2: () => {
        // 心跳响应只用于确认连接存活，不触发业务状态更新。
      },
      [GROUP_MESSAGE_PUSH_TYPE]: () => {
        handleChatMessages(parseRoomMessagePushPayload(message.type, message.data));
      },
      [GROUP_MESSAGE_BATCH_PUSH_TYPE]: () => {
        handleChatMessages(parseRoomMessagePushPayload(message.type, message.data));
      },
      11: () => {
        const event = message as MemberChangePush;
        invalidateMemberChangeQueries(queryClient, event.data);
        if (event.data.changeType === 1) {
          queryClient.invalidateQueries({ queryKey: ["getUserSessions"] });
          queryClient.invalidateQueries({ queryKey: ["getRoomSession"] });
        }
        if (event.data.changeType === 1 || event.data.changeType === 2) {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["getUserSpaces"] });
            queryClient.invalidateQueries({ queryKey: ["getUserActiveSpaces"] });
            queryClient.invalidateQueries({ queryKey: ["getUserRooms"] });
          }, 500);
        }
      },
      12: () => {
        const event = message as RoleChangePush;
        invalidateRoleChangeQueries(queryClient, event.data);
      },
      14: () => {
        const event = message as RoomDismissPush;
        cleanupRoomDescriptionDocOnDissolve(event.data.roomId);
        queryClient.invalidateQueries({ queryKey: ["getUserSpaces"] });
        queryClient.invalidateQueries({ queryKey: ["getUserActiveSpaces"] });
        queryClient.invalidateQueries({ queryKey: ["getUserRooms"] });
      },
      15: () => {
        const event = message.data as RoomExtraChangeEvent;
        queryClient.invalidateQueries({ queryKey: ["getRoomExtra", event.roomId, event.key] });
        if (WS_HANDLER_DEBUG_LOG_ENABLED) {
          console.info("Room extra change:", event);
        }
      },
      17: () => {
        handleChatStatusChange(message.data as ChatStatusEvent);
      },
      19: () => {
        const event = message.data as RoomDndMapChangeEvent;
        queryClient.setQueryData(roomDndMapQueryKey(event.roomId), (prev) => {
          return applyRoomDndMapChange(prev as any, event);
        });
      },
      21: () => {
        const event = message as NewFriendRequestPush;
        if (WS_HANDLER_DEBUG_LOG_ENABLED) {
          console.info("New friend request push:", event.data);
        }
        queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
        queryClient.invalidateQueries({ queryKey: ["directBadgeSummary"] });
        notifyNewFriendRequest(event);
      },
      22: () => {
        const event = message as SpaceSidebarTreeUpdatedPush;
        const spaceId = event?.data?.spaceId;
        if (typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0) {
          queryClient.invalidateQueries({ queryKey: spaceSidebarTreeQueryKey(spaceId) });
        }
      },
      23: () => {
        const event = message as UserNotificationPush;
        const notification = event?.data;
        if (!notification) {
          return;
        }
        prependNotificationToCaches(queryClient, notification);

        const feedbackIssueId = typeof notification.payload?.feedbackIssueId === "number"
          ? notification.payload.feedbackIssueId
          : (typeof notification.resourceId === "number" ? notification.resourceId : null);
        const hasCommentChange = typeof notification.payload?.commentId === "number";

        queryClient.invalidateQueries({ queryKey: FEEDBACK_ISSUES_QUERY_KEY });
        if (feedbackIssueId != null && feedbackIssueId > 0) {
          queryClient.invalidateQueries({ queryKey: feedbackIssueDetailQueryKey(feedbackIssueId) });
          if (hasCommentChange) {
            queryClient.invalidateQueries({
              queryKey: buildCommentPageQueryPrefix({
                targetId: feedbackIssueId,
                targetType: FEEDBACK_ISSUE_TARGET_TYPE,
              }),
            });
          }
        }

        void notifyNewUserNotification(notification);
      },
      24: () => {
        const event = message as FriendRequestAcceptedPush;
        if (WS_HANDLER_DEBUG_LOG_ENABLED) {
          console.info("Friend request accepted push:", event.data);
        }
        queryClient.invalidateQueries({ queryKey: ["friendList"] });
        queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
        queryClient.invalidateQueries({ queryKey: ["friendCheck"] });
        queryClient.invalidateQueries({ queryKey: ["directBadgeSummary"] });
      },
      100: () => {
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
      },
    };

    const handler = wsMessageHandlers[message.type];
    if (handler) {
      handler();
      return;
    }

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
  }, [
    cleanupRoomDescriptionDocOnDissolve,
    closingRef,
    connect,
    handleChatMessage,
    handleChatMessages,
    handleChatStatusChange,
    handleDirectChatMessage,
    notifyNewFriendRequest,
    notifyNewUserNotification,
    queryClient,
    reconnectAttempts,
    syncWsDebugToWindow,
    unhandledWsTypes,
    wsRef,
  ]);

  return {
    handleChatStatusChange,
    onMessage,
  };
}

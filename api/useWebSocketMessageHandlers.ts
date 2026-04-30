import type { QueryClient } from "@tanstack/react-query";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { MutableRefObject } from "react";
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

import { triggerAudioAutoPlay } from "@/components/chat/infra/audioMessage/audioMessageAutoPlayRuntime";
import { resolveAudioAutoPlayPurposeFromAnnotationTransition } from "@/components/chat/infra/audioMessage/audioMessageAutoPlayPolicy";
import { applyRoomDndMapChange, roomDndMapQueryKey } from "@/components/chat/shared/map/roomDndMapApi";
import { useAudioMessageAutoPlayStore } from "@/components/chat/stores/audioMessageAutoPlayStore";
import { FEEDBACK_ISSUE_TARGET_TYPE } from "@/components/feedback/feedbackTypes";
import { prependNotificationToCaches } from "@/components/notification/notificationHooks";
import { getSoundMessageExtra } from "@/types/messageExtra";
import { handleUnauthorized } from "@/utils/auth/unauthorized";
import { formatLocalDateTime } from "@/utils/dateUtil";
import { useCallback } from "react";
import { recoverAuthTokenFromSession } from "./authRecovery";
import { buildCommentPageQueryKey } from "./hooks/commentQueryHooks";
import { MessageType } from "./wsModels";
import { invalidateMemberChangeQueries, invalidateRoleChangeQueries } from "./wsInvalidation";

type ImmerUpdater<T> = (recipe: (draft: T) => void) => void;

type UseWebSocketMessageHandlersOptions = {
  queryClient: QueryClient;
  wsRef: MutableRefObject<WebSocket | null>;
  closingRef: MutableRefObject<boolean>;
  reconnectAttempts: MutableRefObject<number>;
  receivedMessagesRef: MutableRefObject<Record<number, ChatMessageResponse[]>>;
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
  updateReceivedDirectMessages: ImmerUpdater<Record<number, DirectMessageEvent[]>>;
  updateReceivedMessages: ImmerUpdater<Record<number, ChatMessageResponse[]>>;
};

const WS_MESSAGE_DEBUG_PREFIX = "[TC_WS_MSG]";

function normalizeExtraForMatch(extra: unknown): string {
  try {
    return JSON.stringify(extra ?? {});
  }
  catch {
    return "{}";
  }
}

export function useWebSocketMessageHandlers({
  queryClient,
  wsRef,
  closingRef,
  reconnectAttempts,
  receivedMessagesRef,
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
  updateReceivedDirectMessages,
  updateReceivedMessages,
}: UseWebSocketMessageHandlersOptions) {
  const handleChatStatusChange = useCallback((chatStatusEvent: ChatStatusEvent) => {
    const { roomId, userId, status } = chatStatusEvent;
    updateChatStatus((draft) => {
      if (!draft[roomId])
        draft[roomId] = [];
      const userIndex = draft[roomId].findIndex(u => u.userId === userId);
      if (status === "idle") {
        if (userIndex !== -1)
          draft[roomId].splice(userIndex, 1);
        return;
      }

      if (userIndex !== -1) {
        draft[roomId][userIndex].status = status;
      }
      else {
        draft[roomId].push({ userId, status });
      }
    });
  }, [updateChatStatus]);

  const handleChatMessage = useCallback((chatMessageResponse: ChatMessageResponse) => {
    if (!(chatMessageResponse?.message.createTime) && chatMessageResponse != undefined) {
      chatMessageResponse.message.createTime = formatLocalDateTime(new Date());
    }
    if (chatMessageResponse == undefined || !chatMessageResponse) {
      return;
    }

    const roomId = chatMessageResponse.message.roomId;
    console.log(WS_MESSAGE_DEBUG_PREFIX, "handleChatMessage.incoming", {
      roomId,
      messageId: chatMessageResponse.message.messageId,
      syncId: chatMessageResponse.message.syncId,
      position: chatMessageResponse.message.position ?? null,
      replyMessageId: chatMessageResponse.message.replyMessageId ?? null,
      messageType: chatMessageResponse.message.messageType,
    });
    if (chatMessageResponse.message.status === 0) {
      updateLatestSyncId(roomId, chatMessageResponse.message.syncId);
    }

    // WS 层只负责接收增量消息并去重；补洞统一由 useChatFrameMessages 处理。
    const messagesToAdd: ChatMessageResponse[] = [chatMessageResponse];
    const mergedRoomMessages = [...(receivedMessagesRef.current[roomId] ?? [])];
    let replacedCount = 0;
    let appendedCount = 0;

    for (const msg of messagesToAdd) {
      const m = msg?.message;
      if (!m)
        continue;
      const existedIndex = typeof m.messageId === "number"
        ? mergedRoomMessages.findIndex(item => item?.message?.messageId === m.messageId)
        : -1;
      const previousMessage = existedIndex >= 0 ? mergedRoomMessages[existedIndex]?.message : undefined;

      if (m.messageType === MessageType.SOUND) {
        const sound = getSoundMessageExtra(m.extra);
        const url = typeof sound?.url === "string" ? sound.url.trim() : "";
        if (url && typeof m.messageId === "number") {
          const purpose = resolveAudioAutoPlayPurposeFromAnnotationTransition(previousMessage, m);
          if (purpose) {
            triggerAudioAutoPlay({
              source: "ws",
              roomId: m.roomId,
              messageId: m.messageId,
              purpose,
              url,
            });
          }
        }
      }

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

      if (existedIndex >= 0) {
        mergedRoomMessages[existedIndex] = msg;
        replacedCount += 1;
      }
      else {
        mergedRoomMessages.push(msg);
        appendedCount += 1;
      }
    }

    receivedMessagesRef.current = {
      ...receivedMessagesRef.current,
      [roomId]: mergedRoomMessages,
    };

    updateReceivedMessages((draft) => {
      draft[roomId] = mergedRoomMessages;
      console.log(WS_MESSAGE_DEBUG_PREFIX, "handleChatMessage.afterMerge", {
        roomId,
        roomMessageLength: mergedRoomMessages.length,
        appendedCount,
        replacedCount,
        mergedMessageIds: messagesToAdd.map(item => item?.message?.messageId ?? null),
      });
    });

    const sendingUserId = chatMessageResponse.message.userId;
    if (sendingUserId) {
      setTimeout(() => {
        handleChatStatusChange({ roomId, userId: sendingUserId, status: "idle" });
      }, 500);
    }

    void notifyNewGroupMessage(chatMessageResponse);
  }, [handleChatStatusChange, notifyNewGroupMessage, receivedMessagesRef, updateLatestSyncId, updateReceivedMessages]);

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

    let isNewMessage = false;
    updateReceivedDirectMessages((draft) => {
      const channelMessages = draft[channelId] ?? [];
      if (!(channelId in draft)) {
        draft[channelId] = channelMessages;
      }

      if (matchedOptimisticMessageId !== null) {
        const optimisticIndex = channelMessages.findIndex(item => item.messageId === matchedOptimisticMessageId);
        if (optimisticIndex >= 0) {
          channelMessages.splice(optimisticIndex, 1);
        }
        optimisticDirectMessageRequestMapRef.current.delete(matchedOptimisticMessageId);
      }

      const existingIndex = channelMessages.findIndex(msg => message.messageId === msg.messageId);
      if (existingIndex !== -1) {
        channelMessages[existingIndex] = message;
      }
      else {
        isNewMessage = true;
        channelMessages.push(message);
      }
    });

    if (!isNewMessage) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["getInboxMessagePage"] });
    queryClient.invalidateQueries({ queryKey: ["inboxMessageWithUser"] });

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
    updateReceivedDirectMessages,
  ]);

  const onMessage = useCallback((message: WsMessage<unknown>) => {
    const wsMessageHandlers: Record<number, () => void> = {
      1: () => {
        handleDirectChatMessage(message.data as DirectMessageEvent);
      },
      4: () => {
        handleChatMessage(message.data as ChatMessageResponse);
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
        queryClient.invalidateQueries({ queryKey: ["getUserRooms"] });
      },
      15: () => {
        const event = message.data as RoomExtraChangeEvent;
        queryClient.invalidateQueries({ queryKey: ["getRoomExtra", event.roomId, event.key] });
        console.log("Room extra change:", event);
      },
      16: () => {
        const { roomId } = message.data as { roomId: number };
        queryClient.invalidateQueries({ queryKey: ["getRoomExtra", roomId] });
        queryClient.invalidateQueries({ queryKey: ["getRoomInfo", roomId] });
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
        console.info("New friend request push:", event.data);
        queryClient.invalidateQueries({ queryKey: ["friendReqPage"] });
        queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
        queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
        notifyNewFriendRequest(event);
      },
      22: () => {
        const event = message as SpaceSidebarTreeUpdatedPush;
        const spaceId = event?.data?.spaceId;
        if (typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0) {
          queryClient.invalidateQueries({ queryKey: ["getSpaceSidebarTree", spaceId] });
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

        queryClient.invalidateQueries({ queryKey: ["feedbackIssues"] });
        if (feedbackIssueId != null && feedbackIssueId > 0) {
          queryClient.invalidateQueries({ queryKey: ["feedbackIssueDetail", feedbackIssueId] });
          if (hasCommentChange) {
            queryClient.invalidateQueries({
              queryKey: buildCommentPageQueryKey({
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
        console.info("Friend request accepted push:", event.data);
        queryClient.invalidateQueries({ queryKey: ["friendList"] });
        queryClient.invalidateQueries({ queryKey: ["friendRequestPage"] });
        queryClient.invalidateQueries({ queryKey: ["friendCheck"] });
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

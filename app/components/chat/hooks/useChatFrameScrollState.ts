import type { MutableRefObject } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

import { useCallback, useEffect, useRef } from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/indexedDB/useChatHistory";

import type { ChatMessageResponse } from "../../../../api";

function getLatestHistoryMessageSyncId(historyMessages: ChatMessageResponse[]): number | null {
  const lastMessage = historyMessages[historyMessages.length - 1];
  const lastSyncId = typeof lastMessage?.message?.syncId === "number"
    ? lastMessage.message.syncId
    : null;
  return lastSyncId;
}

export function resolveReadSyncIdOnRoomExit(params: {
  enableUnreadIndicator: boolean;
  historyMessages: ChatMessageResponse[];
  isAtBottom: boolean;
  lastSyncedMessageSyncId: number | null;
}): number | null {
  const {
    enableUnreadIndicator,
    historyMessages,
    isAtBottom,
    lastSyncedMessageSyncId,
  } = params;

  if (!enableUnreadIndicator || !isAtBottom) {
    return null;
  }

  const latestHistorySyncId = getLatestHistoryMessageSyncId(historyMessages);
  if (latestHistorySyncId == null || latestHistorySyncId === lastSyncedMessageSyncId) {
    return null;
  }

  return latestHistorySyncId;
}

type UseChatFrameScrollStateParams = {
  enableUnreadIndicator: boolean;
  historyMessages: ChatMessageResponse[];
  roomId: number;
  chatHistory?: UseChatHistoryReturn;
  unreadMessagesNumber: Record<number, number>;
  updateLastReadSyncId: (roomId: number, lastReadSyncId?: number) => void;
  virtuosoRef: { current: VirtuosoHandle | null };
  messageIndexToVirtuosoIndex: (messageIndex: number) => number;
};

type UseChatFrameScrollStateResult = {
  isAtBottomRef: MutableRefObject<boolean>;
  isAtTopRef: MutableRefObject<boolean>;
  unreadMessageNumber: number;
  scrollToBottom: () => void;
};

export default function useChatFrameScrollState({
  enableUnreadIndicator,
  historyMessages,
  roomId,
  chatHistory,
  unreadMessagesNumber,
  updateLastReadSyncId,
  virtuosoRef,
  messageIndexToVirtuosoIndex,
}: UseChatFrameScrollStateParams): UseChatFrameScrollStateResult {
  const isAtBottomRef = useRef(true);
  const lastAutoSyncUnreadRef = useRef<number | null>(null);
  const lastSyncedMessageSyncIdRef = useRef<number | null>(null);
  const latestHistorySyncIdRef = useRef<number | null>(null);
  const isAtTopRef = useRef(false);

  const unreadMessageNumber = enableUnreadIndicator
    ? (unreadMessagesNumber[roomId] ?? 0)
    : 0;

  latestHistorySyncIdRef.current = getLatestHistoryMessageSyncId(historyMessages);

  useEffect(() => {
    if (!enableUnreadIndicator) {
      return;
    }
    if (isAtBottomRef.current) {
      const lastSyncId = latestHistorySyncIdRef.current;
      if (lastSyncId != null && lastSyncedMessageSyncIdRef.current === lastSyncId) {
        return;
      }
      lastSyncedMessageSyncIdRef.current = lastSyncId;
      updateLastReadSyncId(roomId);
    }
  }, [enableUnreadIndicator, historyMessages, roomId, updateLastReadSyncId]);

  useEffect(() => {
    if (!enableUnreadIndicator) {
      lastAutoSyncUnreadRef.current = null;
      return;
    }
    if (unreadMessageNumber <= 0) {
      lastAutoSyncUnreadRef.current = null;
      return;
    }
    if (!isAtBottomRef.current) {
      return;
    }
    if (lastAutoSyncUnreadRef.current === unreadMessageNumber) {
      return;
    }
    lastAutoSyncUnreadRef.current = unreadMessageNumber;
    updateLastReadSyncId(roomId);
  }, [enableUnreadIndicator, roomId, unreadMessageNumber, updateLastReadSyncId]);

  useEffect(() => {
    return () => {
      const syncIdToMarkRead = resolveReadSyncIdOnRoomExit({
        enableUnreadIndicator,
        historyMessages,
        isAtBottom: isAtBottomRef.current,
        lastSyncedMessageSyncId: lastSyncedMessageSyncIdRef.current,
      });
      if (syncIdToMarkRead == null) {
        return;
      }
      lastSyncedMessageSyncIdRef.current = syncIdToMarkRead;
      updateLastReadSyncId(roomId, syncIdToMarkRead);
    };
  }, [enableUnreadIndicator, historyMessages, roomId, updateLastReadSyncId]);

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex(messageIndexToVirtuosoIndex(historyMessages.length - 1));
    if (enableUnreadIndicator) {
      updateLastReadSyncId(roomId);
    }
  }, [
    enableUnreadIndicator,
    historyMessages.length,
    messageIndexToVirtuosoIndex,
    roomId,
    updateLastReadSyncId,
    virtuosoRef,
  ]);

  useEffect(() => {
    let timer = null;
    if (chatHistory?.loading) {
      timer = setTimeout(() => {
        scrollToBottom();
      }, 1000);
    }
    return () => {
      if (timer)
        clearTimeout(timer);
    };
  }, [chatHistory?.loading, scrollToBottom]);

  return {
    isAtBottomRef,
    isAtTopRef,
    unreadMessageNumber,
    scrollToBottom,
  };
}

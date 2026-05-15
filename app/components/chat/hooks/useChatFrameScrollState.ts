import type { MutableRefObject } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

import { useCallback, useEffect, useRef } from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/indexedDB/useChatHistory";

import type { ChatMessageResponse } from "../../../../api";

type UseChatFrameScrollStateParams = {
  enableUnreadIndicator: boolean;
  historyMessages: ChatMessageResponse[];
  roomId: number;
  chatHistory?: UseChatHistoryReturn;
  unreadMessagesNumber: Record<number, number>;
  updateLastReadSyncId: (roomId: number) => void;
  virtuosoRef: { current: VirtuosoHandle | null };
  messageIndexToVirtuosoIndex: (messageIndex: number) => number;
};

type UseChatFrameScrollStateResult = {
  isAtBottomRef: MutableRefObject<boolean>;
  isAtTopRef: MutableRefObject<boolean>;
  unreadMessageNumber: number;
  scrollToBottom: () => void;
};

type ResolveAutoScrollAfterLoadParams = {
  loading: boolean;
  hasAutoScrolledAfterLoad: boolean;
  isAtBottom: boolean;
};

/**
 * 仅在历史加载完成后的首个稳定时刻自动滚底一次，且前提是用户仍停留在底部。
 */
export function resolveShouldAutoScrollAfterHistoryLoad({
  loading,
  hasAutoScrolledAfterLoad,
  isAtBottom,
}: ResolveAutoScrollAfterLoadParams): boolean {
  if (loading) {
    return false;
  }
  if (hasAutoScrolledAfterLoad) {
    return false;
  }
  return isAtBottom;
}

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
  const isAtTopRef = useRef(false);
  const hasAutoScrolledAfterLoadRef = useRef(false);

  const unreadMessageNumber = enableUnreadIndicator
    ? (unreadMessagesNumber[roomId] ?? 0)
    : 0;

  useEffect(() => {
    if (!enableUnreadIndicator) {
      return;
    }
    if (isAtBottomRef.current) {
      const lastMessage = historyMessages[historyMessages.length - 1];
      const lastSyncId = typeof lastMessage?.message?.syncId === "number"
        ? lastMessage.message.syncId
        : null;
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
    if (chatHistory?.loading) {
      hasAutoScrolledAfterLoadRef.current = false;
      return;
    }
    if (!resolveShouldAutoScrollAfterHistoryLoad({
      loading: Boolean(chatHistory?.loading),
      hasAutoScrolledAfterLoad: hasAutoScrolledAfterLoadRef.current,
      isAtBottom: isAtBottomRef.current,
    })) {
      return;
    }
    hasAutoScrolledAfterLoadRef.current = true;
    scrollToBottom();
  }, [chatHistory?.loading, scrollToBottom]);

  return {
    isAtBottomRef,
    isAtTopRef,
    unreadMessageNumber,
    scrollToBottom,
  };
}

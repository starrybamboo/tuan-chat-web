import type { MutableRefObject } from "react";
import type { FlatIndexLocationWithAlign, VirtuosoHandle } from "react-virtuoso";

import { useCallback, useEffect, useRef } from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/localDb/useChatHistory";

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
  suppressInitialAutoScroll?: boolean;
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
  suppressAutoScroll?: boolean;
};

type RoomExitReadState = {
  enableUnreadIndicator: boolean;
  historyMessages: ChatMessageResponse[];
  updateLastReadSyncId: (roomId: number, lastReadSyncId?: number) => void;
};

function markRoomReadOnExit(params: {
  roomId: number;
  stateRef: MutableRefObject<RoomExitReadState>;
  isAtBottomRef: MutableRefObject<boolean>;
  lastSyncedMessageSyncIdRef: MutableRefObject<number | null>;
}): void {
  const state = params.stateRef.current;
  const syncIdToMarkRead = resolveReadSyncIdOnRoomExit({
    enableUnreadIndicator: state.enableUnreadIndicator,
    historyMessages: state.historyMessages,
    isAtBottom: params.isAtBottomRef.current,
    lastSyncedMessageSyncId: params.lastSyncedMessageSyncIdRef.current,
  });
  if (syncIdToMarkRead == null) {
    return;
  }
  params.lastSyncedMessageSyncIdRef.current = syncIdToMarkRead;
  state.updateLastReadSyncId(params.roomId, syncIdToMarkRead);
}

/**
 * 仅在历史加载完成后的首个稳定时刻自动滚底一次，且前提是用户仍停留在底部。
 */
export function resolveShouldAutoScrollAfterHistoryLoad({
  loading,
  hasAutoScrolledAfterLoad,
  isAtBottom,
  suppressAutoScroll = false,
}: ResolveAutoScrollAfterLoadParams): boolean {
  if (suppressAutoScroll) {
    return false;
  }
  if (loading) {
    return false;
  }
  if (hasAutoScrolledAfterLoad) {
    return false;
  }
  return isAtBottom;
}

export function resolveChatFrameScrollToBottomLocation(messageIndex: number): FlatIndexLocationWithAlign | number {
  if (messageIndex < 0) {
    return 0;
  }
  return {
    align: "end",
    behavior: "auto",
    index: messageIndex,
  };
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
  suppressInitialAutoScroll = false,
}: UseChatFrameScrollStateParams): UseChatFrameScrollStateResult {
  const isAtBottomRef = useRef(true);
  const lastAutoSyncUnreadRef = useRef<number | null>(null);
  const lastSyncedMessageSyncIdRef = useRef<number | null>(null);
  const latestHistorySyncIdRef = useRef<number | null>(null);
  const isAtTopRef = useRef(false);
  const hasAutoScrolledAfterLoadRef = useRef(false);
  // 退出清理只随房间切换；其余字段通过 ref 读取最后一次已提交状态，避免消息更新触发清理。
  const roomExitReadStateRef = useRef<RoomExitReadState>({
    enableUnreadIndicator,
    historyMessages,
    updateLastReadSyncId,
  });

  const unreadMessageNumber = enableUnreadIndicator
    ? (unreadMessagesNumber[roomId] ?? 0)
    : 0;

  useEffect(() => {
    latestHistorySyncIdRef.current = getLatestHistoryMessageSyncId(historyMessages);
  });

  useEffect(() => {
    roomExitReadStateRef.current = {
      enableUnreadIndicator,
      historyMessages,
      updateLastReadSyncId,
    };
  }, [enableUnreadIndicator, historyMessages, updateLastReadSyncId]);

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
      markRoomReadOnExit({
        roomId,
        stateRef: roomExitReadStateRef,
        isAtBottomRef,
        lastSyncedMessageSyncIdRef,
      });
    };
  }, [roomId]);

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex(
      resolveChatFrameScrollToBottomLocation(messageIndexToVirtuosoIndex(historyMessages.length - 1)),
    );
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
      suppressAutoScroll: suppressInitialAutoScroll,
    })) {
      return;
    }
    hasAutoScrolledAfterLoadRef.current = true;
    scrollToBottom();
  }, [chatHistory?.loading, scrollToBottom, suppressInitialAutoScroll]);

  return {
    isAtBottomRef,
    isAtTopRef,
    unreadMessageNumber,
    scrollToBottom,
  };
}

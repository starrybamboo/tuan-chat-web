import type { VirtuosoHandle } from "react-virtuoso";

import { useCallback, useEffect, useRef } from "react";

import type { ChatMessageResponse } from "../../../../api";

type UseRoomMessageScrollParams = {
  targetMessageId?: number | null;
  historyMessages: ChatMessageResponse[];
  mainHistoryMessages: ChatMessageResponse[];
  isHistoryLoading?: boolean;
  virtuosoRef: React.RefObject<VirtuosoHandle>;
};

type UseRoomMessageScrollResult = {
  scrollToGivenMessage: (messageId: number) => void;
};

export default function useRoomMessageScroll({
  targetMessageId,
  historyMessages,
  mainHistoryMessages,
  isHistoryLoading,
  virtuosoRef,
}: UseRoomMessageScrollParams): UseRoomMessageScrollResult {
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasScrolledToTargetRef = useRef(false);

  const scrollToGivenMessage = useCallback((messageId: number) => {
    const messageIndex = mainHistoryMessages.findIndex(m => m.message.messageId === messageId);
    if (messageIndex >= 0) {
      virtuosoRef.current?.scrollToIndex(messageIndex);
    }
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.classList.add("highlight-animation");
        messageElement.addEventListener("animationend", () => {
          messageElement.classList.remove("highlight-animation");
        }, { once: true });
      }
    }, 50);
  }, [mainHistoryMessages, virtuosoRef]);

  useEffect(() => {
    if (targetMessageId && historyMessages.length > 0 && !isHistoryLoading && !hasScrolledToTargetRef.current) {
      const messageExists = historyMessages.some(m => m.message.messageId === targetMessageId);
      if (messageExists) {
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
        }
        delayTimerRef.current = setTimeout(() => {
          scrollToGivenMessage(targetMessageId);
          delayTimerRef.current = null;
        }, 100);
        hasScrolledToTargetRef.current = true;
      }
    }
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };
  }, [targetMessageId, historyMessages, isHistoryLoading, scrollToGivenMessage]);

  return { scrollToGivenMessage };
}

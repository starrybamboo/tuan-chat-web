import { useCallback } from "react";

const CHAT_VIRTUOSO_INDEX_SHIFTER = 100000;

export default function useChatFrameIndexing(historyLength: number) {
  const virtuosoIndexToMessageIndex = useCallback((virtuosoIndex: number) => {
    return virtuosoIndex;
  }, []);

  const messageIndexToVirtuosoIndex = useCallback((messageIndex: number) => {
    return messageIndex - historyLength + CHAT_VIRTUOSO_INDEX_SHIFTER;
  }, [historyLength]);

  return {
    virtuosoIndexToMessageIndex,
    messageIndexToVirtuosoIndex,
  };
}

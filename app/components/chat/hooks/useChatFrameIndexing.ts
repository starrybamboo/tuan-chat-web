import { useCallback } from "react";

export function resolveChatFrameMessageIndexFromVirtuosoIndex(virtuosoIndex: number): number {
  return virtuosoIndex;
}

export function resolveChatFrameVirtuosoIndexFromMessageIndex(messageIndex: number): number {
  return messageIndex;
}

export default function useChatFrameIndexing() {
  const virtuosoIndexToMessageIndex = useCallback((virtuosoIndex: number) => {
    return resolveChatFrameMessageIndexFromVirtuosoIndex(virtuosoIndex);
  }, []);

  const messageIndexToVirtuosoIndex = useCallback((messageIndex: number) => {
    // ChatFrameList 当前使用 firstItemIndex=0，滚动目标必须留在当前数据长度的 0 基坐标内。
    return resolveChatFrameVirtuosoIndexFromMessageIndex(messageIndex);
  }, []);

  return {
    virtuosoIndexToMessageIndex,
    messageIndexToVirtuosoIndex,
  };
}

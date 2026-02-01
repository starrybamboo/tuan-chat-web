import type { MouseEvent } from "react";

import { useCallback } from "react";

type UseChatFrameMessageClickParams = {
  isSelecting: boolean;
  toggleMessageSelection: (messageId: number) => void;
  onJumpToWebGAL?: (messageId: number) => void;
};

function hasSelectionInContainer(container: HTMLElement) {
  if (typeof window === "undefined")
    return false;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false;
  }
  for (let i = 0; i < selection.rangeCount; i += 1) {
    const range = selection.getRangeAt(i);
    if (range.intersectsNode(container)) {
      return true;
    }
  }
  return false;
}

export default function useChatFrameMessageClick({
  isSelecting,
  toggleMessageSelection,
  onJumpToWebGAL,
}: UseChatFrameMessageClickParams) {
  return useCallback((e: MouseEvent<HTMLElement>, messageId: number) => {
    const container = e.currentTarget as HTMLElement;
    if (hasSelectionInContainer(container)) {
      return;
    }

    const target = e.target as HTMLElement;
    const isButtonClick = target.closest("button") || target.closest("[role=\"button\"]") || target.closest(".btn");

    if (isSelecting || e.ctrlKey) {
      toggleMessageSelection(messageId);
      return;
    }

    if (onJumpToWebGAL && !isButtonClick) {
      onJumpToWebGAL(messageId);
    }
  }, [isSelecting, onJumpToWebGAL, toggleMessageSelection]);
}

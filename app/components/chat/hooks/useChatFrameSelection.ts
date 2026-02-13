import { useCallback, useState } from "react";

import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";

type UseChatFrameSelectionParams = {
  onDeleteMessage: (messageId: number) => void;
};

export default function useChatFrameSelection({ onDeleteMessage }: UseChatFrameSelectionParams) {
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(() => new Set());
  const isMultiSelecting = useRoomUiStore(state => state.isMultiSelecting);
  const setMultiSelecting = useRoomUiStore(state => state.setMultiSelecting);
  const isSelecting = isMultiSelecting || selectedMessageIds.size > 0;

  const updateSelectedMessageIds = useCallback((next: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    setSelectedMessageIds((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (resolved.size > 0) {
        setMultiSelecting(true);
      }
      return resolved;
    });
  }, [setMultiSelecting]);

  const toggleMessageSelection = useCallback((messageId: number) => {
    updateSelectedMessageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      }
      else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, [updateSelectedMessageIds]);

  const enterSelection = useCallback(() => {
    setMultiSelecting(true);
  }, [setMultiSelecting]);

  const exitSelection = useCallback(() => {
    setMultiSelecting(false);
    updateSelectedMessageIds(new Set());
  }, [setMultiSelecting, updateSelectedMessageIds]);

  const handleBatchDelete = useCallback(() => {
    for (const messageId of selectedMessageIds) {
      onDeleteMessage(messageId);
    }
    exitSelection();
  }, [exitSelection, onDeleteMessage, selectedMessageIds]);

  const handleEditMessage = useCallback((messageId: number) => {
    const target = document.querySelector(
      `[data-message-id="${messageId}"] .editable-field`,
    ) as HTMLElement;
    target.dispatchEvent(new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: target.offsetLeft + target.offsetWidth / 2,
      clientY: target.offsetTop + target.offsetHeight / 2,
    }));
  }, []);

  return {
    selectedMessageIds,
    updateSelectedMessageIds,
    isSelecting,
    enterSelection,
    exitSelection,
    toggleMessageSelection,
    handleBatchDelete,
    handleEditMessage,
  };
}

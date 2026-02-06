import { useCallback, useState } from "react";

type UseChatFrameSelectionParams = {
  onDeleteMessage: (messageId: number) => void;
};

export default function useChatFrameSelection({ onDeleteMessage }: UseChatFrameSelectionParams) {
  const [selectedMessageIds, updateSelectedMessageIds] = useState<Set<number>>(() => new Set());
  const isSelecting = selectedMessageIds.size > 0;

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
  }, []);

  const handleBatchDelete = useCallback(() => {
    for (const messageId of selectedMessageIds) {
      onDeleteMessage(messageId);
    }
    updateSelectedMessageIds(new Set());
  }, [onDeleteMessage, selectedMessageIds]);

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
    toggleMessageSelection,
    handleBatchDelete,
    handleEditMessage,
  };
}

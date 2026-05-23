import { useCallback } from "react";

import type { Message } from "../../../../api";

type UseChatFrameSelectionHandlersParams = {
  contextMenuMessageId?: number;
  deleteMessage: (messageId: number) => void;
  deleteMessages: (messageIds: number[]) => void;
  selectedMessageIds: Set<number>;
  exitSelection: () => void;
  closeContextMenu: () => void;
  toggleUseChatBubbleStyle: () => void;
  setReplyMessage: (message: Message) => void;
};

type UseChatFrameSelectionHandlersResult = {
  clearSelection: () => void;
  handleDelete: () => void;
  handleReply: (message: Message) => void;
  toggleChatBubbleStyle: () => void;
};

export default function useChatFrameSelectionHandlers({
  contextMenuMessageId,
  deleteMessage,
  deleteMessages,
  selectedMessageIds,
  exitSelection,
  closeContextMenu,
  toggleUseChatBubbleStyle,
  setReplyMessage,
}: UseChatFrameSelectionHandlersParams): UseChatFrameSelectionHandlersResult {
  const clearSelection = useCallback(() => {
    exitSelection();
  }, [exitSelection]);

  const handleDelete = useCallback(() => {
    const targetMessageId = contextMenuMessageId ?? -1;
    const selectedIds = Array.from(selectedMessageIds)
      .filter(messageId => Number.isFinite(messageId) && messageId > 0);
    if (targetMessageId > 0 && selectedMessageIds.has(targetMessageId) && selectedIds.length > 1) {
      deleteMessages(selectedIds);
      exitSelection();
      return;
    }

    deleteMessage(contextMenuMessageId ?? -1);
    if (targetMessageId > 0 && selectedMessageIds.has(targetMessageId)) {
      exitSelection();
    }
  }, [contextMenuMessageId, deleteMessage, deleteMessages, exitSelection, selectedMessageIds]);

  const toggleChatBubbleStyle = useCallback(() => {
    toggleUseChatBubbleStyle();
    closeContextMenu();
  }, [closeContextMenu, toggleUseChatBubbleStyle]);

  const handleReply = useCallback((message: Message) => {
    setReplyMessage(message);
  }, [setReplyMessage]);

  return {
    clearSelection,
    handleDelete,
    handleReply,
    toggleChatBubbleStyle,
  };
}

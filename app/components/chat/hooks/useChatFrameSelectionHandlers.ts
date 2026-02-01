import { useCallback } from "react";

import type { Message } from "../../../../api";

type UseChatFrameSelectionHandlersParams = {
  contextMenuMessageId?: number;
  deleteMessage: (messageId: number) => void;
  updateSelectedMessageIds: (next: Set<number>) => void;
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
  updateSelectedMessageIds,
  closeContextMenu,
  toggleUseChatBubbleStyle,
  setReplyMessage,
}: UseChatFrameSelectionHandlersParams): UseChatFrameSelectionHandlersResult {
  const clearSelection = useCallback(() => {
    updateSelectedMessageIds(new Set());
  }, [updateSelectedMessageIds]);

  const handleDelete = useCallback(() => {
    deleteMessage(contextMenuMessageId ?? -1);
  }, [contextMenuMessageId, deleteMessage]);

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

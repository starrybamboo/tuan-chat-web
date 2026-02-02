import useChatFrameContextMenu from "@/components/chat/hooks/useChatFrameContextMenu";
import useChatFrameMessageClick from "@/components/chat/hooks/useChatFrameMessageClick";
import useChatFrameSelection from "@/components/chat/hooks/useChatFrameSelection";
import useChatFrameSelectionHandlers from "@/components/chat/hooks/useChatFrameSelectionHandlers";

import type { Message } from "../../../api";

type UseChatFrameSelectionContextParams = {
  deleteMessage: (messageId: number) => void;
  toggleUseChatBubbleStyle: () => void;
  setReplyMessage: (message: Message) => void;
  onJumpToWebGAL?: (messageId: number) => void;
};

export default function useChatFrameSelectionContext({
  deleteMessage,
  toggleUseChatBubbleStyle,
  setReplyMessage,
  onJumpToWebGAL,
}: UseChatFrameSelectionContextParams) {
  const selection = useChatFrameSelection({ onDeleteMessage: deleteMessage });
  const { contextMenu, closeContextMenu, handleContextMenu } = useChatFrameContextMenu();

  const {
    clearSelection,
    handleDelete,
    handleReply,
    toggleChatBubbleStyle,
  } = useChatFrameSelectionHandlers({
    contextMenuMessageId: contextMenu?.messageId,
    deleteMessage,
    updateSelectedMessageIds: selection.updateSelectedMessageIds,
    closeContextMenu,
    toggleUseChatBubbleStyle,
    setReplyMessage,
  });

  const handleMessageClick = useChatFrameMessageClick({
    isSelecting: selection.isSelecting,
    toggleMessageSelection: selection.toggleMessageSelection,
    onJumpToWebGAL,
  });

  return {
    ...selection,
    contextMenu,
    closeContextMenu,
    handleContextMenu,
    clearSelection,
    handleDelete,
    handleReply,
    toggleChatBubbleStyle,
    handleMessageClick,
  };
}

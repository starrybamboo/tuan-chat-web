import useChatFrameContextMenu from "@/components/chat/hooks/useChatFrameContextMenu";
import useChatFrameMessageClick from "@/components/chat/hooks/useChatFrameMessageClick";
import useChatFrameSelection from "@/components/chat/hooks/useChatFrameSelection";
import useChatFrameSelectionHandlers from "@/components/chat/hooks/useChatFrameSelectionHandlers";

import type { Message } from "../../../../api";

type UseChatFrameSelectionContextParams = {
  deleteMessage: (messageId: number) => void;
  toggleUseChatBubbleStyle: () => void;
  setReplyMessage: (message: Message) => void;
  orderedMessageIds: number[];
  onJumpToWebGAL?: (messageId: number) => void;
};

export default function useChatFrameSelectionContext({
  deleteMessage,
  toggleUseChatBubbleStyle,
  setReplyMessage,
  orderedMessageIds,
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
    exitSelection: selection.exitSelection,
    closeContextMenu,
    toggleUseChatBubbleStyle,
    setReplyMessage,
  });

  const handleMessageClick = useChatFrameMessageClick({
    isSelecting: selection.isSelecting,
    toggleMessageSelection: selection.toggleMessageSelection,
    selectMessageRange: selection.selectMessageRange,
    orderedMessageIds,
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

import type { ChatMessageResponse } from "../../../api";

import type { ThreadHintMeta } from "@/components/chat/hooks/useChatFrameMessages";

import React from "react";
import { ChatBubble } from "@/components/chat/message/chatBubble";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { DraggableIcon } from "@/icons";

interface ChatFrameMessageItemProps {
  chatMessageResponse: ChatMessageResponse;
  isSelected: boolean;
  isDragging: boolean;
  canJumpToWebGAL: boolean;
  movable: boolean;
  isSelecting: boolean;
  threadHintMeta?: ThreadHintMeta;
  onExecuteCommandRequest?: (payload: {
    command: string;
    threadId?: number;
    requestMessageId: number;
  }) => void;
  onOpenThread?: (threadRootMessageId: number) => void;
  onEditWebgalChoose?: (messageId: number) => void;
  onMessageClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onToggleSelection?: (messageId: number) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.DragEvent<HTMLDivElement>) => void;
}

export default function ChatFrameMessageItem({
  chatMessageResponse,
  isSelected,
  isDragging,
  canJumpToWebGAL,
  movable,
  isSelecting,
  threadHintMeta,
  onExecuteCommandRequest,
  onOpenThread,
  onEditWebgalChoose,
  onMessageClick,
  onToggleSelection,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
}: ChatFrameMessageItemProps) {
  const useChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);

  return (
    <div
      className={`
        pl-6 relative group transition-opacity ${isSelected ? "bg-info-content/40" : ""} ${isDragging ? "pointer-events-auto" : ""} ${canJumpToWebGAL ? "cursor-pointer hover:bg-base-200/50" : ""}`}
      data-message-id={chatMessageResponse.message.messageId}
      onClick={onMessageClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      draggable={isSelecting && movable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {movable && (
        <div
          className={`absolute left-0 ${useChatBubbleStyle ? "top-[12px]" : "top-[30px]"}
                      opacity-0 transition-opacity flex items-center pr-2 cursor-move
                      group-hover:opacity-100 z-100`}
          draggable={movable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <DraggableIcon className="size-6"></DraggableIcon>
        </div>
      )}
      <ChatBubble
        chatMessageResponse={chatMessageResponse}
        threadHintMeta={threadHintMeta}
        onExecuteCommandRequest={onExecuteCommandRequest}
        onOpenThread={onOpenThread}
        onToggleSelection={onToggleSelection}
        onEditWebgalChoose={onEditWebgalChoose}
      />
    </div>
  );
}

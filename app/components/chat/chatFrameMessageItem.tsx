import type { ChatMessageResponse } from "../../../api";

import type { ThreadHintMeta } from "@/components/chat/hooks/useChatFrameMessages";

import React, { useCallback } from "react";
import { ChatBubble } from "@/components/chat/message/chatBubble";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { DraggableIcon, PlusOutline } from "@/icons";

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
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const isInsertTarget = useRoomUiStore(state => state.insertAfterMessageId === chatMessageResponse.message.messageId);

  const handleInsertAfterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setInsertAfterMessageId(chatMessageResponse.message.messageId);
  }, [chatMessageResponse.message.messageId, setInsertAfterMessageId]);

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
      {!isSelecting && (
        <div className="relative h-4 -mt-2 -ml-6 group/insert select-none">
          <button
            type="button"
            className="absolute inset-x-0 -inset-y-2 z-20 w-full cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            title="在此处插入消息"
            aria-label="在此处插入消息"
            onClick={handleInsertAfterClick}
          />
          <div
            className={`pointer-events-none absolute left-6 right-0 top-1/2 -translate-y-1/2 h-[2px] transition-colors duration-300 ${
              isInsertTarget ? "bg-primary" : "bg-transparent group-hover:bg-base-content/5 group-hover/insert:bg-primary"
            }`}
          />
          <button
            type="button"
            className={`absolute left-0 top-1/2 z-30 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
              isInsertTarget
                ? "bg-transparent text-primary shadow-none opacity-100 scale-100 hover:bg-base-100 hover:shadow-sm"
                : "bg-transparent text-base-content/20 shadow-none opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 hover:bg-base-100 hover:text-primary hover:shadow-sm"
            }`}
            tabIndex={-1}
            onClick={handleInsertAfterClick}
          >
            <PlusOutline className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

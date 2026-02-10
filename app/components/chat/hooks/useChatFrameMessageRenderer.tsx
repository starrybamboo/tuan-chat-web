import type { MouseEvent } from "react";
import type { ChatMessageResponse, Message } from "../../../../api";
import type { ThreadHintMeta } from "@/components/chat/hooks/useChatFrameMessages";
import React, { useCallback } from "react";

import ChatFrameMessageItem from "@/components/chat/chatFrameMessageItem";

interface UseChatFrameMessageRendererParams {
  selectedMessageIds: Set<number>;
  isDragging: boolean;
  isSelecting: boolean;
  baseDraggable: boolean;
  canJumpToWebGAL: boolean;
  isMessageMovable?: (message: Message) => boolean;
  threadHintMetaByMessageId: Map<number, ThreadHintMeta>;
  onExecuteCommandRequest?: (payload: {
    command: string;
    threadId?: number;
    requestMessageId: number;
  }) => void;
  onEditWebgalChoose?: (messageId: number) => void;
  onMessageClick: (event: MouseEvent<HTMLElement>, messageId: number) => void;
  onToggleSelection?: (messageId: number) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, indexInHistoryMessages: number) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, indexInHistoryMessages: number) => void;
  onDragEnd: (event: React.DragEvent<HTMLDivElement>) => void;
  virtuosoIndexToMessageIndex: (virtuosoIndex: number) => number;
}

export default function useChatFrameMessageRenderer({
  selectedMessageIds,
  isDragging,
  isSelecting,
  baseDraggable,
  canJumpToWebGAL,
  isMessageMovable,
  threadHintMetaByMessageId,
  onExecuteCommandRequest,
  onEditWebgalChoose,
  onMessageClick,
  onToggleSelection,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  virtuosoIndexToMessageIndex,
}: UseChatFrameMessageRendererParams) {
  return useCallback((index: number, chatMessageResponse: ChatMessageResponse) => {
    const messageId = chatMessageResponse.message.messageId;
    const isSelected = selectedMessageIds.has(messageId);
    const movable = baseDraggable && (!isMessageMovable || isMessageMovable(chatMessageResponse.message));
    const indexInHistoryMessages = virtuosoIndexToMessageIndex(index);
    const threadHintMeta = threadHintMetaByMessageId.get(messageId);

    return (
      <ChatFrameMessageItem
        key={messageId}
        chatMessageResponse={chatMessageResponse}
        isSelected={isSelected}
        isDragging={isDragging}
        canJumpToWebGAL={canJumpToWebGAL}
        movable={movable}
        isSelecting={isSelecting}
        threadHintMeta={threadHintMeta}
        onExecuteCommandRequest={onExecuteCommandRequest}
        onEditWebgalChoose={onEditWebgalChoose}
        onToggleSelection={onToggleSelection}
        onMessageClick={event => onMessageClick(event, messageId)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={event => onDrop(event, indexInHistoryMessages)}
        onDragStart={event => onDragStart(event, indexInHistoryMessages)}
        onDragEnd={onDragEnd}
      />
    );
  }, [
    baseDraggable,
    canJumpToWebGAL,
    isDragging,
    isMessageMovable,
    isSelecting,
    onDragEnd,
    onDragLeave,
    onDragOver,
    onDragStart,
    onDrop,
    onEditWebgalChoose,
    onExecuteCommandRequest,
    onMessageClick,
    onToggleSelection,
    selectedMessageIds,
    threadHintMetaByMessageId,
    virtuosoIndexToMessageIndex,
  ]);
}

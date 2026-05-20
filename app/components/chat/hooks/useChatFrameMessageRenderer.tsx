import type { MouseEvent } from "react";
import type { ChatMessageResponse, Message } from "../../../../api";
import React, { useCallback } from "react";

import ChatFrameMessageItem from "@/components/chat/chatFrameMessageItem";

interface UseChatFrameMessageRendererParams {
  selectedMessageIds: Set<number>;
  isDragging: boolean;
  isSelecting: boolean;
  baseDraggable: boolean;
  canJumpToWebGAL: boolean;
  getBaseVersionMessage?: (message: ChatMessageResponse) => ChatMessageResponse | null;
  showFullMessageDiff?: boolean;
  showAddedMessageDiff?: boolean;
  getMessageAction?: (message: ChatMessageResponse) => React.ReactNode;
  disableInsertAction?: boolean;
  isMessageMovable?: (message: Message) => boolean;
  onExecuteCommandRequest?: (payload: {
    command: string;
    threadId?: number;
    requestMessageId: number;
  }) => void;
  isCommandRequestConsumed?: (requestMessageId: number) => boolean;
  onEditWebgalChoose?: (messageId: number) => void;
  onMessageClick: (event: MouseEvent<HTMLElement>, messageId: number) => void;
  onToggleSelection?: (messageId: number) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, indexInHistoryMessages: number) => void;
  onDragStart: (event: React.DragEvent<HTMLElement>, indexInHistoryMessages: number) => void;
  onDragEnd: () => void;
  virtuosoIndexToMessageIndex: (virtuosoIndex: number) => number;
  webgalModeEntryAnimation?: {
    token: number;
    startIndex: number;
    endIndex: number;
  } | null;
}

export default function useChatFrameMessageRenderer({
  selectedMessageIds,
  isDragging,
  isSelecting,
  baseDraggable,
  canJumpToWebGAL,
  getBaseVersionMessage,
  showFullMessageDiff = false,
  showAddedMessageDiff = true,
  getMessageAction,
  disableInsertAction = false,
  isMessageMovable,
  onExecuteCommandRequest,
  isCommandRequestConsumed,
  onEditWebgalChoose,
  onMessageClick,
  onToggleSelection,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  virtuosoIndexToMessageIndex,
  webgalModeEntryAnimation,
}: UseChatFrameMessageRendererParams) {
  return useCallback((index: number, chatMessageResponse: ChatMessageResponse) => {
    const messageId = chatMessageResponse.message.messageId;
    const isSelected = selectedMessageIds.has(messageId);
    const movable = baseDraggable && (!isMessageMovable || isMessageMovable(chatMessageResponse.message));
    const indexInHistoryMessages = virtuosoIndexToMessageIndex(index);
    const webgalModeEntryAnimationDelayMs = webgalModeEntryAnimation
      && index >= webgalModeEntryAnimation.startIndex
      && index <= webgalModeEntryAnimation.endIndex
      ? Math.min((index - webgalModeEntryAnimation.startIndex) * 25, 160)
      : undefined;
    const webgalModeEntryAnimationOffsetPx = webgalModeEntryAnimationDelayMs === undefined
      ? undefined
      : 6;

    return (
      <ChatFrameMessageItem
        key={messageId}
        chatMessageResponse={chatMessageResponse}
        isSelected={isSelected}
        isDragging={isDragging}
        canJumpToWebGAL={canJumpToWebGAL}
        movable={movable}
        isSelecting={isSelecting}
        onExecuteCommandRequest={onExecuteCommandRequest}
        isCommandRequestConsumed={isCommandRequestConsumed}
        onEditWebgalChoose={onEditWebgalChoose}
        baseVersionMessage={getBaseVersionMessage?.(chatMessageResponse) ?? null}
        showFullMessageDiff={showFullMessageDiff}
        showAddedMessageDiff={showAddedMessageDiff}
        messageAction={getMessageAction?.(chatMessageResponse) ?? null}
        disableInsertAction={disableInsertAction}
        onToggleSelection={onToggleSelection}
        onMessageClick={event => onMessageClick(event, messageId)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={event => onDrop(event, indexInHistoryMessages)}
        onDragStart={event => onDragStart(event, indexInHistoryMessages)}
        onDragEnd={onDragEnd}
        webgalModeEntryAnimationDelayMs={webgalModeEntryAnimationDelayMs}
        webgalModeEntryAnimationOffsetPx={webgalModeEntryAnimationOffsetPx}
      />
    );
  }, [
    baseDraggable,
    canJumpToWebGAL,
    getBaseVersionMessage,
    getMessageAction,
    disableInsertAction,
    showAddedMessageDiff,
    showFullMessageDiff,
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
    isCommandRequestConsumed,
    onMessageClick,
    onToggleSelection,
    selectedMessageIds,
    virtuosoIndexToMessageIndex,
    webgalModeEntryAnimation,
  ]);
}

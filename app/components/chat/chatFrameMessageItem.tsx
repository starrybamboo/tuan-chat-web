import type { CSSProperties } from "react";
import type { ChatMessageResponse } from "../../../api";

import { isOptimisticRoomMessage } from "@tuanchat/query/room-message-lifecycle";
import React, { useCallback } from "react";
import { ChatBubble } from "@/components/chat/message/chatBubble";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { DraggableIcon, PlusOutline } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

const MESSAGE_DRAG_GUTTER_CLASS = "pl-6 sm:pl-7";
const MESSAGE_DRAG_HANDLE_CLASS = [
  "absolute left-0 z-[100] flex size-6 items-center justify-center rounded-md",
  "cursor-grab text-base-content/35 transition-all duration-150 active:cursor-grabbing",
  "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
  "hover:bg-base-300/70 hover:text-base-content/70",
].join(" ");

export function getChatFrameMessageItemClassName(params: {
  canJumpToWebGAL: boolean;
  isDragging: boolean;
  isSelected: boolean;
  messageSendStateClass: string;
  shouldPlayWebgalModeEntryAnimation: boolean;
  showDragHandle: boolean;
}): string {
  const {
    canJumpToWebGAL,
    isDragging,
    isSelected,
    messageSendStateClass,
    shouldPlayWebgalModeEntryAnimation,
    showDragHandle,
  } = params;

  return [
    showDragHandle ? MESSAGE_DRAG_GUTTER_CLASS : "",
    messageSendStateClass,
    shouldPlayWebgalModeEntryAnimation ? "webgal-mode-message-entry" : "",
    "relative group transition-opacity",
    isSelected ? "bg-info-content/40 hover:bg-info-content/40" : "",
    isDragging ? "pointer-events-auto" : "",
    canJumpToWebGAL ? `cursor-pointer ${isSelected ? "" : "hover:bg-base-200/50"}` : "",
  ].filter(Boolean).join(" ");
}

interface ChatFrameMessageItemProps {
  chatMessageResponse: ChatMessageResponse;
  isSelected: boolean;
  isDragging: boolean;
  canJumpToWebGAL: boolean;
  movable: boolean;
  isSelecting: boolean;
  baseVersionMessage?: ChatMessageResponse | null;
  showFullMessageDiff?: boolean;
  showAddedMessageDiff?: boolean;
  messageAction?: React.ReactNode;
  disableInsertAction?: boolean;
  onExecuteCommandRequest?: (payload: {
    command: string;
    requestMessageId: number;
  }) => void;
  isCommandRequestConsumed?: (requestMessageId: number) => boolean;
  onEditWebgalChoose?: (messageId: number) => void;
  onMessageClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onToggleSelection?: (messageId: number) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  webgalModeEntryAnimationDelayMs?: number;
  webgalModeEntryAnimationOffsetPx?: number;
}

export default function ChatFrameMessageItem({
  chatMessageResponse,
  isSelected,
  isDragging,
  canJumpToWebGAL,
  movable,
  isSelecting,
  baseVersionMessage,
  showFullMessageDiff,
  showAddedMessageDiff,
  messageAction,
  disableInsertAction = false,
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
  webgalModeEntryAnimationDelayMs,
  webgalModeEntryAnimationOffsetPx,
}: ChatFrameMessageItemProps) {
  const useChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const isInsertTarget = useRoomUiStore(state => state.insertAfterMessageId === chatMessageResponse.message.messageId);
  const showDragHandle = movable && chatMessageResponse.message.messageType !== MESSAGE_TYPE.STATE_EVENT;
  const isOptimisticMessage = isOptimisticRoomMessage(chatMessageResponse.message);
  const messageSendStateClass = isOptimisticMessage
    ? "message-sending"
    : "message-sent";
  const shouldPlayWebgalModeEntryAnimation = typeof webgalModeEntryAnimationDelayMs === "number";
  const webgalModeEntryAnimationStyle = shouldPlayWebgalModeEntryAnimation
    ? ({
        "--webgal-mode-message-entry-delay": `${webgalModeEntryAnimationDelayMs}ms`,
        "--webgal-mode-message-entry-y": `${webgalModeEntryAnimationOffsetPx ?? 8}px`,
      } as CSSProperties)
    : undefined;

  const handleInsertAfterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setInsertAfterMessageId(chatMessageResponse.message.messageId);
  }, [chatMessageResponse.message.messageId, setInsertAfterMessageId]);

  return (
    <div
      className={getChatFrameMessageItemClassName({
        canJumpToWebGAL,
        isDragging,
        isSelected,
        messageSendStateClass,
        shouldPlayWebgalModeEntryAnimation,
        showDragHandle,
      })}
      style={webgalModeEntryAnimationStyle}
      data-message-id={chatMessageResponse.message.messageId}
      onClick={onMessageClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      draggable={isSelecting && movable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {showDragHandle && (
        <button
          type="button"
          className={`${MESSAGE_DRAG_HANDLE_CLASS} ${useChatBubbleStyle ? "top-[12px]" : "top-[30px]"} ${isDragging ? "!opacity-100" : ""}`}
          draggable={movable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="拖动消息，可拖到 AI 对话作为上下文"
          aria-label="拖动消息"
          data-message-drag-handle="true"
        >
          <DraggableIcon className="size-4" />
        </button>
      )}
      <ChatBubble
        chatMessageResponse={chatMessageResponse}
        onExecuteCommandRequest={onExecuteCommandRequest}
        isCommandRequestConsumed={isCommandRequestConsumed}
        onToggleSelection={onToggleSelection}
        onEditWebgalChoose={onEditWebgalChoose}
        baseVersionMessage={baseVersionMessage}
        showFullMessageDiff={showFullMessageDiff}
        showAddedMessageDiff={showAddedMessageDiff}
        messageAction={messageAction}
      />
      {!disableInsertAction && (
        <div
          className={`relative h-4 -mt-2 select-none ${isSelecting ? "pointer-events-none" : "group/insert"}`}
          data-message-insert-action="true"
          aria-hidden={isSelecting}
        >
          {!isSelecting && !isOptimisticMessage && (
            <button
              type="button"
              className="absolute inset-0 z-20 cursor-pointer w-full"
              title="插入消息"
              aria-label="插入消息"
              onClick={handleInsertAfterClick}
            />
          )}
          <div
            className={`pointer-events-none absolute left-6 right-0 top-1/2 -translate-y-1/2 h-[2px] transition-colors duration-200 ${
              isSelecting || isOptimisticMessage
                ? "bg-transparent"
                : isInsertTarget
                  ? "bg-primary"
                  : "bg-transparent group-hover/insert:bg-primary/50"
            }`}
          />
          {!isSelecting && !isOptimisticMessage && (
            <span
              className={`pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 h-6 w-6 rounded border bg-base-100 flex items-center justify-center transition-all duration-200 ${
                isInsertTarget
                  ? "border-primary text-primary shadow-sm opacity-100 scale-100"
                  : "border-base-content/20 text-base-content/40 shadow-none opacity-0 scale-90 group-hover/insert:opacity-100 group-hover/insert:scale-100 group-hover/insert:border-primary/50 group-hover/insert:text-primary"
              }`}
              aria-hidden="true"
            >
              <PlusOutline className="h-4 w-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

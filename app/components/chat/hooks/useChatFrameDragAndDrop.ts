import type { VirtuosoHandle } from "react-virtuoso";

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

import { computeMoveMessageUpdates } from "@/components/chat/hooks/chatFrameDragUtils";
import useChatFrameDragAutoScroll from "@/components/chat/hooks/useChatFrameDragAutoScroll";
import useChatFrameDragIndicator from "@/components/chat/hooks/useChatFrameDragIndicator";
import {
  getChatMessageDragData,
  isChatMessageDrag,
  setChatMessageDragData,
} from "@/components/chat/utils/chatMessageDrag";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";

import type { ChatMessageResponse, Message } from "../../../../api";

type UseChatFrameDragAndDropParams = {
  historyMessages: ChatMessageResponse[];
  roomId: number;
  isMessageMovable?: (message: Message) => boolean;
  updateMessage: (message: Message) => void;
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  isSelecting: boolean;
  selectedMessageIds: Set<number>;
};

type UseChatFrameDragAndDropResult = {
  isDragging: boolean;
  scrollerRef: React.MutableRefObject<HTMLElement | null>;
  handleMoveMessages: (targetIndex: number, messageIds: number[]) => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, dragEndIndex: number) => Promise<void>;
  handleDragEnd: () => void;
};

function resolveLocalMoveMessageIds({
  anchorMessageId,
  isSelecting,
  selectedMessageIds,
}: {
  anchorMessageId: number;
  isSelecting: boolean;
  selectedMessageIds: Set<number>;
}): number[] {
  return isSelecting && selectedMessageIds.size > 0
    ? Array.from(selectedMessageIds)
    : [anchorMessageId];
}

const MESSAGE_DRAG_GHOST_SELECTOR = "[data-message-drag-ghost=\"true\"]";

function cleanupMessageDragGhost() {
  document.querySelectorAll(MESSAGE_DRAG_GHOST_SELECTOR).forEach(element => element.remove());
}

function removeDragOnlyControls(ghost: HTMLElement) {
  ghost.querySelectorAll("[data-message-drag-handle=\"true\"], [data-message-insert-action=\"true\"]")
    .forEach(element => element.remove());
}

function setMessageDragImage(e: React.DragEvent<HTMLDivElement>, messageCount: number) {
  const sourceElement = e.currentTarget.closest<HTMLElement>("[data-message-id]");
  if (!sourceElement) {
    return;
  }

  cleanupMessageDragGhost();

  const sourceRect = sourceElement.getBoundingClientRect();
  const ghost = sourceElement.cloneNode(true) as HTMLElement;
  const ghostWidth = Math.min(520, Math.max(260, sourceRect.width));
  ghost.dataset.messageDragGhost = "true";
  ghost.setAttribute("aria-hidden", "true");
  removeDragOnlyControls(ghost);

  Object.assign(ghost.style, {
    position: "fixed",
    top: "-10000px",
    left: "-10000px",
    width: `${ghostWidth}px`,
    maxHeight: "320px",
    overflow: "hidden",
    pointerEvents: "none",
    opacity: "0.78",
    transform: "scale(0.96)",
    transformOrigin: "top left",
    filter: "drop-shadow(0 18px 28px rgba(0, 0, 0, 0.34))",
    zIndex: "2147483647",
  });

  if (messageCount > 1) {
    const countBadge = document.createElement("div");
    countBadge.textContent = `${messageCount} 条`;
    Object.assign(countBadge.style, {
      position: "absolute",
      top: "4px",
      right: "4px",
      padding: "2px 6px",
      borderRadius: "999px",
      background: "rgba(15, 23, 42, 0.82)",
      color: "white",
      fontSize: "11px",
      lineHeight: "16px",
      fontWeight: "600",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28)",
    });
    ghost.appendChild(countBadge);
  }

  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, Math.min(24, ghostWidth / 2), 18);
  window.setTimeout(() => ghost.remove(), 0);
}

export default function useChatFrameDragAndDrop({
  historyMessages,
  roomId,
  isMessageMovable,
  updateMessage,
  virtuosoRef,
  isSelecting,
  selectedMessageIds,
}: UseChatFrameDragAndDropParams): UseChatFrameDragAndDropResult {
  const dragStartMessageIdRef = useRef(-1);
  const [isDragging, setIsDragging] = useState(false);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const { cleanupDragIndicator, dropPositionRef, scheduleCheckPosition } = useChatFrameDragIndicator({
    dragStartMessageIdRef,
  });
  const {
    attachWindowDragOver,
    detachWindowDragOver,
    startAutoScroll,
    stopAutoScroll,
    updateAutoScroll,
  } = useChatFrameDragAutoScroll({
    dragStartMessageIdRef,
    scrollerRef,
    virtuosoRef,
  });

  const cleanupDragState = useCallback(() => {
    stopAutoScroll();
    cleanupDragIndicator();
  }, [cleanupDragIndicator, stopAutoScroll]);

  const resetMessageDragState = useCallback(() => {
    dragStartMessageIdRef.current = -1;
    setIsDragging(false);
    detachWindowDragOver();
    cleanupDragState();
  }, [cleanupDragState, detachWindowDragOver]);

  const handleMoveMessages = useCallback((
    targetIndex: number,
    messageIds: number[],
  ) => {
    const { updatedMessages, hasUnmovable } = computeMoveMessageUpdates({
      historyMessages,
      isMessageMovable,
      messageIds,
      targetIndex,
    });

    if (hasUnmovable) {
      toast.error("部分消息不支持移动");
    }
    if (updatedMessages.length === 0) {
      return;
    }
    for (const nextMessage of updatedMessages) {
      updateMessage(nextMessage);
    }
  }, [historyMessages, isMessageMovable, updateMessage]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    const anchorMessageId = historyMessages[index]?.message.messageId;
    if (typeof anchorMessageId !== "number") {
      return;
    }
    const messageIds = resolveLocalMoveMessageIds({
      anchorMessageId,
      isSelecting,
      selectedMessageIds,
    });

    e.stopPropagation();
    e.dataTransfer.effectAllowed = "copyMove";
    setChatMessageDragData(e.dataTransfer, {
      kind: "chat-message",
      sourceRoomId: roomId,
      messageIds,
      anchorMessageId,
      effect: "move",
    });
    dragStartMessageIdRef.current = anchorMessageId;
    setIsDragging(true);
    attachWindowDragOver();
    setMessageDragImage(e, messageIds.length);
  }, [attachWindowDragOver, historyMessages, isSelecting, roomId, selectedMessageIds]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isFileDrag(e.dataTransfer)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      startAutoScroll(0);
      return;
    }
    const messageDragPayload = getChatMessageDragData(e.dataTransfer);
    const hasMessageDrag = dragStartMessageIdRef.current >= 0
      || Boolean(messageDragPayload)
      || isChatMessageDrag(e.dataTransfer);
    if (!hasMessageDrag) {
      return;
    }

    if (
      dragStartMessageIdRef.current < 0
      && messageDragPayload
      && messageDragPayload.sourceRoomId === roomId
    ) {
      dragStartMessageIdRef.current = messageDragPayload.anchorMessageId;
      setIsDragging(true);
      attachWindowDragOver();
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    updateAutoScroll(e.clientY);
    scheduleCheckPosition(e.currentTarget, e.clientY);
  }, [attachWindowDragOver, roomId, scheduleCheckPosition, startAutoScroll, updateAutoScroll]);

  const handleDragEnd = useCallback(() => {
    resetMessageDragState();
  }, [resetMessageDragState]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    startAutoScroll(0);
  }, [startAutoScroll]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, dragEndIndex: number) => {
    if (isFileDrag(e.dataTransfer)) {
      e.preventDefault();
      startAutoScroll(0);
      e.stopPropagation();
      addDroppedFilesToComposer(e.dataTransfer, roomId);
      return;
    }
    const messageDragPayload = getChatMessageDragData(e.dataTransfer);
    if (!messageDragPayload && dragStartMessageIdRef.current < 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    if (messageDragPayload && messageDragPayload.sourceRoomId !== roomId) {
      toast.error("暂不支持跨房间移动消息");
      resetMessageDragState();
      return;
    }

    const adjustedIndex = dropPositionRef.current === "after" ? dragEndIndex : dragEndIndex - 1;
    const messageIds = messageDragPayload?.messageIds ?? resolveLocalMoveMessageIds({
      anchorMessageId: dragStartMessageIdRef.current,
      isSelecting,
      selectedMessageIds,
    });
    handleMoveMessages(adjustedIndex, messageIds);

    resetMessageDragState();
  }, [
    dropPositionRef,
    handleMoveMessages,
    isSelecting,
    resetMessageDragState,
    roomId,
    selectedMessageIds,
    startAutoScroll,
  ]);

  return {
    isDragging,
    scrollerRef,
    handleMoveMessages,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}

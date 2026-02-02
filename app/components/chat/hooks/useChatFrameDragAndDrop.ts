import type { VirtuosoHandle } from "react-virtuoso";

import { useCallback, useRef } from "react";
import toast from "react-hot-toast";

import { computeMoveMessageUpdates } from "@/components/chat/hooks/chatFrameDragUtils";
import useChatFrameDragAutoScroll from "@/components/chat/hooks/useChatFrameDragAutoScroll";
import useChatFrameDragIndicator from "@/components/chat/hooks/useChatFrameDragIndicator";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";

import type { ChatMessageResponse, Message } from "../../../api";

type UseChatFrameDragAndDropParams = {
  historyMessages: ChatMessageResponse[];
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

export default function useChatFrameDragAndDrop({
  historyMessages,
  isMessageMovable,
  updateMessage,
  virtuosoRef,
  isSelecting,
  selectedMessageIds,
}: UseChatFrameDragAndDropParams): UseChatFrameDragAndDropResult {
  const dragStartMessageIdRef = useRef(-1);
  const isDragging = dragStartMessageIdRef.current >= 0;
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
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    dragStartMessageIdRef.current = historyMessages[index].message.messageId;
    attachWindowDragOver();
    const clone = document.createElement("div");
    clone.className = "p-2 bg-info text-info-content rounded shadow";
    clone.textContent = isSelecting && selectedMessageIds.size > 0
      ? `移动${selectedMessageIds.size}条消息`
      : "移动消息";

    clone.style.position = "fixed";
    clone.style.top = "-9999px";
    clone.style.width = `${Math.min(320, e.currentTarget.offsetWidth)}px`;
    clone.style.opacity = "0.5";
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, 0, 0);
    setTimeout(() => document.body.removeChild(clone));
  }, [attachWindowDragOver, historyMessages, isSelecting, selectedMessageIds.size]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isFileDrag(e.dataTransfer)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      startAutoScroll(0);
      return;
    }
    if (dragStartMessageIdRef.current < 0) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    updateAutoScroll(e.clientY);
    scheduleCheckPosition(e.currentTarget, e.clientY);
  }, [scheduleCheckPosition, startAutoScroll, updateAutoScroll]);

  const handleDragEnd = useCallback(() => {
    dragStartMessageIdRef.current = -1;
    detachWindowDragOver();
    cleanupDragState();
  }, [cleanupDragState, detachWindowDragOver]);

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
      addDroppedFilesToComposer(e.dataTransfer);
      return;
    }
    if (dragStartMessageIdRef.current < 0) {
      return;
    }
    e.preventDefault();

    const adjustedIndex = dropPositionRef.current === "after" ? dragEndIndex : dragEndIndex - 1;

    if (isSelecting && selectedMessageIds.size > 0) {
      handleMoveMessages(adjustedIndex, Array.from(selectedMessageIds));
    }
    else {
      handleMoveMessages(adjustedIndex, [dragStartMessageIdRef.current]);
    }

    dragStartMessageIdRef.current = -1;
    detachWindowDragOver();
    cleanupDragState();
  }, [
    cleanupDragState,
    detachWindowDragOver,
    dropPositionRef,
    handleMoveMessages,
    isSelecting,
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

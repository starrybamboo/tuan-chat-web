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
import { cleanupDragPreview, setDragPreview } from "@/components/chat/utils/dragPreview";

import type { ChatMessageResponse, Message } from "../../../../api";

type UseChatFrameDragAndDropParams = {
  historyMessages: ChatMessageResponse[];
  roomId: number;
  isMessageMovable?: (message: Message) => boolean;
  updateMessages: (messages: Message[]) => void;
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  isSelecting: boolean;
  selectedMessageIds: Set<number>;
  canMoveMessagesInRoom: boolean;
};

type UseChatFrameDragAndDropResult = {
  isDragging: boolean;
  scrollerRef: React.MutableRefObject<HTMLElement | null>;
  handleMoveMessages: (targetIndex: number, messageIds: number[]) => void;
  handleDragStart: (e: React.DragEvent<HTMLElement>, index: number) => void;
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

function setMessageDragImage(e: React.DragEvent<HTMLElement>, messageCount: number) {
  const sourceElement = e.currentTarget.closest<HTMLElement>("[data-message-id]");
  if (!sourceElement) {
    return;
  }

  setDragPreview({
    dataTransfer: e.dataTransfer,
    sourceElement,
    title: messageCount > 1 ? "移动多条消息" : "移动消息",
    subtitle: messageCount > 1 ? `${messageCount} 条消息` : "拖到目标位置或 AI 对话区",
    variant: "message",
    count: messageCount,
  });
}

export default function useChatFrameDragAndDrop({
  historyMessages,
  roomId,
  isMessageMovable,
  updateMessages,
  virtuosoRef,
  isSelecting,
  selectedMessageIds,
  canMoveMessagesInRoom,
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
    cleanupDragPreview();
  }, [cleanupDragIndicator, stopAutoScroll]);

  const resetMessageDragState = useCallback(() => {
    dragStartMessageIdRef.current = -1;
    setIsDragging(false);
    detachWindowDragOver();
    cleanupDragState();
    cleanupMessageDragGhost();
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
    updateMessages(updatedMessages);
  }, [historyMessages, isMessageMovable, updateMessages]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLElement>, index: number) => {
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
    if (!canMoveMessagesInRoom) {
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
  }, [
    attachWindowDragOver,
    canMoveMessagesInRoom,
    roomId,
    scheduleCheckPosition,
    startAutoScroll,
    updateAutoScroll,
  ]);

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
    if (!canMoveMessagesInRoom) {
      resetMessageDragState();
      return;
    }

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
    canMoveMessagesInRoom,
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

import type { VirtuosoHandle } from "react-virtuoso";

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

import type { DocRefDragPayload } from "@/components/chat/utils/docRef";

import useChatFrameDragAutoScroll from "@/components/chat/hooks/useChatFrameDragAutoScroll";
import useChatFrameDragIndicator from "@/components/chat/hooks/useChatFrameDragIndicator";
import useSendDocCardFromDrop from "@/components/chat/hooks/useSendDocCardFromDrop";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";

import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../api";

type UseChatFrameDragAndDropParams = {
  historyMessages: ChatMessageResponse[];
  isMessageMovable?: (message: Message) => boolean;
  updateMessage: (message: Message) => void;
  roomId: number;
  spaceId: number;
  curRoleId: number;
  curAvatarId: number;
  curMemberType?: number;
  isSpaceOwner: boolean;
  onSendDocCard?: (payload: DocRefDragPayload) => Promise<void> | void;
  send: (message: ChatMessageRequest) => void;
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  isSelecting: boolean;
  selectedMessageIds: Set<number>;
};

type UseChatFrameDragAndDropResult = {
  isDragging: boolean;
  scrollerRef: React.MutableRefObject<HTMLElement | null>;
  isDocRefDragOver: boolean;
  updateDocRefDragOver: (next: boolean) => void;
  handleMoveMessages: (targetIndex: number, messageIds: number[]) => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, dragEndIndex: number) => Promise<void>;
  handleDragEnd: () => void;
  sendDocCardFromDrop: (payload: DocRefDragPayload) => Promise<void>;
};

export default function useChatFrameDragAndDrop({
  historyMessages,
  isMessageMovable,
  updateMessage,
  roomId,
  spaceId,
  curRoleId,
  curAvatarId,
  curMemberType,
  isSpaceOwner,
  onSendDocCard,
  send,
  virtuosoRef,
  isSelecting,
  selectedMessageIds,
}: UseChatFrameDragAndDropParams): UseChatFrameDragAndDropResult {
  const dragStartMessageIdRef = useRef(-1);
  const isDragging = dragStartMessageIdRef.current >= 0;
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [isDocRefDragOver, setIsDocRefDragOver] = useState(false);
  const isDocRefDragOverRef = useRef(false);
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

  const updateDocRefDragOver = useCallback((next: boolean) => {
    if (isDocRefDragOverRef.current === next)
      return;
    isDocRefDragOverRef.current = next;
    setIsDocRefDragOver(next);
  }, []);

  const cleanupDragState = useCallback(() => {
    stopAutoScroll();
    cleanupDragIndicator();
  }, [cleanupDragIndicator, stopAutoScroll]);
  const sendDocCardFromDrop = useSendDocCardFromDrop({
    roomId,
    spaceId,
    curRoleId,
    curAvatarId,
    curMemberType,
    isSpaceOwner,
    onSendDocCard,
    send,
  });

  const handleMoveMessages = useCallback((
    targetIndex: number,
    messageIds: number[],
  ) => {
    const movableMessageIds = isMessageMovable
      ? messageIds.filter((id) => {
          const msg = historyMessages.find(m => m.message.messageId === id)?.message;
          return msg ? isMessageMovable(msg) : false;
        })
      : messageIds;

    if (movableMessageIds.length !== messageIds.length) {
      toast.error("部分消息不支持移动");
    }
    if (movableMessageIds.length === 0) {
      return;
    }

    const messageIdSet = new Set(movableMessageIds);
    const selectedMessages = Array.from(movableMessageIds)
      .map(id => historyMessages.find(m => m.message.messageId === id)?.message)
      .filter((msg): msg is Message => msg !== undefined)
      .sort((a, b) => a.position - b.position);
    let topMessageIndex: number = targetIndex;
    let bottomMessageIndex: number = targetIndex + 1;
    while (messageIdSet.has(historyMessages[topMessageIndex]?.message.messageId)) {
      topMessageIndex--;
    }
    while (messageIdSet.has(historyMessages[bottomMessageIndex]?.message.messageId)) {
      bottomMessageIndex++;
    }
    const topMessagePosition = historyMessages[topMessageIndex]?.message.position
      ?? historyMessages[0].message.position - 1;
    const bottomMessagePosition = historyMessages[bottomMessageIndex]?.message.position
      ?? historyMessages[historyMessages.length - 1].message.position + 1;

    const step = (bottomMessagePosition - topMessagePosition) / (selectedMessages.length + 1);
    selectedMessages.forEach((selectedMessage, index) => {
      const nextPosition = step * (index + 1) + topMessagePosition;
      updateMessage({
        ...selectedMessage,
        position: nextPosition,
      });
    });
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
    e.preventDefault();
    if (isDocRefDrag(e.dataTransfer)) {
      updateDocRefDragOver(true);
      e.dataTransfer.dropEffect = "copy";
      startAutoScroll(0);
      return;
    }
    updateDocRefDragOver(false);
    if (isFileDrag(e.dataTransfer)) {
      e.dataTransfer.dropEffect = "copy";
      startAutoScroll(0);
      return;
    }
    e.dataTransfer.dropEffect = "move";
    updateAutoScroll(e.clientY);
    scheduleCheckPosition(e.currentTarget, e.clientY);
  }, [scheduleCheckPosition, startAutoScroll, updateAutoScroll, updateDocRefDragOver]);

  const handleDragEnd = useCallback(() => {
    dragStartMessageIdRef.current = -1;
    detachWindowDragOver();
    cleanupDragState();
  }, [cleanupDragState, detachWindowDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    updateDocRefDragOver(false);
    startAutoScroll(0);
  }, [startAutoScroll, updateDocRefDragOver]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, dragEndIndex: number) => {
    e.preventDefault();
    updateDocRefDragOver(false);

    const docRef = getDocRefDragData(e.dataTransfer);
    if (docRef) {
      startAutoScroll(0);
      e.stopPropagation();
      await sendDocCardFromDrop(docRef);
      dragStartMessageIdRef.current = -1;
      detachWindowDragOver();
      cleanupDragState();
      return;
    }

    if (isFileDrag(e.dataTransfer)) {
      startAutoScroll(0);
      e.stopPropagation();
      addDroppedFilesToComposer(e.dataTransfer);
      return;
    }

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
    sendDocCardFromDrop,
    startAutoScroll,
    updateDocRefDragOver,
  ]);

  return {
    isDragging,
    scrollerRef,
    isDocRefDragOver,
    updateDocRefDragOver,
    handleMoveMessages,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    sendDocCardFromDrop,
  };
}

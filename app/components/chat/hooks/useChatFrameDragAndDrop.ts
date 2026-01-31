import type { VirtuosoHandle } from "react-virtuoso";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import type { DocRefDragPayload } from "@/components/chat/utils/docRef";

import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

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
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingDragCheckRef = useRef<{ target: HTMLDivElement; clientY: number } | null>(null);
  const dragScrollRafRef = useRef<number | null>(null);
  const dragScrollDirectionRef = useRef<-1 | 0 | 1>(0);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const windowDragOverListeningRef = useRef(false);
  const dropPositionRef = useRef<"before" | "after">("before");
  const curDragOverMessageRef = useRef<HTMLDivElement | null>(null);
  const [isDocRefDragOver, setIsDocRefDragOver] = useState(false);
  const isDocRefDragOverRef = useRef(false);

  const updateDocRefDragOver = useCallback((next: boolean) => {
    if (isDocRefDragOverRef.current === next)
      return;
    isDocRefDragOverRef.current = next;
    setIsDocRefDragOver(next);
  }, []);

  const sendDocCardFromDrop = useCallback(async (payload: DocRefDragPayload) => {
    if (onSendDocCard) {
      try {
        await onSendDocCard(payload);
      }
      catch {
        toast.error("发送文档失败");
      }
      return;
    }

    const docId = String(payload?.docId ?? "").trim();
    if (!docId) {
      toast.error("未检测到可用文档");
      return;
    }

    if (!parseDescriptionDocId(docId)) {
      toast.error("仅支持发送空间文档（我的文档/描述文档）");
      return;
    }

    if (payload?.spaceId && payload.spaceId !== spaceId) {
      toast.error("仅支持在同一空间分享文档");
      return;
    }

    const notMember = (curMemberType ?? 3) >= 3;
    const isNarrator = curRoleId <= 0;

    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isNarrator && !isSpaceOwner) {
      toast.error("旁白仅KP可用，请先选择/拉入你的角色");
      return;
    }

    const request: ChatMessageRequest = {
      roomId,
      roleId: curRoleId,
      avatarId: curAvatarId,
      content: "",
      messageType: MESSAGE_TYPE.DOC_CARD,
      extra: {
        docCard: {
          docId,
          ...(spaceId > 0 ? { spaceId } : {}),
          ...(payload?.title ? { title: payload.title } : {}),
          ...(payload?.imageUrl ? { imageUrl: payload.imageUrl } : {}),
        },
      } as any,
    };

    const { threadRootMessageId, composerTarget } = useRoomUiStore.getState();
    if (composerTarget === "thread" && threadRootMessageId) {
      request.threadId = threadRootMessageId;
    }

    send(request);
  }, [curAvatarId, curMemberType, curRoleId, isSpaceOwner, onSendDocCard, roomId, send, spaceId]);

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

  const cleanupDragIndicator = useCallback(() => {
    pendingDragCheckRef.current = null;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (dragScrollRafRef.current !== null) {
      cancelAnimationFrame(dragScrollRafRef.current);
      dragScrollRafRef.current = null;
    }
    dragScrollDirectionRef.current = 0;
    indicatorRef.current?.remove();
    curDragOverMessageRef.current = null;
    dropPositionRef.current = "before";
  }, []);

  const startAutoScroll = useCallback((direction: -1 | 0 | 1) => {
    if (dragScrollDirectionRef.current === direction) {
      return;
    }
    dragScrollDirectionRef.current = direction;

    if (direction === 0) {
      if (dragScrollRafRef.current !== null) {
        cancelAnimationFrame(dragScrollRafRef.current);
        dragScrollRafRef.current = null;
      }
      return;
    }

    if (dragScrollRafRef.current !== null) {
      return;
    }

    const step = () => {
      const currentDirection = dragScrollDirectionRef.current;
      if (currentDirection === 0) {
        dragScrollRafRef.current = null;
        return;
      }
      virtuosoRef.current?.scrollBy({ top: currentDirection * 18, behavior: "auto" });
      dragScrollRafRef.current = requestAnimationFrame(step);
    };

    dragScrollRafRef.current = requestAnimationFrame(step);
  }, [virtuosoRef]);

  const updateAutoScroll = useCallback((clientY: number) => {
    if (dragStartMessageIdRef.current === -1) {
      startAutoScroll(0);
      return;
    }
    const scroller = scrollerRef.current;
    if (!scroller) {
      startAutoScroll(0);
      return;
    }
    const rect = scroller.getBoundingClientRect();
    const topDistance = clientY - rect.top;
    const bottomDistance = rect.bottom - clientY;
    const threshold = 80;
    if (topDistance <= threshold) {
      startAutoScroll(-1);
      return;
    }
    if (bottomDistance <= threshold) {
      startAutoScroll(1);
      return;
    }
    startAutoScroll(0);
  }, [startAutoScroll]);

  const handleWindowDragOver = useCallback((event: DragEvent) => {
    if (dragStartMessageIdRef.current === -1) {
      return;
    }
    updateAutoScroll(event.clientY);
  }, [updateAutoScroll]);

  const attachWindowDragOver = useCallback(() => {
    if (windowDragOverListeningRef.current) {
      return;
    }
    window.addEventListener("dragover", handleWindowDragOver, true);
    windowDragOverListeningRef.current = true;
  }, [handleWindowDragOver]);

  const detachWindowDragOver = useCallback(() => {
    if (!windowDragOverListeningRef.current) {
      return;
    }
    window.removeEventListener("dragover", handleWindowDragOver, true);
    windowDragOverListeningRef.current = false;
  }, [handleWindowDragOver]);

  const scheduleCheckPosition = useCallback((target: HTMLDivElement, clientY: number) => {
    if (dragStartMessageIdRef.current === -1) {
      return;
    }
    pendingDragCheckRef.current = { target, clientY };
    if (rafIdRef.current !== null) {
      return;
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const pending = pendingDragCheckRef.current;
      pendingDragCheckRef.current = null;
      if (!pending || dragStartMessageIdRef.current === -1) {
        return;
      }

      const { target, clientY } = pending;
      curDragOverMessageRef.current = target;

      const rect = target.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      const nextPosition: "before" | "after" = relativeY < rect.height / 2 ? "before" : "after";

      let indicator = indicatorRef.current;
      if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "drag-indicator absolute left-0 right-0 h-[2px] bg-info pointer-events-none";
        indicator.style.zIndex = "50";
        indicatorRef.current = indicator;
      }

      if (indicator.parentElement !== target) {
        indicator.remove();
        target.appendChild(indicator);
      }

      dropPositionRef.current = nextPosition;
      if (nextPosition === "before") {
        indicator.style.top = "-1px";
        indicator.style.bottom = "auto";
      }
      else {
        indicator.style.top = "auto";
        indicator.style.bottom = "-1px";
      }
    });
  }, []);

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
    cleanupDragIndicator();
  }, [cleanupDragIndicator, detachWindowDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    updateDocRefDragOver(false);
    curDragOverMessageRef.current = null;
    startAutoScroll(0);
  }, [startAutoScroll, updateDocRefDragOver]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, dragEndIndex: number) => {
    e.preventDefault();
    updateDocRefDragOver(false);
    curDragOverMessageRef.current = null;

    const docRef = getDocRefDragData(e.dataTransfer);
    if (docRef) {
      startAutoScroll(0);
      e.stopPropagation();
      await sendDocCardFromDrop(docRef);
      dragStartMessageIdRef.current = -1;
      detachWindowDragOver();
      cleanupDragIndicator();
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
    cleanupDragIndicator();
  }, [
    cleanupDragIndicator,
    detachWindowDragOver,
    handleMoveMessages,
    isSelecting,
    selectedMessageIds,
    sendDocCardFromDrop,
    startAutoScroll,
    updateDocRefDragOver,
  ]);

  useEffect(() => {
    return () => {
      detachWindowDragOver();
    };
  }, [detachWindowDragOver]);

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

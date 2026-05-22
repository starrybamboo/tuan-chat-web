import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";

type SelectMessageRangeParams = {
  orderedMessageIds: number[];
  targetMessageId: number;
  preserveExisting?: boolean;
};

const SELECTION_SHORTCUTS_TOAST_ID = "chat-selection-shortcuts";

export default function useChatFrameSelection() {
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(() => new Set());
  const [selectionAnchorMessageId, setSelectionAnchorMessageId] = useState<number | null>(null);
  const wasSelectingRef = useRef(false);
  const isMultiSelecting = useRoomUiStore(state => state.isMultiSelecting);
  const setMultiSelecting = useRoomUiStore(state => state.setMultiSelecting);
  const isSelecting = isMultiSelecting || selectedMessageIds.size > 0;

  const updateSelectedMessageIds = useCallback((next: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    setSelectedMessageIds((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (resolved.size > 0) {
        setMultiSelecting(true);
      }
      return resolved;
    });
  }, [setMultiSelecting]);

  useEffect(() => {
    if (selectedMessageIds.size === 0) {
      queueMicrotask(() => setSelectionAnchorMessageId(null));
    }
  }, [selectedMessageIds.size]);

  useEffect(() => {
    const wasSelecting = wasSelectingRef.current;
    wasSelectingRef.current = isSelecting;
    if (!wasSelecting && isSelecting) {
      toast("多选模式支持 Windows 文件系统式选择：Ctrl 点选增删，Shift 连选，Ctrl + Shift 追加范围。", {
        id: SELECTION_SHORTCUTS_TOAST_ID,
        duration: 5000,
      });
    }
  }, [isSelecting]);

  const toggleMessageSelection = useCallback((messageId: number) => {
    setSelectionAnchorMessageId(messageId);
    updateSelectedMessageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      }
      else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, [updateSelectedMessageIds]);

  const selectMessageRange = useCallback(({
    orderedMessageIds,
    targetMessageId,
    preserveExisting = false,
  }: SelectMessageRangeParams) => {
    const fallbackAnchor = (() => {
      const selectedIds = Array.from(selectedMessageIds);
      return selectedIds.length > 0 ? (selectedIds[selectedIds.length - 1] ?? null) : null;
    })();
    const anchorMessageId = selectionAnchorMessageId ?? fallbackAnchor;

    if (anchorMessageId == null) {
      const next = preserveExisting ? new Set(selectedMessageIds) : new Set<number>();
      next.add(targetMessageId);
      updateSelectedMessageIds(next);
      setSelectionAnchorMessageId(targetMessageId);
      return;
    }

    const anchorIndex = orderedMessageIds.indexOf(anchorMessageId);
    const targetIndex = orderedMessageIds.indexOf(targetMessageId);
    if (anchorIndex < 0 || targetIndex < 0) {
      const next = preserveExisting ? new Set(selectedMessageIds) : new Set<number>();
      next.add(targetMessageId);
      updateSelectedMessageIds(next);
      setSelectionAnchorMessageId(targetMessageId);
      return;
    }

    // Shift 范围选择：从锚点到当前点击消息之间全部选中（包含端点）。
    const [startIndex, endIndex] = anchorIndex <= targetIndex
      ? [anchorIndex, targetIndex]
      : [targetIndex, anchorIndex];
    const next = preserveExisting ? new Set(selectedMessageIds) : new Set<number>();
    for (let index = startIndex; index <= endIndex; index += 1) {
      next.add(orderedMessageIds[index]);
    }
    updateSelectedMessageIds(next);
    if (selectionAnchorMessageId == null) {
      setSelectionAnchorMessageId(anchorMessageId);
    }
  }, [selectedMessageIds, selectionAnchorMessageId, updateSelectedMessageIds]);

  const enterSelection = useCallback(() => {
    setMultiSelecting(true);
  }, [setMultiSelecting]);

  const exitSelection = useCallback(() => {
    setMultiSelecting(false);
    setSelectionAnchorMessageId(null);
    updateSelectedMessageIds(new Set());
  }, [setMultiSelecting, updateSelectedMessageIds]);

  const handleEditMessage = useCallback((messageId: number) => {
    const target = document.querySelector(
      `[data-message-id="${messageId}"] .editable-field`,
    ) as HTMLElement;
    target.dispatchEvent(new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: target.offsetLeft + target.offsetWidth / 2,
      clientY: target.offsetTop + target.offsetHeight / 2,
    }));
  }, []);

  return {
    selectedMessageIds,
    updateSelectedMessageIds,
    isSelecting,
    enterSelection,
    exitSelection,
    toggleMessageSelection,
    selectMessageRange,
    handleEditMessage,
  };
}

import { useCallback, useEffect, useState } from "react";

import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";

type UseChatFrameSelectionParams = {
  onDeleteMessage: (messageId: number) => void;
};

type SelectMessageRangeParams = {
  orderedMessageIds: number[];
  targetMessageId: number;
  preserveExisting?: boolean;
};

export default function useChatFrameSelection({ onDeleteMessage }: UseChatFrameSelectionParams) {
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(() => new Set());
  const [selectionAnchorMessageId, setSelectionAnchorMessageId] = useState<number | null>(null);
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
      setSelectionAnchorMessageId(null);
    }
  }, [selectedMessageIds.size]);

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

  const handleBatchDelete = useCallback(() => {
    for (const messageId of selectedMessageIds) {
      onDeleteMessage(messageId);
    }
    exitSelection();
  }, [exitSelection, onDeleteMessage, selectedMessageIds]);

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
    handleBatchDelete,
    handleEditMessage,
  };
}

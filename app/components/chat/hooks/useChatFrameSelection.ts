import { useCallback, useEffect, useState } from "react";

import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";

type SelectMessageRangeParams = {
  orderedMessageIds: number[];
  targetMessageId: number;
  preserveExisting?: boolean;
};

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable=\"true\"]"));
}

export default function useChatFrameSelection() {
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(() => new Set());
  const [selectionAnchorMessageId, setSelectionAnchorMessageId] = useState<number | null>(null);
  const [isSelectionModifierPressed, setSelectionModifierPressed] = useState(false);
  const isMultiSelecting = useRoomUiStore(state => state.isMultiSelecting);
  const setMultiSelecting = useRoomUiStore(state => state.setMultiSelecting);
  const isSelecting = isMultiSelecting || selectedMessageIds.size > 0;
  const isSelectionToolbarVisible = isSelectionModifierPressed || isSelecting;

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
    if (isMultiSelecting && selectedMessageIds.size === 0 && !isSelectionModifierPressed) {
      setMultiSelecting(false);
    }
  }, [isMultiSelecting, isSelectionModifierPressed, selectedMessageIds.size, setMultiSelecting]);

  useEffect(() => {
    const shouldHandleSelectionModifier = (event: KeyboardEvent) => {
      return !event.isComposing && (event.key === "Control" || event.key === "Meta");
    };

    const handleModifierDown = (event: KeyboardEvent) => {
      if (!shouldHandleSelectionModifier(event) || isEditableKeyboardTarget(event.target)) {
        return;
      }
      setSelectionModifierPressed(true);
    };

    const releasePendingSelection = () => {
      setSelectionModifierPressed(false);
    };

    const handleModifierUp = (event: KeyboardEvent) => {
      if (!shouldHandleSelectionModifier(event)) {
        return;
      }
      releasePendingSelection();
    };

    window.addEventListener("keydown", handleModifierDown);
    window.addEventListener("keyup", handleModifierUp);
    window.addEventListener("blur", releasePendingSelection);
    return () => {
      window.removeEventListener("keydown", handleModifierDown);
      window.removeEventListener("keyup", handleModifierUp);
      window.removeEventListener("blur", releasePendingSelection);
    };
  }, []);

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

  useEffect(() => {
    if (!isSelecting) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) {
        return;
      }
      event.preventDefault();
      exitSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitSelection, isSelecting]);

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
    isSelectionToolbarVisible,
    enterSelection,
    exitSelection,
    toggleMessageSelection,
    selectMessageRange,
    handleEditMessage,
  };
}

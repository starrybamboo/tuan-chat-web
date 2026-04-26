import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefCallback } from "react";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const DEFAULT_ROOM_SIDEBAR_SPLIT_RATIO = 0.62;
export const ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT = 12;

const MIN_SECTION_HEIGHT = 120;
const STORAGE_KEY_PREFIX = "roomSidebarVerticalSplit";
const KEYBOARD_STEP = 24;

type RoomSidebarSplitMetrics = {
  usableHeight: number;
  minSectionHeight: number;
  topHeight: number;
  bottomHeight: number;
  ratio: number;
};

type UseRoomSidebarSplitLayoutParams = {
  activeSpaceId: number | null;
  currentUserId?: number | null;
  enabled: boolean;
};

type UseRoomSidebarSplitLayoutResult = {
  containerRef: RefCallback<HTMLDivElement>;
  isDragging: boolean;
  topPaneStyle?: CSSProperties;
  handlePointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  resetSplitRatio: () => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function buildStorageKey(activeSpaceId: number | null, currentUserId?: number | null): string | null {
  if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
    return null;
  }
  const userSegment = typeof currentUserId === "number" && Number.isFinite(currentUserId) ? String(currentUserId) : "anon";
  return `${STORAGE_KEY_PREFIX}:${userSegment}:${activeSpaceId}`;
}

function readStoredRatio(storageKey: string | null): number {
  if (!storageKey || !canUseLocalStorage()) {
    return DEFAULT_ROOM_SIDEBAR_SPLIT_RATIO;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : DEFAULT_ROOM_SIDEBAR_SPLIT_RATIO;
  }
  catch {
    return DEFAULT_ROOM_SIDEBAR_SPLIT_RATIO;
  }
}

function writeStoredRatio(storageKey: string | null, ratio: number): void {
  if (!storageKey || !canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, String(ratio));
  }
  catch {
    // ignore
  }
}

export function computeRoomSidebarSplitMetrics(params: {
  containerHeight: number;
  ratio: number;
}): RoomSidebarSplitMetrics {
  const safeContainerHeight = Number.isFinite(params.containerHeight) ? Math.max(0, params.containerHeight) : 0;
  const usableHeight = Math.max(0, safeContainerHeight - ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT);
  const minSectionHeight = Math.min(MIN_SECTION_HEIGHT, Math.floor(usableHeight / 2));

  if (usableHeight <= 0) {
    return {
      usableHeight,
      minSectionHeight,
      topHeight: 0,
      bottomHeight: 0,
      ratio: DEFAULT_ROOM_SIDEBAR_SPLIT_RATIO,
    };
  }

  const minTopHeight = minSectionHeight;
  const maxTopHeight = Math.max(minTopHeight, usableHeight - minSectionHeight);
  const rawTopHeight = Math.round(usableHeight * clamp(params.ratio, 0, 1));
  const topHeight = clamp(rawTopHeight, minTopHeight, maxTopHeight);

  return {
    usableHeight,
    minSectionHeight,
    topHeight,
    bottomHeight: Math.max(0, usableHeight - topHeight),
    ratio: usableHeight > 0 ? topHeight / usableHeight : DEFAULT_ROOM_SIDEBAR_SPLIT_RATIO,
  };
}

export default function useRoomSidebarSplitLayout({
  activeSpaceId,
  currentUserId,
  enabled,
}: UseRoomSidebarSplitLayoutParams): UseRoomSidebarSplitLayoutResult {
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [splitRatio, setSplitRatio] = useState(DEFAULT_ROOM_SIDEBAR_SPLIT_RATIO);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const storageKey = useMemo(() => buildStorageKey(activeSpaceId, currentUserId), [activeSpaceId, currentUserId]);
  const metrics = useMemo(() => {
    return computeRoomSidebarSplitMetrics({
      containerHeight,
      ratio: splitRatio,
    });
  }, [containerHeight, splitRatio]);

  useLayoutEffect(() => {
    if (!enabled || !containerNode) {
      queueMicrotask(() => setContainerHeight(0));
      return;
    }

    const updateHeight = () => {
      setContainerHeight(containerNode.getBoundingClientRect().height);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHeight);
      return () => {
        window.removeEventListener("resize", updateHeight);
      };
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(containerNode);

    return () => {
      observer.disconnect();
    };
  }, [containerNode, enabled]);

  useEffect(() => {
    queueMicrotask(() => setLoadedStorageKey(null));
    queueMicrotask(() => setSplitRatio(DEFAULT_ROOM_SIDEBAR_SPLIT_RATIO));

    if (!enabled) {
      queueMicrotask(() => setLoadedStorageKey(storageKey));
      return;
    }

    queueMicrotask(() => setSplitRatio(readStoredRatio(storageKey)));
    queueMicrotask(() => setLoadedStorageKey(storageKey));
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled || metrics.usableHeight <= 0) {
      return;
    }
    if (Math.abs(metrics.ratio - splitRatio) < 0.0001) {
      return;
    }

    queueMicrotask(() => setSplitRatio(metrics.ratio));
  }, [enabled, metrics.ratio, metrics.usableHeight, splitRatio]);

  useEffect(() => {
    if (!enabled || isDragging || loadedStorageKey !== storageKey) {
      return;
    }

    writeStoredRatio(storageKey, splitRatio);
  }, [enabled, isDragging, loadedStorageKey, splitRatio, storageKey]);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
    };
  }, []);

  const updateRatioFromClientY = useCallback((clientY: number) => {
    if (!containerNode) {
      return;
    }

    const rect = containerNode.getBoundingClientRect();
    const usableHeight = Math.max(1, rect.height - ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT);
    const rawRatio = (clientY - rect.top - ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT / 2) / usableHeight;
    const nextMetrics = computeRoomSidebarSplitMetrics({
      containerHeight: rect.height,
      ratio: rawRatio,
    });
    setSplitRatio(nextMetrics.ratio);
  }, [containerNode]);

  const shiftSplitBy = useCallback((delta: number) => {
    if (!enabled || containerHeight <= 0) {
      return;
    }

    const usableHeight = Math.max(1, containerHeight - ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT);
    const nextMetrics = computeRoomSidebarSplitMetrics({
      containerHeight,
      ratio: (metrics.topHeight + delta) / usableHeight,
    });
    setSplitRatio(nextMetrics.ratio);
  }, [containerHeight, enabled, metrics.topHeight]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!enabled || !containerNode) {
      return;
    }

    dragCleanupRef.current?.();
    event.preventDefault();
    setIsDragging(true);
    updateRatioFromClientY(event.clientY);

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";

    function handlePointerMove(moveEvent: PointerEvent) {
      moveEvent.preventDefault();
      updateRatioFromClientY(moveEvent.clientY);
    }

    function handlePointerUp() {
      finishDrag();
    }

    function finishDrag() {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerUp, true);
      dragCleanupRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerUp, true);
    dragCleanupRef.current = finishDrag;
  }, [containerNode, enabled, updateRatioFromClientY]);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!enabled) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      shiftSplitBy(-KEYBOARD_STEP);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      shiftSplitBy(KEYBOARD_STEP);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setSplitRatio(computeRoomSidebarSplitMetrics({
        containerHeight,
        ratio: 0,
      }).ratio);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setSplitRatio(computeRoomSidebarSplitMetrics({
        containerHeight,
        ratio: 1,
      }).ratio);
    }
  }, [containerHeight, enabled, shiftSplitBy]);

  const resetSplitRatio = useCallback(() => {
    setSplitRatio(DEFAULT_ROOM_SIDEBAR_SPLIT_RATIO);
  }, []);

  return {
    containerRef: setContainerNode,
    isDragging,
    topPaneStyle: enabled && metrics.topHeight > 0
      ? { height: `${metrics.topHeight}px` }
      : undefined,
    handlePointerDown,
    handleKeyDown,
    resetSplitRatio,
  };
}

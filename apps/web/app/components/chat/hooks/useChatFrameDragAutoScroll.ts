import type { MutableRefObject, RefObject } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

import { useCallback, useEffect, useRef } from "react";

type UseChatFrameDragAutoScrollParams = {
  dragStartMessageIdRef: MutableRefObject<number>;
  scrollerRef: MutableRefObject<HTMLElement | null>;
  virtuosoRef: RefObject<VirtuosoHandle | null>;
};

type UseChatFrameDragAutoScrollResult = {
  attachWindowDragOver: () => void;
  detachWindowDragOver: () => void;
  startAutoScroll: (direction: -1 | 0 | 1) => void;
  stopAutoScroll: () => void;
  updateAutoScroll: (clientY: number) => void;
};

export default function useChatFrameDragAutoScroll({
  dragStartMessageIdRef,
  scrollerRef,
  virtuosoRef,
}: UseChatFrameDragAutoScrollParams): UseChatFrameDragAutoScrollResult {
  const dragScrollRafRef = useRef<number | null>(null);
  const dragScrollDirectionRef = useRef<-1 | 0 | 1>(0);
  const windowDragOverListeningRef = useRef(false);

  const stopAutoScroll = useCallback(() => {
    dragScrollDirectionRef.current = 0;
    if (dragScrollRafRef.current !== null) {
      cancelAnimationFrame(dragScrollRafRef.current);
      dragScrollRafRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback((direction: -1 | 0 | 1) => {
    if (dragScrollDirectionRef.current === direction) {
      return;
    }

    if (direction === 0) {
      stopAutoScroll();
      return;
    }

    dragScrollDirectionRef.current = direction;

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
  }, [stopAutoScroll, virtuosoRef]);

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
  }, [dragStartMessageIdRef, scrollerRef, startAutoScroll]);

  const handleWindowDragOver = useCallback((event: DragEvent) => {
    if (dragStartMessageIdRef.current === -1) {
      return;
    }
    updateAutoScroll(event.clientY);
  }, [dragStartMessageIdRef, updateAutoScroll]);

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

  useEffect(() => {
    return () => {
      stopAutoScroll();
      detachWindowDragOver();
    };
  }, [detachWindowDragOver, stopAutoScroll]);

  return {
    attachWindowDragOver,
    detachWindowDragOver,
    startAutoScroll,
    stopAutoScroll,
    updateAutoScroll,
  };
}

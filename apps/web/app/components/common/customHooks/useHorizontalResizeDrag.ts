import type { PointerEvent as ReactPointerEvent } from "react";

import { useCallback, useRef } from "react";

type UseHorizontalResizeDragParams = {
  enabled?: boolean;
  cursor?: string;
  capturePointer?: boolean;
  getStartSize: () => number | null;
  resolveNextSize: (params: {
    startSize: number;
    deltaX: number;
    event: PointerEvent;
  }) => number | null;
  onResizeStart?: () => void;
  onResize: (nextSize: number) => void;
  onResizeEnd?: () => void;
};

export function useHorizontalResizeDrag<Element extends HTMLElement>({
  enabled = true,
  cursor = "col-resize",
  capturePointer = true,
  getStartSize,
  resolveNextSize,
  onResizeStart,
  onResize,
  onResizeEnd,
}: UseHorizontalResizeDragParams) {
  const isDraggingRef = useRef(false);
  const startClientXRef = useRef(0);
  const startSizeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const pendingSizeRef = useRef<number | null>(null);

  const flushPendingResize = useCallback(() => {
    animationFrameRef.current = null;
    const nextSize = pendingSizeRef.current;
    pendingSizeRef.current = null;
    if (nextSize != null) {
      onResize(nextSize);
    }
  }, [onResize]);

  return useCallback((event: ReactPointerEvent<Element>) => {
    if (!enabled) {
      return;
    }

    const startSize = getStartSize();
    if (startSize == null) {
      return;
    }

    event.preventDefault();
    isDraggingRef.current = true;
    startClientXRef.current = event.clientX;
    startSizeRef.current = startSize;
    onResizeStart?.();

    const pointerId = event.pointerId;
    const captureTarget = event.currentTarget;
    const ownerDocument = captureTarget.ownerDocument;
    const previousCursor = ownerDocument.body.style.cursor;
    const previousUserSelect = ownerDocument.body.style.userSelect;

    ownerDocument.body.style.cursor = cursor;
    ownerDocument.body.style.userSelect = "none";

    if (capturePointer) {
      try {
        captureTarget.setPointerCapture(pointerId);
      }
      catch {
        // 部分嵌入式 WebView 不支持 pointer capture，仍可依赖全局 pointermove。
      }
    }

    const finishDrag = () => {
      isDraggingRef.current = false;
      if (animationFrameRef.current != null) {
        ownerDocument.defaultView?.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (pendingSizeRef.current != null) {
        const finalSize = pendingSizeRef.current;
        pendingSizeRef.current = null;
        onResize(finalSize);
      }
      onResizeEnd?.();
      if (capturePointer) {
        try {
          captureTarget.releasePointerCapture(pointerId);
        }
        catch {
          // ignore
        }
      }
      ownerDocument.body.style.cursor = previousCursor;
      ownerDocument.body.style.userSelect = previousUserSelect;
      ownerDocument.removeEventListener("pointermove", handlePointerMove);
      ownerDocument.removeEventListener("pointerup", finishDrag);
      ownerDocument.removeEventListener("pointercancel", finishDrag);
    };

    function handlePointerMove(pointerMoveEvent: PointerEvent) {
      if (!isDraggingRef.current) {
        return;
      }

      const nextSize = resolveNextSize({
        startSize: startSizeRef.current,
        deltaX: pointerMoveEvent.clientX - startClientXRef.current,
        event: pointerMoveEvent,
      });
      if (nextSize != null) {
        pendingSizeRef.current = nextSize;
        if (animationFrameRef.current == null) {
          animationFrameRef.current = ownerDocument.defaultView?.requestAnimationFrame(flushPendingResize) ?? null;
        }
      }
    }

    ownerDocument.addEventListener("pointermove", handlePointerMove);
    ownerDocument.addEventListener("pointerup", finishDrag);
    ownerDocument.addEventListener("pointercancel", finishDrag);
  }, [capturePointer, cursor, enabled, flushPendingResize, getStartSize, onResize, onResizeEnd, onResizeStart, resolveNextSize]);
}

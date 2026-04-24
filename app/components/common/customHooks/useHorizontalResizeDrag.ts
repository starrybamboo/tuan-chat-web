import type { PointerEvent as ReactPointerEvent } from "react";

import { useCallback, useRef } from "react";

type UseHorizontalResizeDragParams = {
  enabled?: boolean;
  cursor?: string;
  getStartSize: () => number | null;
  resolveNextSize: (params: {
    startSize: number;
    deltaX: number;
    event: PointerEvent;
  }) => number | null;
  onResize: (nextSize: number) => void;
};

export function useHorizontalResizeDrag<Element extends HTMLElement>({
  enabled = true,
  cursor = "col-resize",
  getStartSize,
  resolveNextSize,
  onResize,
}: UseHorizontalResizeDragParams) {
  const isDraggingRef = useRef(false);
  const startClientXRef = useRef(0);
  const startSizeRef = useRef(0);

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

    const pointerId = event.pointerId;
    const captureTarget = event.currentTarget;
    const ownerDocument = captureTarget.ownerDocument;
    const previousCursor = ownerDocument.body.style.cursor;
    const previousUserSelect = ownerDocument.body.style.userSelect;

    ownerDocument.body.style.cursor = cursor;
    ownerDocument.body.style.userSelect = "none";

    try {
      captureTarget.setPointerCapture(pointerId);
    }
    catch {
      // 部分嵌入式 WebView 不支持 pointer capture，仍可依赖全局 pointermove。
    }

    const finishDrag = () => {
      isDraggingRef.current = false;
      try {
        captureTarget.releasePointerCapture(pointerId);
      }
      catch {
        // ignore
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
        onResize(nextSize);
      }
    }

    ownerDocument.addEventListener("pointermove", handlePointerMove);
    ownerDocument.addEventListener("pointerup", finishDrag);
    ownerDocument.addEventListener("pointercancel", finishDrag);
  }, [cursor, enabled, getStartSize, onResize, resolveNextSize]);
}

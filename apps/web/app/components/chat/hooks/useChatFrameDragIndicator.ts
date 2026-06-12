import type { MutableRefObject } from "react";

import { useCallback, useEffect, useRef } from "react";

type UseChatFrameDragIndicatorParams = {
  dragStartMessageIdRef: MutableRefObject<number>;
};

type UseChatFrameDragIndicatorResult = {
  dropPositionRef: MutableRefObject<"before" | "after">;
  scheduleCheckPosition: (target: HTMLDivElement, clientY: number) => void;
  cleanupDragIndicator: () => void;
};

export default function useChatFrameDragIndicator({
  dragStartMessageIdRef,
}: UseChatFrameDragIndicatorParams): UseChatFrameDragIndicatorResult {
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingDragCheckRef = useRef<{ target: HTMLDivElement; clientY: number } | null>(null);
  const dropPositionRef = useRef<"before" | "after">("before");

  const cleanupDragIndicator = useCallback(() => {
    pendingDragCheckRef.current = null;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    indicatorRef.current?.remove();
    dropPositionRef.current = "before";
  }, []);

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

      const rect = pending.target.getBoundingClientRect();
      const relativeY = pending.clientY - rect.top;
      const nextPosition: "before" | "after" = relativeY < rect.height / 2 ? "before" : "after";

      let indicator = indicatorRef.current;
      if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "drag-indicator absolute left-0 right-0 h-[2px] bg-info pointer-events-none";
        indicator.style.zIndex = "50";
        indicatorRef.current = indicator;
      }

      if (indicator.parentElement !== pending.target) {
        indicator.remove();
        pending.target.appendChild(indicator);
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
  }, [dragStartMessageIdRef]);

  useEffect(() => {
    return () => {
      cleanupDragIndicator();
    };
  }, [cleanupDragIndicator]);

  return {
    dropPositionRef,
    scheduleCheckPosition,
    cleanupDragIndicator,
  };
}

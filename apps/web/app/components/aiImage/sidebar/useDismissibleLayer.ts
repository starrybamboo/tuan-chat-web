import type { RefObject } from "react";

import { useEffect } from "react";

type UseDismissibleLayerOptions = {
  isOpen: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
};

export function useDismissibleLayer({
  isOpen,
  containerRef,
  onDismiss,
}: UseDismissibleLayerOptions) {
  useEffect(() => {
    if (!isOpen)
      return;

    function handlePointerDown(event: PointerEvent) {
      const container = containerRef.current;
      const target = event.target;
      if (!container || !(target instanceof Node))
        return;
      if (!container.contains(target))
        onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape")
        onDismiss();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, isOpen, onDismiss]);
}

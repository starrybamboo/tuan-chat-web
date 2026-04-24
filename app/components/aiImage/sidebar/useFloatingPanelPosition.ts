import type { RefObject } from "react";
import { useEffect, useState } from "react";

interface FloatingPanelPosition {
  top: number;
  left: number;
}

interface UseFloatingPanelPositionOptions {
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  targetRef: RefObject<HTMLElement | null>;
  panelWidth?: number;
  panelHeight?: number;
  viewportPadding?: number;
  gap?: number;
  initialPosition?: FloatingPanelPosition;
}

const DEFAULT_FLOATING_POSITION: FloatingPanelPosition = { top: 96, left: 96 };

export function useFloatingPanelPosition({
  isOpen,
  anchorRef,
  targetRef,
  panelWidth = 320,
  panelHeight = 240,
  viewportPadding = 16,
  gap = 12,
  initialPosition = DEFAULT_FLOATING_POSITION,
}: UseFloatingPanelPositionOptions) {
  const [position, setPosition] = useState<FloatingPanelPosition>(initialPosition);

  useEffect(() => {
    if (!isOpen)
      return;

    function updatePosition() {
      const anchor = anchorRef.current;
      const target = targetRef.current;
      if (!anchor || !target)
        return;

      const anchorRect = anchor.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - panelWidth - viewportPadding,
      );
      const maxTop = Math.max(
        viewportPadding,
        window.innerHeight - panelHeight,
      );
      const nextLeft = Math.max(
        viewportPadding,
        Math.min(anchorRect.right + gap, maxLeft),
      );
      const nextTop = Math.min(
        Math.max(viewportPadding, targetRect.top),
        maxTop,
      );

      setPosition((prev) => {
        if (prev.top === nextTop && prev.left === nextLeft)
          return prev;
        return { top: nextTop, left: nextLeft };
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, gap, isOpen, panelHeight, panelWidth, targetRef, viewportPadding]);

  return position;
}

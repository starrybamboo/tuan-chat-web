import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type BlocksuiteMentionAnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type BlocksuiteMentionProfilePopoverState = {
  userId: string;
  anchorRect: BlocksuiteMentionAnchorRect;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function buildPopoverPosition(anchorRect: BlocksuiteMentionAnchorRect, desiredWidth: number, desiredHeight: number) {
  const margin = 10;
  const gap = 8;
  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;

  const width = clamp(desiredWidth, 280, vw - margin * 2);
  const height = clamp(desiredHeight, 240, vh - margin * 2);

  const left = clamp(
    Math.round(anchorRect.left),
    margin,
    Math.max(margin, vw - width - margin),
  );

  const belowTop = Math.round(anchorRect.bottom + gap);
  const aboveTop = Math.round(anchorRect.top - height - gap);
  const canPlaceBelow = belowTop + height + margin <= vh;
  const canPlaceAbove = aboveTop >= margin;
  const top = canPlaceBelow ? belowTop : (canPlaceAbove ? aboveTop : clamp(belowTop, margin, vh - height - margin));

  return { top, left, width, height };
}

export function BlocksuiteMentionProfilePopover(props: {
  state: BlocksuiteMentionProfilePopoverState | null;
  onRequestClose: () => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const { state, onRequestClose, onHoverChange } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted)
      return;
    if (!state)
      return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onRequestClose();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root)
        return;
      if (e.target instanceof Node && root.contains(e.target))
        return;
      onRequestClose();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [mounted, onRequestClose, state]);

  const style = useMemo(() => {
    if (!state)
      return null;
    const { top, left, width, height } = buildPopoverPosition(state.anchorRect, 420, 520);
    return {
      position: "fixed" as const,
      top,
      left,
      width,
      height,
      zIndex: 9999,
    };
  }, [state]);

  if (!mounted)
    return null;
  if (!state || !style)
    return null;
  if (typeof document === "undefined")
    return null;

  const src = `/profile/${encodeURIComponent(state.userId)}`;

  return createPortal(
    <div
      ref={rootRef}
      style={style}
      className="rounded-xl overflow-hidden border border-base-300 bg-base-100 shadow-2xl"
      onPointerEnter={() => onHoverChange?.(true)}
      onPointerLeave={() => onHoverChange?.(false)}
    >
      <div className="w-full h-full">
        <iframe
          title="user-profile-popover"
          src={src}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>,
    document.body,
  );
}


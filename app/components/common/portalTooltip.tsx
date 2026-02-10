import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipPlacement = "right" | "left" | "top" | "bottom";

interface PortalTooltipProps {
  label?: string;
  placement?: TooltipPlacement;
  gap?: number;
  children: React.ReactNode;
  className?: string;
}

const DEFAULT_GAP = 8;
const VIEWPORT_PADDING = 8;

export default function PortalTooltip({
  label,
  placement = "right",
  gap = DEFAULT_GAP,
  children,
  className,
}: PortalTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const compute = useCallback(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) {
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    let left = 0;
    let top = 0;
    const horizontalCenter = anchorRect.left + (anchorRect.width / 2) - (tipRect.width / 2);
    const verticalCenter = anchorRect.top + (anchorRect.height / 2) - (tipRect.height / 2);

    switch (placement) {
      case "left":
        left = anchorRect.left - gap - tipRect.width;
        top = verticalCenter;
        if (left < VIEWPORT_PADDING) {
          left = anchorRect.right + gap;
        }
        break;
      case "top":
        left = horizontalCenter;
        top = anchorRect.top - gap - tipRect.height;
        if (top < VIEWPORT_PADDING) {
          top = anchorRect.bottom + gap;
        }
        break;
      case "bottom":
        left = horizontalCenter;
        top = anchorRect.bottom + gap;
        if (top + tipRect.height > viewportH - VIEWPORT_PADDING) {
          top = anchorRect.top - gap - tipRect.height;
        }
        break;
      default:
        left = anchorRect.right + gap;
        top = verticalCenter;
        if (left + tipRect.width > viewportW - VIEWPORT_PADDING) {
          left = anchorRect.left - gap - tipRect.width;
        }
        break;
    }

    left = clamp(left, VIEWPORT_PADDING, viewportW - tipRect.width - VIEWPORT_PADDING);
    top = clamp(top, VIEWPORT_PADDING, viewportH - tipRect.height - VIEWPORT_PADDING);
    setPos({ left, top });
  }, [gap, placement]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      compute();
    });
    return () => window.cancelAnimationFrame(id);
  }, [compute, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handler = () => compute();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [compute, isOpen]);

  if (!label) {
    return <>{children}</>;
  }

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {children}
      {isOpen && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className={className ?? "portal-tooltip pointer-events-none z-[9999] rounded bg-black px-2 py-1 text-xs text-white shadow-md"}
          style={{
            position: "fixed",
            left: pos?.left ?? 0,
            top: pos?.top ?? 0,
          }}
        >
          <span className="whitespace-nowrap">{label}</span>
        </div>,
        document.body,
      )}
    </span>
  );
}

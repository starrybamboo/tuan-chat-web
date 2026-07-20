import React from "react";

import { useScreenSize } from "@/components/common/customHooks/useScreenSize";

const DRAWER_RESIZE_KEYBOARD_STEP = 24;

type VaulSideDrawerProps = {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  /** 抽屉面板（内部容器）额外 class，可用于覆盖圆角/阴影等 */
  panelClassName?: string;
  /** 抽屉内容的宽度，默认 310px */
  width?: number | string;
  /** 最小宽度（仅在可拖拽时生效） */
  minWidth?: number;
  /** 最大宽度（仅在可拖拽时生效） */
  maxWidth?: number;
  /** 宽度变化回调（提供后启用拖拽） */
  onWidthChange?: (width: number) => void;
  /** 拖拽手柄位置 */
  handlePosition?: "left" | "right";
  /** 在移动端以覆盖层方式显示（不挤压布局） */
  overlayOnMobile?: boolean;
}

/**
 * 简单的侧边抽屉组件
 * 浮在内容上方，不占据空间
 * - 无遮罩层
 * - 高度不占满全屏（预留 header 和输入框空间）
 */
export function VaulSideDrawer({
  isOpen,
  children,
  className = "",
  panelClassName = "",
  width = 310,
  minWidth,
  maxWidth,
  onWidthChange,
  handlePosition = "left",
  overlayOnMobile = false,
}: VaulSideDrawerProps) {
  const screenSize = useScreenSize();
  const shouldOverlayOnMobile = overlayOnMobile && screenSize === "sm";
  const widthNumber = typeof width === "number" ? width : null;
  const resolvedMin = Number.isFinite(minWidth) ? Math.max(0, minWidth!) : (widthNumber ?? 0);
  const resolvedMax = Number.isFinite(maxWidth) ? Math.max(resolvedMin, maxWidth!) : (widthNumber ?? resolvedMin);
  const clamp = React.useCallback((value: number) => {
    const safeValue = Number.isFinite(value) ? value : resolvedMin;
    return Math.min(resolvedMax, Math.max(resolvedMin, safeValue));
  }, [resolvedMax, resolvedMin]);
  const renderedWidthNumber = widthNumber != null ? clamp(widthNumber) : null;
  const widthStyle = renderedWidthNumber != null ? `${renderedWidthNumber}px` : width;
  const mobileMaxWidth = "calc(100vw - 1rem)";
  const canResize = Boolean(onWidthChange)
    && widthNumber != null
    && Number.isFinite(resolvedMin)
    && Number.isFinite(resolvedMax)
    && !shouldOverlayOnMobile;
  const isDragging = React.useRef(false);
  const startX = React.useRef(0);
  const startWidth = React.useRef(0);

  const handlePointerDown = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!canResize)
      return;
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = renderedWidthNumber ?? widthNumber ?? 0;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const pointerId = (e as any).pointerId;
    try {
      (e.target as Element)?.setPointerCapture?.(pointerId);
    }
    catch {
      // ignore
    }

    const handlePointerMove = (ev: PointerEvent) => {
      if (!isDragging.current)
        return;
      const deltaX = handlePosition === "left"
        ? (startX.current - ev.clientX)
        : (ev.clientX - startX.current);
      const nextWidth = clamp(startWidth.current + deltaX);
      onWidthChange?.(nextWidth);
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      try {
        (e.target as Element)?.releasePointerCapture?.(pointerId);
      }
      catch {
        // ignore
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }, [canResize, clamp, handlePosition, onWidthChange, renderedWidthNumber, widthNumber]);

  const handleResizeHandleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canResize || renderedWidthNumber == null) {
      return;
    }

    const visualDelta = event.key === "ArrowLeft"
      ? -DRAWER_RESIZE_KEYBOARD_STEP
      : event.key === "ArrowRight"
        ? DRAWER_RESIZE_KEYBOARD_STEP
        : 0;
    const nextWidth = event.key === "Home"
      ? resolvedMin
      : event.key === "End"
        ? resolvedMax
        : visualDelta === 0
          ? null
          : clamp(renderedWidthNumber + (handlePosition === "left" ? -visualDelta : visualDelta));

    if (nextWidth == null) {
      return;
    }

    event.preventDefault();
    onWidthChange?.(nextWidth);
  }, [canResize, clamp, handlePosition, onWidthChange, renderedWidthNumber, resolvedMax, resolvedMin]);

  const resizeHandleA11yProps = renderedWidthNumber == null
    ? {}
    : {
        "aria-valuemax": Math.round(resolvedMax),
        "aria-valuemin": Math.round(resolvedMin),
        "aria-valuenow": Math.round(renderedWidthNumber),
      };

  if (!isOpen) {
    return null;
  }

  if (shouldOverlayOnMobile) {
    return (
      <div className={`
        absolute inset-0 z-40 pointer-events-none
        ${className}
      `}>
        <div
          className="h-full min-h-0 w-full flex pointer-events-auto"
          style={{
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <div
            className={`
              bg-white/40
              dark:bg-base-300/25
              backdrop-blur-xl border border-white/40
              dark:border-white/10
              h-full w-full grow flex flex-col rounded-none shadow-xl
              overflow-hidden relative
              ${panelClassName}
            `}
          >
            {canResize && (
              <div
                className={`
                  group/vaul-resize-handle absolute top-0 h-full w-6 cursor-col-resize z-50
                  ${handlePosition === "left" ? `left-0` : `right-0`}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30
                `}
                onPointerDown={handlePointerDown}
                onKeyDown={handleResizeHandleKeyDown}
                style={{ touchAction: "none" }}
                title="拖拽调整宽度"
                role="separator"
                tabIndex={0}
                aria-label="调整抽屉宽度"
                aria-orientation="vertical"
                {...resizeHandleA11yProps}
              >
                <div className={`
                  absolute top-0 h-full w-px bg-info transition-colors
                  group-hover/vaul-resize-handle:bg-info/70
                  group-active/vaul-resize-handle:bg-info
                  group-focus-visible/vaul-resize-handle:bg-info
                  ${handlePosition === "left" ? `left-0` : `right-0`}
                `} />
              </div>
            )}
            <div className="flex-1 min-w-0 h-full flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        relative z-40 h-full min-h-0 shrink-0 flex pointer-events-auto
        ${className}
      `}
      style={{
        width: widthStyle,
        maxWidth: mobileMaxWidth,
      }}
    >
      <div
        className={`
          bg-white/40
          dark:bg-base-300/25
          backdrop-blur-xl border border-white/40
          dark:border-white/10
          h-full w-full grow flex flex-col rounded-none shadow-xl
          overflow-hidden relative
          ${panelClassName}
        `}
      >
        {canResize && (
          <div
            className={`
              group/vaul-resize-handle absolute top-0 h-full w-6 cursor-col-resize z-50
              ${handlePosition === "left" ? `left-0` : `right-0`}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30
            `}
            onPointerDown={handlePointerDown}
            onKeyDown={handleResizeHandleKeyDown}
            style={{ touchAction: "none" }}
            title="拖拽调整宽度"
            role="separator"
            tabIndex={0}
            aria-label="调整抽屉宽度"
            aria-orientation="vertical"
            {...resizeHandleA11yProps}
          >
            <div className={`
              absolute top-0 h-full w-px bg-info transition-colors
              group-hover/vaul-resize-handle:bg-info/70
              group-active/vaul-resize-handle:bg-info
              group-focus-visible/vaul-resize-handle:bg-info
              ${handlePosition === "left" ? `left-0` : `right-0`}
            `} />
          </div>
        )}
        <div className="flex-1 min-w-0 h-full flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

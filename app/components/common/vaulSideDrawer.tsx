import React from "react";

interface VaulSideDrawerProps {
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
}: VaulSideDrawerProps) {
  const widthNumber = typeof width === "number" ? width : null;
  const resolvedMin = Number.isFinite(minWidth) ? Math.max(0, minWidth!) : (widthNumber ?? 0);
  const resolvedMax = Number.isFinite(maxWidth) ? Math.max(resolvedMin, maxWidth!) : (widthNumber ?? resolvedMin);
  const clamp = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : resolvedMin;
    return Math.min(resolvedMax, Math.max(resolvedMin, safeValue));
  };
  const renderedWidthNumber = widthNumber != null ? clamp(widthNumber) : null;
  const widthStyle = renderedWidthNumber != null ? `${renderedWidthNumber}px` : width;
  const mobileMaxWidth = "calc(100vw - 1rem)";
  const canResize = Boolean(onWidthChange) && widthNumber != null && Number.isFinite(resolvedMin) && Number.isFinite(resolvedMax);
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`h-full min-h-0 shrink-0 flex ${className}`}
      style={{
        width: widthStyle,
        maxWidth: mobileMaxWidth,
      }}
    >
      <div
        className={`bg-white/40 dark:bg-slate-950/25 backdrop-blur-xl border border-white/40 dark:border-white/10 h-full w-full grow flex flex-col rounded-none shadow-xl overflow-hidden relative ${panelClassName}`}
      >
        {canResize && (
          <div
            className={`absolute top-0 h-full w-3 cursor-col-resize z-50 ${handlePosition === "left" ? "left-0" : "right-0"} hover:bg-info/15 transition-colors`}
            onPointerDown={handlePointerDown}
            style={{ touchAction: "none" }}
            title="拖拽调整宽度"
          >
            <div className={`absolute top-0 h-full w-px bg-base-300 ${handlePosition === "left" ? "left-0" : "right-0"}`} />
          </div>
        )}
        <div className="flex-1 min-w-0 h-full flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}


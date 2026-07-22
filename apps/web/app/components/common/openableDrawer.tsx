import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { ScreenSize } from "@/utils/getScreenSize";

import { useHorizontalResizeDrag } from "@/components/common/customHooks/useHorizontalResizeDrag";
import { getScreenSize } from "@/utils/getScreenSize";

const DRAWER_RESIZE_KEYBOARD_STEP = 24;

/**
 * 在大屏与中屏幕的时候，开启会直接返回children，在小屏幕的时候，开启会占满父元素的宽度
 * 注意！！ 若要此组件正常工作，请给父组件加上relative
 * @param isOpen 是否开启这个抽屉
 * @param children 抽屉元素
 * @param className
 * @param overWrite 设置为true时，抽屉在非移动端也会直接在父元素上方显示，而不是在两边
 * @param initialWidth 初始宽度（仅在大屏时生效）
 * @param minWidth 最小宽度（仅在大屏时生效）
 * @param maxWidth 最大宽度（仅在大屏时生效）
 * @param onWidthChange 宽度变化回调
 * @param onCollapseBelowMin 拖拽目标宽度小于最小宽度一半时触发折叠
 * @param onDragCollapsePreviewChange 拖拽目标宽度小于折叠阈值时，同步临时折叠预览状态
 * @param animationDuration 打开/关闭动画时长。默认保持很快，用于频道树等即时侧栏。
 * @constructor
 */
export function OpenAbleDrawer({
  isOpen,
  children,
  className,
  overWrite,
  width: controlledWidth,
  initialWidth = 300,
  minWidth = 300,
  maxWidth = 600,
  minRemainingWidth = 0,
  onWidthChange,
  onCollapseBelowMin,
  onDragCollapsePreviewChange,
  handlePosition = "left",
  animationDuration = 0.02,
}: {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  overWrite?: boolean;
  /** 外部受控宽度（提供后将同步内部宽度） */
  width?: number;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /**
   * 在非小屏/非覆盖模式下，给同级内容（通常是主聊天区）预留的最小宽度。
   * 抽屉会根据父容器宽度动态收紧 min/max，避免把主区域挤到异常宽度。
   */
  minRemainingWidth?: number;
  onWidthChange?: (width: number) => void;
  onCollapseBelowMin?: () => void;
  onDragCollapsePreviewChange?: (isPreviewingCollapse: boolean) => void;
  handlePosition?: "left" | "right";
  animationDuration?: number;
}) {
  // IMPORTANT: 避免 SSR hydration mismatch。
  // 服务器端无法获知真实屏幕尺寸，首屏统一按 "lg" 渲染；客户端 mount 后再计算真实值并触发一次更新。
  const [screenSize, setScreenSize] = useState<ScreenSize>("lg");

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const update = () => {
      try {
        setScreenSize(getScreenSize());
      }
      catch {
        setScreenSize("lg");
      }
    };

    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
    };
  }, []);

  const clamp = useCallback((value: number, min: number, max: number) => {
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin;
    const lo = Math.min(safeMin, safeMax);
    const hi = Math.max(safeMin, safeMax);
    const safeValue = Number.isFinite(value) ? value : lo;
    return Math.min(hi, Math.max(lo, safeValue));
  }, []);

  const getBaseBounds = useCallback(() => {
    const safeMinWidth = Number.isFinite(minWidth) ? minWidth : 0;
    const safeMaxWidth = Number.isFinite(maxWidth) ? maxWidth : safeMinWidth;
    const baseMin = Math.max(0, safeMinWidth);
    const baseMax = Math.max(baseMin, safeMaxWidth);
    return { min: baseMin, max: baseMax };
  }, [maxWidth, minWidth]);

  const [bounds, setBounds] = useState(() => getBaseBounds());
  const [width, setWidth] = useState(() => {
    const base = getBaseBounds();
    const seed = Number.isFinite(controlledWidth) ? controlledWidth! : initialWidth;
    return clamp(seed, base.min, base.max);
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragCollapsed, setIsDragCollapsed] = useState(false);
  const [isDragCollapseAnimating, setIsDragCollapseAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragCollapsedRef = useRef(false);
  const shouldCommitCollapseRef = useRef(false);
  const collapseAnimationTimerRef = useRef<number | null>(null);

  const scheduleCollapseAnimation = useCallback(() => {
    setIsDragCollapseAnimating(true);
    if (collapseAnimationTimerRef.current != null) {
      window.clearTimeout(collapseAnimationTimerRef.current);
    }
    collapseAnimationTimerRef.current = window.setTimeout(() => {
      collapseAnimationTimerRef.current = null;
      setIsDragCollapseAnimating(false);
    }, 180);
  }, []);

  const setDragCollapsedPreview = useCallback((nextCollapsed: boolean) => {
    if (isDragCollapsedRef.current === nextCollapsed) {
      return;
    }
    isDragCollapsedRef.current = nextCollapsed;
    scheduleCollapseAnimation();
    setIsDragCollapsed(nextCollapsed);
    onDragCollapsePreviewChange?.(nextCollapsed);
  }, [onDragCollapsePreviewChange, scheduleCollapseAnimation]);

  useEffect(() => {
    if (isOpen) {
      shouldCommitCollapseRef.current = false;
      isDragCollapsedRef.current = false;
      setIsDragCollapsed(false);
      setIsDragCollapseAnimating(false);
      onDragCollapsePreviewChange?.(false);
    }
  }, [isOpen, onDragCollapsePreviewChange]);

  useEffect(() => {
    return () => {
      if (collapseAnimationTimerRef.current != null) {
        window.clearTimeout(collapseAnimationTimerRef.current);
      }
    };
  }, []);

  const recomputeBounds = useCallback(() => {
    const base = getBaseBounds();
    const baseMin = base.min;
    const baseMax = base.max;

    const safeMinRemainingWidth = Number.isFinite(minRemainingWidth) ? Math.max(0, minRemainingWidth) : 0;

    // 未要求保留同级内容宽度时，直接使用调用方给出的 min/max。
    // 左侧栏的父 flex 容器会随抽屉内容变宽；若再用父宽反算 max，会导致需要多次拖拽才能拉满。
    if (!isOpen || screenSize === "sm" || overWrite || safeMinRemainingWidth <= 0) {
      return { min: baseMin, max: baseMax };
    }

    const containerRect = containerRef.current?.getBoundingClientRect();
    const parentWidth = containerRef.current?.parentElement?.clientWidth ?? 0;
    const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
    // 父 flex 可能随抽屉一起变宽；结合视口位置才能在窄桌面保住同级主内容宽度。
    const availableViewportWidth = containerRect && viewportWidth > 0
      ? handlePosition === "right"
        ? Math.max(0, viewportWidth - containerRect.left)
        : Math.max(0, containerRect.right)
      : 0;
    const constraintWidth = Math.max(parentWidth, availableViewportWidth);
    if (!constraintWidth) {
      return { min: baseMin, max: baseMax };
    }

    const maxAllowed = Math.max(0, constraintWidth - safeMinRemainingWidth);
    const effectiveMax = Math.min(baseMax, maxAllowed);
    const effectiveMin = Math.min(baseMin, effectiveMax);
    return { min: effectiveMin, max: effectiveMax };
  }, [getBaseBounds, handlePosition, isOpen, minRemainingWidth, overWrite, screenSize]);

  const syncBoundsAndWidth = useCallback(() => {
    const next = recomputeBounds();
    setBounds(prev => (prev.min === next.min && prev.max === next.max ? prev : next));
    setWidth((prev) => {
      const nextWidth = clamp(prev, next.min, next.max);
      return nextWidth === prev ? prev : nextWidth;
    });
  }, [clamp, recomputeBounds]);

  useLayoutEffect(() => {
    queueMicrotask(() => syncBoundsAndWidth());
  }, [syncBoundsAndWidth]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }
    const onResize = () => {
      syncBoundsAndWidth();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen, syncBoundsAndWidth]);

  useEffect(() => {
    if (!Number.isFinite(controlledWidth)) {
      return;
    }
    queueMicrotask(() => setWidth((prev) => {
      const nextWidth = clamp(controlledWidth as number, bounds.min, bounds.max);
      return nextWidth === prev ? prev : nextWidth;
    }));
  }, [bounds.max, bounds.min, clamp, controlledWidth]);

  useEffect(() => {
    if (Number.isFinite(controlledWidth)) {
      return;
    }

    queueMicrotask(() => setWidth((prev) => {
      const nextWidth = clamp(initialWidth, bounds.min, bounds.max);
      return nextWidth === prev ? prev : nextWidth;
    }));
  }, [bounds.max, bounds.min, clamp, controlledWidth, initialWidth]);

  useEffect(() => {
    if (!isOpen || typeof ResizeObserver === "undefined") {
      return;
    }

    const parent = containerRef.current?.parentElement;
    if (!parent) {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncBoundsAndWidth();
    });
    observer.observe(parent);

    return () => {
      observer.disconnect();
    };
  }, [isOpen, syncBoundsAndWidth]);

  const renderedWidth = clamp(width, bounds.min, bounds.max);

  const handlePointerDown = useHorizontalResizeDrag<HTMLDivElement>({
    capturePointer: false,
    getStartSize: () => width,
    onResizeStart: () => {
      setIsResizing(true);
    },
    resolveNextSize: ({ startSize, deltaX }) => {
      const directedDeltaX = handlePosition === "left" ? -deltaX : deltaX;
      const rawNextSize = startSize + directedDeltaX;
      const collapseThreshold = bounds.min / 2;
      // 先卡在 minWidth；继续拖到最小宽度一半以下时才触发折叠，避免误触。
      if (onCollapseBelowMin && rawNextSize < collapseThreshold) {
        shouldCommitCollapseRef.current = true;
        setDragCollapsedPreview(true);
        return null;
      }
      shouldCommitCollapseRef.current = false;
      setDragCollapsedPreview(false);
      return clamp(rawNextSize, bounds.min, bounds.max);
    },
    onResize: (newWidth) => {
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    },
    onResizeEnd: () => {
      setIsResizing(false);
      if (!shouldCommitCollapseRef.current) {
        setDragCollapsedPreview(false);
        return;
      }
      shouldCommitCollapseRef.current = false;
      setDragCollapsedPreview(false);
      onCollapseBelowMin?.();
    },
  });

  const handleResizeHandleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const visualDelta = event.key === "ArrowLeft"
      ? -DRAWER_RESIZE_KEYBOARD_STEP
      : event.key === "ArrowRight"
        ? DRAWER_RESIZE_KEYBOARD_STEP
        : 0;
    const nextWidth = event.key === "Home"
      ? bounds.min
      : event.key === "End"
        ? bounds.max
        : visualDelta === 0
          ? null
          : clamp(renderedWidth + (handlePosition === "left" ? -visualDelta : visualDelta), bounds.min, bounds.max);

    if (nextWidth == null) {
      return;
    }

    event.preventDefault();
    shouldCommitCollapseRef.current = false;
    setDragCollapsedPreview(false);
    setWidth(nextWidth);
    onWidthChange?.(nextWidth);
  }, [bounds.max, bounds.min, clamp, handlePosition, onWidthChange, renderedWidth, setDragCollapsedPreview]);

  if (screenSize === "sm" || overWrite) {
    return (
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className={`
              absolute inset-0 z-40 w-full pointer-events-auto
              ${className ?? ""}
            `}
            initial={{ opacity: 0, x: handlePosition === "right" ? -18 : 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: handlePosition === "right" ? -18 : 18 }}
            transition={{ duration: animationDuration, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const visibleWidth = isDragCollapsed ? 0 : Math.max(0, renderedWidth);
  const visibleOpacity = isDragCollapsed ? 0 : 1;
  const widthAnimationDuration = isDragCollapseAnimating ? 0.16 : isResizing ? 0 : animationDuration;
  const opacityAnimationDuration = isDragCollapseAnimating ? 0.12 : isResizing ? 0 : Math.min(animationDuration, 0.12);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          ref={containerRef}
          className={`
            relative min-w-0 z-40 pointer-events-auto overflow-hidden
            ${className ?? ""}
          `}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: visibleWidth, opacity: visibleOpacity }}
          exit={{ width: 0, opacity: 0 }}
          transition={{
            width: { duration: widthAnimationDuration, ease: "easeOut" },
            opacity: { duration: opacityAnimationDuration },
          }}
          style={{ maxWidth: "100%" }}
        >
          <div
            className={`
              group/openable-resize-handle absolute top-0 h-full w-6 cursor-col-resize z-2000
              ${handlePosition === "left" ? `left-0` : `right-0`}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30
              pointer-events-auto
            `}
            onPointerDown={handlePointerDown}
            onKeyDown={handleResizeHandleKeyDown}
            style={{ touchAction: "none" }}
            title="拖拽调整宽度"
            role="separator"
            tabIndex={0}
            aria-label="调整抽屉宽度"
            aria-orientation="vertical"
            aria-valuemin={Math.round(bounds.min)}
            aria-valuemax={Math.round(bounds.max)}
            aria-valuenow={Math.round(renderedWidth)}
          >
            <div
              className={`
                absolute top-0 h-full w-0.5 bg-base-300 dark:bg-white/10 transition-colors
                group-hover/openable-resize-handle:bg-info/70
                group-active/openable-resize-handle:bg-info
                group-focus-visible/openable-resize-handle:bg-info
                ${handlePosition === "left" ? `left-0` : `right-0`}
              `}
            />
          </div>
          <div className="h-full min-w-0" style={{ width: Math.max(0, renderedWidth) }}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

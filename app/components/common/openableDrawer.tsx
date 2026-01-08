import type { ScreenSize } from "@/utils/getScreenSize";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getScreenSize } from "@/utils/getScreenSize";

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
 * @constructor
 */
export function OpenAbleDrawer({
  isOpen,
  children,
  className,
  overWrite,
  initialWidth = 300,
  minWidth = 300,
  maxWidth = 600,
  minRemainingWidth = 0,
  onWidthChange,
  handlePosition = "left",
}: {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  overWrite?: boolean;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /**
   * 在非小屏/非覆盖模式下，给同级内容（通常是主聊天区）预留的最小宽度。
   * 抽屉会根据父容器宽度动态收紧 min/max，避免把主区域挤到异常宽度。
   */
  minRemainingWidth?: number;
  onWidthChange?: (width: number) => void;
  handlePosition?: "left" | "right";
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
    return clamp(initialWidth, base.min, base.max);
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const recomputeBounds = useCallback(() => {
    const base = getBaseBounds();
    const baseMin = base.min;
    const baseMax = base.max;

    // 覆盖模式或小屏：不需要根据父容器收紧
    if (!isOpen || screenSize === "sm" || overWrite) {
      return { min: baseMin, max: baseMax };
    }

    const parentWidth = containerRef.current?.parentElement?.clientWidth;
    if (!parentWidth) {
      return { min: baseMin, max: baseMax };
    }

    const safeMinRemainingWidth = Number.isFinite(minRemainingWidth) ? Math.max(0, minRemainingWidth) : 0;
    const maxAllowed = Math.max(0, parentWidth - safeMinRemainingWidth);
    const effectiveMax = Math.min(baseMax, maxAllowed);
    const effectiveMin = Math.min(baseMin, effectiveMax);
    return { min: effectiveMin, max: effectiveMax };
  }, [getBaseBounds, isOpen, minRemainingWidth, overWrite, screenSize]);

  useLayoutEffect(() => {
    const next = recomputeBounds();
    setBounds(next);
    setWidth(prev => clamp(prev, next.min, next.max));
  }, [clamp, recomputeBounds]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }
    const onResize = () => {
      const next = recomputeBounds();
      setBounds(next);
      setWidth(prev => clamp(prev, next.min, next.max));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [clamp, isOpen, recomputeBounds]);

  const renderedWidth = clamp(width, bounds.min, bounds.max);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current)
        return;

      const deltaX = handlePosition === "left"
        ? (startX.current - e.clientX) // 向左拖拽为正值
        : (e.clientX - startX.current); // 向右拖拽为正值
      const newWidth = clamp(startWidth.current + deltaX, bounds.min, bounds.max);
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width, clamp, bounds.min, bounds.max, onWidthChange, handlePosition]);

  if (!isOpen) {
    return null;
  }

  if (screenSize === "sm" || overWrite) {
    return (
      <div className={`w-full absolute ${className}`}>
        {children}
      </div>
    );
  }

  // 大屏情况下，返回可调整宽度的容器
  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: `${Math.max(0, renderedWidth)}px` }}
    >
      {/* 拖拽手柄（默认在左侧） */}
      <div
        className={`absolute top-0 h-full w-3 cursor-col-resize z-[1000] ${handlePosition === "left" ? "left-0" : "right-0"} hover:bg-info/20 transition-colors`}
        onMouseDown={handleMouseDown}
        title="拖拽调整宽度"
      >
        <div
          className={`absolute top-0 h-full w-px bg-base-300 ${handlePosition === "left" ? "left-0" : "right-0"}`}
        />
      </div>
      {children}
    </div>
  );
}

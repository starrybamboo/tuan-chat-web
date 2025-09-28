import { getScreenSize } from "@/utils/getScreenSize";
import React, { useCallback, useRef, useState } from "react";

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
  onWidthChange,
}: {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  overWrite?: boolean;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange?: (width: number) => void;
}) {
  const [width, setWidth] = useState(initialWidth);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current)
        return;

      const deltaX = startX.current - e.clientX; // 向左拖拽为正值
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + deltaX));
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
  }, [width, minWidth, maxWidth, onWidthChange]);

  if (!isOpen) {
    return null;
  }

  if (getScreenSize() === "sm" || overWrite) {
    return (
      <div className={`w-full absolute ${className}`}>
        {children}
      </div>
    );
  }

  // 大屏情况下，返回可调整宽度的容器
  return (
    <div className={`relative ${className}`} style={{ width: `${width}px` }}>
      {/* 左侧拖拽手柄 */}
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-info/30 transition-colors z-30"
        onMouseDown={handleMouseDown}
        title="拖拽调整宽度"
      />
      {children}
    </div>
  );
}

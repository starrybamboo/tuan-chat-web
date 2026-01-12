import React, { useEffect, useState } from "react";
import { useIsMobile } from "@/utils/getScreenSize";

interface VaulSideDrawerProps {
  isOpen: boolean;
  children: React.ReactNode;
  direction?: "left" | "right";
  className?: string;
  /** 抽屉内容的宽度，默认 310px */
  width?: number | string;
  /** 由外部控制关闭 */
  onClose?: () => void;
  /** 可选：显示可拖拽调整宽度的手柄 */
  showResizeHandle?: boolean;
  onResizeHandleMouseDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  resizeHandleClassName?: string;
  resizeHandleIndicatorClassName?: string;
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
  direction = "right",
  className = "",
  width = 310,
  onClose,
  showResizeHandle = false,
  onResizeHandleMouseDown,
  resizeHandleClassName = "",
  resizeHandleIndicatorClassName = "",
}: VaulSideDrawerProps) {
  const isMobile = useIsMobile();
  const widthStyle = typeof width === "number" ? `${width}px` : width;
  const mobileMaxWidth = "calc(100vw - 1rem)";

  // 用于控制动画：mounted 表示 DOM 是否存在，visible 表示是否展示（触发动画）
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // 下一帧再设置 visible，确保 DOM 已挂载，动画能触发
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    }
    else {
      setVisible(false);
      // 等动画结束后再卸载 DOM
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 根据方向设置位置样式，top/bottom 预留空间给 header 和输入框
  const positionClasses = direction === "left"
    ? (isMobile ? "left-2" : "left-2 top-24")
    : (isMobile ? "right-2" : "right-2 top-24");
  const bottomOffset = isMobile ? "64px" : "calc(var(--chat-composer-height, 9rem) + 56px)";

  const translateX = direction === "left"
    ? (visible ? "translateX(0)" : "translateX(-100%)")
    : (visible ? "translateX(0)" : "translateX(100%)");
  const resizeHandlePositionClass = direction === "left" ? "border-l" : "border-r";

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`${positionClasses} fixed z-[100] outline-none flex ${className}`}
      style={{
        width: widthStyle,
        maxWidth: mobileMaxWidth,
        transform: translateX,
        opacity: visible ? 1 : 0,
        transition: "transform 200ms ease-out, opacity 200ms ease-out",
        top: isMobile ? "40px" : undefined,
        bottom: bottomOffset,
      }}
    >
      <div className="bg-base-100 h-full w-full grow flex flex-col rounded-2xl shadow-xl overflow-hidden relative">
        {isMobile && onClose && (
          <button
            type="button"
            aria-label="Close drawer"
            className="absolute right-2 top-2 z-10 btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            ✕
          </button>
        )}
        {showResizeHandle
          ? (
              <div className="flex h-full">
                {direction === "right" && (
                  <div
                    className={`w-10 shrink-0 ${resizeHandlePositionClass} border-base-200 bg-base-100/70 cursor-col-resize flex items-center justify-center ${resizeHandleClassName}`}
                    onPointerDown={onResizeHandleMouseDown}
                    style={{ touchAction: "none" }}
                  >
                    <div
                      aria-hidden
                      className={`h-96 w-1.5 rounded-full bg-base-300 ${resizeHandleIndicatorClassName}`}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 h-full">
                  {children}
                </div>
                {direction === "left" && (
                  <div
                    className={`w-10 shrink-0 ${resizeHandlePositionClass} border-base-200 bg-base-100/70 cursor-col-resize flex items-center justify-center ${resizeHandleClassName}`}
                    onPointerDown={onResizeHandleMouseDown}
                    style={{ touchAction: "none" }}
                  >
                    <div
                      aria-hidden
                      className={`h-96 w-1.5 rounded-full bg-base-300 ${resizeHandleIndicatorClassName}`}
                    />
                  </div>
                )}
              </div>
            )
          : (
              children
            )}
      </div>
    </div>
  );
}

export default VaulSideDrawer;

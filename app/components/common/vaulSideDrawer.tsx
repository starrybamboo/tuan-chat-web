import React, { useEffect, useState } from "react";

interface VaulSideDrawerProps {
  isOpen: boolean;
  children: React.ReactNode;
  direction?: "left" | "right";
  className?: string;
  /** 抽屉内容的宽度，默认 310px */
  width?: number | string;
  /** 点击外部时触发关闭 */
  onClose?: () => void;
}

/**
 * 简单的侧边抽屉组件
 * 浮在内容上方，不占据空间
 * - 无遮罩层
 * - 高度不占满全屏（预留 header 和输入框空间）
 * - 点击外部可收起（传入 onClose）
 */
export function VaulSideDrawer({
  isOpen,
  children,
  direction = "right",
  className = "",
  width = 310,
  onClose,
}: VaulSideDrawerProps) {
  const widthStyle = typeof width === "number" ? `${width}px` : width;

  // 用于控制动画：mounted 表示 DOM 是否存在，visible 表示是否展示（触发动画）
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const drawerRef = React.useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!mounted || !onClose) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (drawerRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
    };
  }, [mounted, onClose]);

  // 根据方向设置位置样式，top/bottom 预留空间给 header 和输入框
  const positionClasses = direction === "left"
    ? "left-2 top-24 bottom-36"
    : "right-2 top-24 bottom-36";

  const translateX = direction === "left"
    ? (visible ? "translateX(0)" : "translateX(-100%)")
    : (visible ? "translateX(0)" : "translateX(100%)");

  if (!mounted) {
    return null;
  }

  return (
    <div
      ref={drawerRef}
      className={`${positionClasses} fixed z-[100] outline-none flex ${className}`}
      style={{
        width: widthStyle,
        transform: translateX,
        opacity: visible ? 1 : 0,
        transition: "transform 200ms ease-out, opacity 200ms ease-out",
      }}
    >
      <div className="bg-base-100 h-full w-full grow flex flex-col rounded-2xl shadow-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default VaulSideDrawer;

import React from "react";

interface VaulSideDrawerProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  /** 抽屉面板（内部容器）额外 class，可用于覆盖圆角/阴影等 */
  panelClassName?: string;
  /** 抽屉内容的宽度，默认 310px */
  width?: number | string;
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
}: VaulSideDrawerProps) {
  const widthStyle = typeof width === "number" ? `${width}px` : width;
  const mobileMaxWidth = "calc(100vw - 1rem)";

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
        <div className="flex-1 min-w-0 h-full flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

export default VaulSideDrawer;

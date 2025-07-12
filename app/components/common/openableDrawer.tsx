import { getScreenSize } from "@/utils/getScreenSize";
import React from "react";

/**
 * 在大屏与中屏幕的时候，开启会直接返回children，在小屏幕的时候，开启会占满父元素的宽度
 * @param isOpen 是否开启这个抽屉
 * @param children 抽屉元素
 * @param className
 * @constructor
 */
export function OpenAbleDrawer({
  isOpen,
  children,
  className,
}: {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!isOpen) {
    return null;
  }
  if (getScreenSize() === "sm") {
    return (
      <div className={`w-full relative ${className}`}>
        {children}
      </div>
    );
  }
  return children;
}

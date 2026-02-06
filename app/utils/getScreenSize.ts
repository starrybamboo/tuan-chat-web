import { useEffect, useState } from "react";

export type ScreenSize = "sm" | "md" | "lg";

/**
 * 获取当前屏幕尺寸分类：
 * - sm: < 640px
 * - md: 640px - 1023px
 * - lg: >= 1024px
 */
export function getScreenSize(): ScreenSize {
  if (typeof window === "undefined") {
    return "lg";
  }
  const width = window.innerWidth;
  if (width < 640)
    return "sm";
  if (width < 1024)
    return "md";
  return "lg";
}

export function isMobileScreen() {
  if (typeof window === "undefined")
    return false;
  return window.innerWidth < 640;
}

/**
 * 响应式 Hook：监听是否为移动端
 * 会在屏幕尺寸变化时自动更新
 * 注意：初始固定为 false 以避免 SSR hydration mismatch
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    // 初始化媒体查询状态，避免首帧不一致
    setIsMobile(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

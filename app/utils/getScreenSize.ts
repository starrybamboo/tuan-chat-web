import { useEffect, useState } from "react";

export type ScreenSize = "sm" | "md" | "lg";

/**
 * 获取当前屏幕尺寸分? * - sm: < 640px
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
 * 响应?Hook：监听是否为移动?
 * 会在屏幕尺寸变化时自动更?
 * 注意：初始固?false 以避?SSR hydration mismatch
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    // 闁告帗绻傞～鎰板礌閺嶃劍顦х紒鏂款儏瀹撳棛鎷嬮崜褏鏋傛慨婵撶悼閳ユ﹢鎯冮崟顐熷亾?
    setIsMobile(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

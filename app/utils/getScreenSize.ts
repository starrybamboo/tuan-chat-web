import { useEffect, useState } from "react";

export type ScreenSize = "sm" | "md" | "lg";

/**
 * 获取当前屏幕尺寸分类
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

// 以下是角色模块用到的屏幕尺寸检测工具，暂时和 getScreenSize 原有的标准不统一

/**
 * 检测是否为大屏幕 (>= 1024px)
 */
export function isLgScreen() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

/**
 * 检测是否为中等屏幕及以上 (>= 768px)
 * 对应 getScreenSize 的 md 断点 (>= 640px)
 */
export function isMdScreen() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;
}

/**
 * 检测是否为移动端 (< 640px)
 * 即 getScreenSize 的 sm
 */
export function isMobileScreen() {
  if (typeof window === "undefined")
    return false;
  return window.innerWidth < 640;
}

/**
 * 响应式 Hook：监听是否为移动端
 * 会在屏幕尺寸变化时自动更新
 * 注意：初始值固定为 false 以避免 SSR hydration mismatch
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    // 初始化时立即设置正确的值
    setIsMobile(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

/**
 * 响应式 Hook：监听是否为中等屏幕及以上
 * 会在屏幕尺寸变化时自动更新
 * 注意：初始值固定为 true 以避免 SSR hydration mismatch
 */
export function useIsMdScreen() {
  const [isMd, setIsMd] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    // 初始化时立即设置正确的值
    setIsMd(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isMd;
}

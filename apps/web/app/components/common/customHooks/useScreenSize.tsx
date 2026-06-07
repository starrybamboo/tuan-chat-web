import { useEffect, useState } from "react";

/**
 * 自定义钩子，用于实时监听浏览器屏幕尺寸变化
 * @returns 当前屏幕尺寸类型："sm" | "md" | "lg"
 */
export function useScreenSize(): "sm" | "md" | "lg" {
  const [screenSize, setScreenSize] = useState<"sm" | "md" | "lg">(() => {
    if (typeof window === "undefined") {
      return "lg";
    }
    const width = window.innerWidth;
    if (width < 640)
      return "sm";
    if (width < 1024)
      return "md";
    return "lg";
  });

  useEffect(() => {
    function updateScreenSize() {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize("sm");
      }
      else if (width < 1024) {
        setScreenSize("md");
      }
      else {
        setScreenSize("lg");
      }
    }

    // 添加窗口大小变化监听器
    window.addEventListener("resize", updateScreenSize);

    // 组件卸载时清理监听器
    return () => {
      window.removeEventListener("resize", updateScreenSize);
    };
  }, []);

  return screenSize;
}

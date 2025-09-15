import type Vditor from "vditor"; // 类型导入，不会打包进运行时代码
import { getLocalStorageValue } from "@/components/common/customHooks/useLocalStorage";
import { useEffect, useRef } from "react";
import "vditor/dist/index.css";
import "./vditor-high-contrast-dark.css";

interface vditorProps {
  id: string;
  placeholder: string;
  onchange: (value: string) => void;
}

// 顶层预加载句柄，避免重复导入
let vditorPromise: Promise<any> | null = null;
function preloadVeditor() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!vditorPromise) {
    vditorPromise = import("vditor");
  }
  return vditorPromise;
}

// 顶层预热：模块加载后尽快预热（空闲时），减少首次打开编辑器的等待
if (typeof window !== "undefined") {
  const ric: ((cb: () => void) => void) | undefined = (window as any).requestIdleCallback;
  if (ric) {
    ric(() => preloadVeditor());
  }
  else {
    // 退化到微小延迟的预加载
    setTimeout(() => preloadVeditor(), 0);
  }
}

export default function Veditor({ id, placeholder, onchange }: vditorProps) {
  const vdRef = useRef<Vditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current; // 在 useEffect 内部保存 containerRef 的当前值

    let cancelled = false;
    (async () => {
      // 动态加载 vditor 以避免首屏阻塞，并利用上方的预加载
      const mod = await preloadVeditor();
      const V = (mod?.default ?? mod) as any;
      if (cancelled || !V || vdRef.current || !container) {
        return;
      }
      vdRef.current = new V(container, {
        minHeight: 300,
        preview: {},
        after: () => {
          if (placeholder && vdRef.current) {
            vdRef.current.setValue(placeholder);
          }
        },
        input: (value: string) => {
          if (vdRef.current) {
            onchange(value);
          }
        },
        mode: "wysiwyg",
        cache: { enable: false },
        theme: getLocalStorageValue("reverseDarkMode", false) ? "classic" : "dark",
      });
    })();

    // 监听主题变化
    const handleThemeChange = () => {
      if (vdRef.current) {
        const isDarkMode = getLocalStorageValue("reverseDarkMode", false);
        vdRef.current.setTheme(isDarkMode ? "classic" : "dark");
      }
    };

    // 创建一个 MutationObserver 来监听 DOM 属性变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          handleThemeChange();
        }
      });
    });

    // 开始观察 html 元素的属性变化
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      // 断开 observer 连接
      observer.disconnect();
      cancelled = true;
      // 组件卸载时销毁实例
      if (vdRef.current) {
        try {
          vdRef.current.destroy();
        }
        catch (e) {
          console.warn("Error destroying Vditor:", e);
        }
        vdRef.current = null;
      }
    };
  }, [placeholder, onchange]); // 移除 theme 依赖

  return (
    <div id={id} ref={containerRef} className="vditor">
    </div>
  );
}

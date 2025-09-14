import { getLocalStorageValue } from "@/components/common/customHooks/useLocalStorage";
import { useEffect, useRef } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";
import "./vditor-high-contrast-dark.css";

interface vditorProps {
  id: string;
  placeholder: string;
  onchange: (value: string) => void;
}

export default function Veditor({ id, placeholder, onchange }: vditorProps) {
  const vdRef = useRef<Vditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current; // 在 useEffect 内部保存 containerRef 的当前值

    if (!vdRef.current && container) {
      // 初始化 Vditor 实例
      vdRef.current = new Vditor(container, {
        minHeight: 300, // 设置最小高度，允许内容动态扩展
        preview: {

        },
        after: () => {
          if (placeholder) {
            vdRef.current!.setValue(placeholder);
          }
        },
        input: (value: string) => {
          // 检查内容变化，避免异常行为
          if (vdRef.current) {
            onchange(value);
          }
        },
        mode: "wysiwyg",
        cache: {
          enable: false, // 禁用缓存，避免加载旧内容
        },
        theme: getLocalStorageValue("reverseDarkMode", false) ? "classic" : "dark",
      });
    }

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

      // 仅在组件销毁时才销毁vditor，避免抖动
      if (vdRef.current && !container) {
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

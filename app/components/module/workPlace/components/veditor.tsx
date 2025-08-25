import { useEffect, useRef } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";

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
      });
    }

    return () => {
      // 仅在组件销毁时才消耗vditor，避免抖动
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
  }, [placeholder, onchange]); // 移除 id 依赖，避免不必要的重建

  return <div id={id} ref={containerRef} className="vditor" />;
}

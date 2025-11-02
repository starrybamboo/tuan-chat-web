import { useEffect, useMemo, useRef, useState } from "react";

import { registerBlots } from "../modules/quillBlots";
import { preloadQuill } from "../modules/quillLoader";
import { createLogger } from "../utils/logger";

export type UseQuillCoreOptions = {
  // 用于挂载 Quill 的容器。要求是一个空的 div，样式在调用方控制。
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  // 是否在初始化完成后自动 focus（可选，默认 false）
  autoFocus?: boolean;
  // 透传的 Quill 配置（可选）—— 会与默认配置合并，默认 toolbar: false
  quillOptions?: Record<string, unknown>;
};

export type UseQuillCoreReturn = {
  quillRef: React.MutableRefObject<any | null>;
  ready: boolean;
};

// 负责创建/配置 Quill 实例与基础模块，保持行为最小化；
// 初始内容导入交由后续 useMarkdownSync 处理。
export default function useQuillCore(options: UseQuillCoreOptions): UseQuillCoreReturn {
  const { containerRef, autoFocus = false, quillOptions } = options;
  const quillRef = useRef<any | null>(null);
  const [ready, setReady] = useState(false);

  const log = useMemo(() => createLogger("CORE/useQuillCore", { domainKey: "CORE" }), []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (typeof window === "undefined") {
        // SSR 安全：在浏览器端再初始化
        log.warn("skip:init:ssr");
        return;
      }

      const mountEl = containerRef.current;
      if (!mountEl) {
        log.warn("defer:init:no-container");
        return;
      }

      if (quillRef.current) {
        // 已初始化
        return;
      }

      log.time?.("init");
      log.warn("init:start");

      try {
        const mod = await preloadQuill(log.child?.("Loader"));
        const Q = (mod as any)?.default ?? (mod as any)?.Quill ?? mod;
        if (cancelled) {
          return;
        }

        // 再次幂等注册自定义 blots（preload 内已注册，此处作为保险）
        try {
          registerBlots(Q, log.child?.("Blots"));
        }
        catch {
          // 忽略注册异常（幂等冲突等）
        }

        const baseOptions: Record<string, unknown> = {
          modules: {
            toolbar: false,
            history: true,
            clipboard: true,
          },
          readOnly: false,
          theme: "snow",
        };

        const merged = {
          ...baseOptions,
          ...(quillOptions || {}),
        } as any;

        log.warn("create:before", { hasToolbar: !!(merged?.modules as any)?.toolbar });
        const editor = new (Q as any)(mountEl, merged);
        quillRef.current = editor;
        log.warn("create:ok", { version: (Q as any)?.version ?? "unknown" });

        if (autoFocus) {
          try {
            editor.focus?.();
          }
          catch {
            // ignore
          }
        }

        if (!cancelled) {
          setReady(true);
          log.timeEnd?.("init");
          log.warn("ready:true");
        }
      }
      catch (e) {
        log.warn("init:fail", e as any);
      }
    };

    // 延迟到微任务，确保容器已挂载到 DOM
    Promise.resolve().then(init);

    return () => {
      cancelled = true;
      // 这里只管理实例引用释放；事件绑定/卸载交由各功能 hook 负责
      quillRef.current = null;
      setReady(false);
    };
  }, [containerRef, autoFocus, quillOptions, log]);

  return { quillRef, ready };
}

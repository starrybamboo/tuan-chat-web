import type quill from "quill";
import { useEffect, useRef } from "react";
// Quill 样式与本地覆盖
import "quill/dist/quill.snow.css";
import "./quill-overrides.css";

interface vditorProps {
  id: string;
  placeholder: string; // 仅用于首次挂载时的初始内容
  onchange: (value: string) => void;
}

// 顶层预加载句柄，避免重复导入
let vditorPromise: Promise<any> | null = null;
function preloadVeditor() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!vditorPromise) {
    vditorPromise = import("quill");
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

// 在按下空格时检测并转换 Markdown 语法（当前实现：### + 空格 -> h3）
function detectMarkdown(quillInstance: any, range: any): boolean {
  if (!quillInstance || !range) {
    return false;
  }
  // 获取光标所在行与偏移
  const lineInfo = quillInstance.getLine?.(range.index);
  if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
    return false;
  }
  const [_line, offset] = lineInfo as [any, number];

  const lineStart = range.index - offset; // 当前行起始位置

  const prefix = quillInstance.getText?.(lineStart, offset) ?? "";
  if (prefix === "###") {
    // 删除标记 '###'，将该行格式化为 header: 3，并把光标置回行首
    quillInstance.deleteText(lineStart, 3, "user");
    quillInstance.formatLine(lineStart, 1, "header", 3, "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }

  if (prefix === "##") {
    // 删除标记 '##'，将该行格式化为 header: 2，并把光标置回行首
    quillInstance.deleteText(lineStart, 2, "user");
    quillInstance.formatLine(lineStart, 1, "header", 2, "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }
  if (prefix === "#") {
    // 删除标记 '#'，将该行格式化为 header: 1，并把光标置回行首
    quillInstance.deleteText(lineStart, 1, "user");
    quillInstance.formatLine(lineStart, 1, "header", 1, "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }

  // 无序列表："-" + 空格
  if (prefix === "-") {
    quillInstance.deleteText(lineStart, 1, "user");
    quillInstance.formatLine(lineStart, 1, "list", "bullet", "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }

  // 有序列表："1." / "12." + 空格
  if (/^\d+\.$/.test(prefix)) {
    const markerLen = prefix.length;
    quillInstance.deleteText(lineStart, markerLen, "user");
    quillInstance.formatLine(lineStart, 1, "list", "ordered", "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }
  return false;
}

// Backspace 时：若当前行为空并且为 header 或列表项，则移除其块级格式，退化为普通段落
function removeBlockFormatIfEmpty(quillInstance: any, range: any): boolean {
  if (!quillInstance || !range) {
    return false;
  }
  // 仅处理光标无选区的情况
  if (range.length && range.length > 0) {
    return false;
  }
  const lineInfo = quillInstance.getLine?.(range.index);
  if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
    return false;
  }
  const [line, offset] = lineInfo as [any, number];
  const lineStart = range.index - offset;
  const lineLength = typeof line?.length === "function" ? line.length() : 0; // 包含结尾的换行
  // 空行在 Quill 中通常 length() === 1（仅包含换行）
  if (lineLength > 1) {
    return false;
  }
  const formats = quillInstance.getFormat?.(lineStart, 1) ?? {};
  if ("header" in formats) {
    quillInstance.formatLine(lineStart, 1, "header", false, "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }
  if ("list" in formats) {
    quillInstance.formatLine(lineStart, 1, "list", false, "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }
  return false;
}

export default function Veditor({ id, placeholder, onchange }: vditorProps) {
  const vdRef = useRef<quill | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onchange);
  const initialPlaceholderRef = useRef(placeholder);
  // 检测是否格式化
  const isFormattedRef = useRef(false);

  // 始终保持最新的回调，但不触发实例的重建
  useEffect(() => {
    onChangeRef.current = onchange;
  }, [onchange]);

  useEffect(() => {
    const container = containerRef.current; // 在 useEffect 内部保存 containerRef 的当前值
    let rootEl: HTMLElement | null = null;
    let onRootKeyDown: ((e: KeyboardEvent) => void) | null = null;
    (async () => {
      // 动态加载 vditor 以避免首屏阻塞，并利用上方的预加载
      const mod = await preloadVeditor();
      const Q = (mod?.default ?? mod) as any;
      if (!Q || vdRef.current || !container) {
        return;
      }
      vdRef.current = new Q(container, {
        theme: "snow",
        modules: { toolbar: true },
        placeholder: initialPlaceholderRef.current || "",
      });
      const editor = vdRef.current!;
      // 聚焦编辑器，确保键盘事件由编辑器接收
      editor.focus?.();

      // 将编辑内容变更同步到外部回调（便于调试观察）
      editor.on?.("text-change", () => {
        try {
          const html = (editor as any).root?.innerHTML ?? "";
          onChangeRef.current?.(html);
        }
        catch {
          // ignore
        }
      });

      // 空格绑定：使用 keyCode 32，且不使用 shortKey，避免被中文输入法/系统拦截
      editor.keyboard.addBinding({ key: 32 }, (range: any, context: any) => {
        // 1) 先尝试 Markdown 快捷（### + 空格 -> h3）
        const handled = detectMarkdown(editor, range);
        if (handled) {
          // 阻止本次空格插入
          try {
            context?.event?.preventDefault?.();
            isFormattedRef.current = true;
          }
          catch {
            // ignore
          }
          return false;
        }
        // 2) 非匹配情况，按正常空格输入
        return true;
      });

      // Backspace：统一处理空标题行/空列表项，退化为段落
      editor.keyboard.addBinding(
        { key: "backspace" },
        { collapsed: true, offset: 0 },
        (range: any, context: any) => {
          const removed = removeBlockFormatIfEmpty(editor, range);
          if (removed) {
            try {
              context?.event?.preventDefault?.();
            }
            catch {
              // ignore
            }
            isFormattedRef.current = false;
            return false;
          }
          return true;
        },
      );

      // 兜底：在编辑器根节点捕获 Backspace，确保空标题/空列表也能移除格式
      rootEl = editor.root as HTMLElement;
      onRootKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Backspace") {
          const sel = editor.getSelection?.(true);
          if (sel && removeBlockFormatIfEmpty(editor, sel)) {
            try {
              e.preventDefault();
            }
            catch {
              // ignore
            }
            isFormattedRef.current = false;
          }
        }
      };
      rootEl?.addEventListener("keydown", onRootKeyDown, true);
    })();

    // 清理事件监听，避免重复绑定
    return () => {
      if (rootEl && onRootKeyDown) {
        try {
          rootEl.removeEventListener("keydown", onRootKeyDown, true);
        }
        catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div
      id={id}
      ref={containerRef}
      className="ql-wrapper bg-white border border-gray-300 rounded-md shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 min-h-[200px]"
    />
  );
}

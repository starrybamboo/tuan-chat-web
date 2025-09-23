import type quill from "quill";
import { BaselineAutoAwesomeMotion } from "@/icons";
import { useCallback, useEffect, useRef, useState } from "react";
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

// 极简 Markdown/HTML 转换占位实现（保证类型与调用方存在，避免构建错误）
function markdownToHtml(md: string): string {
  if (!md)
    return "";
  // 非严格转换：仅将空行分段，其余换行转 <br/>
  const paragraphs = md.split(/\n{2,}/).map(p => p.replace(/\n/g, "<br>"));
  return paragraphs.map(p => `<p>${p}</p>`).join("");
}

function htmlToMarkdown(html: string): string {
  if (!html)
    return "";
  try {
    const el = typeof document !== "undefined" ? document.createElement("div") : null;
    if (!el)
      return html;
    el.innerHTML = html;
    // 简单提取纯文本；真实实现可替换为更完整的 HTML→MD 转换
    return (el.textContent || "").replace(/\u00A0/g, " ");
  }
  catch {
    return html;
  }
}

// 粗略判断文本是否像 Markdown
function isLikelyMarkdown(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }
  if (/```/.test(text)) {
    return true;
  }
  if (/^#{1,3}[ \t]+/m.test(text)) {
    return true;
  }
  if (/^[ \t]*[-*][ \t]+/m.test(text)) {
    return true;
  }
  if (/^[ \t]*\d+\.[ \t]+/m.test(text)) {
    return true;
  }
  if (/(\*\*|__|~~).+\1/.test(text)) {
    return true;
  }
  if (/(?:^|\s)_(?!_)\S.*\S_(?:\s|$)/m.test(text)) {
    return true;
  }
  if (/(?:^|\s)\*(?!\*)\S.*\S\*(?:\s|$)/m.test(text)) {
    return true;
  }
  return false;
}

// 小方块工具栏的下拉菜单内容，抽出为独立组件，降低嵌套缩进复杂度
function InlineMenu(props: {
  activeHeader: number;
  activeList: string | null;
  activeCodeBlock: boolean;
  activeAlign: "left" | "center" | "right" | "justify";
  activeInline: { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean };
  onMenuParagraph: () => void;
  onMenuHeader: (lvl: 1 | 2 | 3) => void;
  onMenuList: (type: "bullet" | "ordered") => void;
  onMenuCode: () => void;
  onMenuAlign: (val: "left" | "center" | "right" | "justify") => void;
  onMenuInline: (type: "bold" | "italic" | "underline" | "strike") => void;
  onMenuClearInline: () => void;
}) {
  const { activeHeader, activeList, activeCodeBlock, activeAlign, activeInline, onMenuParagraph, onMenuHeader, onMenuList, onMenuCode, onMenuAlign, onMenuInline, onMenuClearInline } = props;
  return (
    <>
      {/* 段落（T） */}
      <button
        type="button"
        role="menuitem"
        title="正文"
        aria-label="正文"
        className={activeHeader === 0 && !activeList && !activeCodeBlock ? "active" : ""}
        style={{ color: activeHeader === 0 && !activeList && !activeCodeBlock ? "#2563eb" : undefined }}
        onClick={onMenuParagraph}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M12 6v12" />
        </svg>
      </button>
      {/* 对齐：左 */}
      <button
        type="button"
        role="menuitem"
        title="左对齐"
        aria-label="左对齐"
        className={activeAlign === "left" ? "active" : ""}
        style={{ color: activeAlign === "left" ? "#2563eb" : undefined }}
        onClick={() => onMenuAlign("left")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 10h12" />
          <path d="M4 14h16" />
          <path d="M4 18h10" />
        </svg>
      </button>
      {/* 对齐：居中 */}
      <button
        type="button"
        role="menuitem"
        title="居中对齐"
        aria-label="居中对齐"
        className={activeAlign === "center" ? "active" : ""}
        style={{ color: activeAlign === "center" ? "#2563eb" : undefined }}
        onClick={() => onMenuAlign("center")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M6 10h12" />
          <path d="M4 14h16" />
          <path d="M7 18h10" />
        </svg>
      </button>
      {/* 对齐：右 */}
      <button
        type="button"
        role="menuitem"
        title="右对齐"
        aria-label="右对齐"
        className={activeAlign === "right" ? "active" : ""}
        style={{ color: activeAlign === "right" ? "#2563eb" : undefined }}
        onClick={() => onMenuAlign("right")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M8 10h12" />
          <path d="M4 14h16" />
          <path d="M10 18h10" />
        </svg>
      </button>
      {/* 对齐：两端 */}
      <button
        type="button"
        role="menuitem"
        title="两端对齐"
        aria-label="两端对齐"
        className={activeAlign === "justify" ? "active" : ""}
        style={{ color: activeAlign === "justify" ? "#2563eb" : undefined }}
        onClick={() => onMenuAlign("justify")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 10h16" />
          <path d="M4 14h16" />
          <path d="M4 18h16" />
        </svg>
      </button>
      {/* H1 */}
      <button
        type="button"
        role="menuitem"
        title="标题1"
        aria-label="标题1"
        className={activeHeader === 1 ? "active" : ""}
        style={{ color: activeHeader === 1 ? "#2563eb" : undefined }}
        onClick={() => onMenuHeader(1)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="10" fill="currentColor">1</text>
        </svg>
      </button>
      {/* H2 */}
      <button
        type="button"
        role="menuitem"
        title="标题2"
        aria-label="标题2"
        className={activeHeader === 2 ? "active" : ""}
        style={{ color: activeHeader === 2 ? "#2563eb" : undefined }}
        onClick={() => onMenuHeader(2)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="10" fill="currentColor">2</text>
        </svg>
      </button>
      {/* H3 */}
      <button
        type="button"
        role="menuitem"
        title="标题3"
        aria-label="标题3"
        className={activeHeader === 3 ? "active" : ""}
        style={{ color: activeHeader === 3 ? "#2563eb" : undefined }}
        onClick={() => onMenuHeader(3)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="10" fill="currentColor">3</text>
        </svg>
      </button>
      {/* 无序列表 */}
      <button
        type="button"
        role="menuitem"
        title="无序列表"
        aria-label="无序列表"
        className={activeList === "bullet" ? "active" : ""}
        style={{ color: activeList === "bullet" ? "#2563eb" : undefined }}
        onClick={() => onMenuList("bullet")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="7" r="1.5" />
          <path d="M9 7h10" />
          <circle cx="5" cy="12" r="1.5" />
          <path d="M9 12h10" />
          <circle cx="5" cy="17" r="1.5" />
          <path d="M9 17h10" />
        </svg>
      </button>
      {/* 有序列表 */}
      <button
        type="button"
        role="menuitem"
        title="有序列表"
        aria-label="有序列表"
        className={activeList === "ordered" ? "active" : ""}
        style={{ color: activeList === "ordered" ? "#2563eb" : undefined }}
        onClick={() => onMenuList("ordered")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <text x="3" y="9" fontSize="8" fill="currentColor">1</text>
          <path d="M9 7h10" />
          <text x="3" y="14" fontSize="8" fill="currentColor">2</text>
          <path d="M9 12h10" />
          <text x="3" y="19" fontSize="8" fill="currentColor">3</text>
          <path d="M9 17h10" />
        </svg>
      </button>
      {/* 代码块 */}
      <button
        type="button"
        role="menuitem"
        title="代码块"
        aria-label="代码块"
        className={activeCodeBlock ? "active" : ""}
        style={{ color: activeCodeBlock ? "#2563eb" : undefined }}
        onClick={onMenuCode}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 16l-4-4 4-4" />
          <path d="M16 8l4 4-4 4" />
          <path d="M14 4l-4 16" />
        </svg>
      </button>
      {/* 加粗 */}
      <button
        type="button"
        role="menuitem"
        title="加粗"
        aria-label="加粗"
        className={activeInline.bold ? "active" : ""}
        style={{ color: activeInline.bold ? "#2563eb" : undefined }}
        onClick={() => onMenuInline("bold")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 5h6a3 3 0 0 1 0 6H7z" />
          <path d="M7 11h7a3 3 0 0 1 0 6H7z" />
        </svg>
      </button>
      {/* 斜体 */}
      <button
        type="button"
        role="menuitem"
        title="斜体"
        aria-label="斜体"
        className={activeInline.italic ? "active" : ""}
        style={{ color: activeInline.italic ? "#2563eb" : undefined }}
        onClick={() => onMenuInline("italic")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>
      {/* 下划线 */}
      <button
        type="button"
        role="menuitem"
        title="下划线"
        aria-label="下划线"
        className={activeInline.underline ? "active" : ""}
        style={{ color: activeInline.underline ? "#2563eb" : undefined }}
        onClick={() => onMenuInline("underline")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4v7a6 6 0 0 0 12 0V4" />
          <line x1="4" y1="20" x2="20" y2="20" />
        </svg>
      </button>
      {/* 删除线 */}
      <button
        type="button"
        role="menuitem"
        title="删除线"
        aria-label="删除线"
        className={activeInline.strike ? "active" : ""}
        style={{ color: activeInline.strike ? "#2563eb" : undefined }}
        onClick={() => onMenuInline("strike")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="20" y2="12" />
          <path d="M6 7a4 4 0 0 1 2-3h8" />
          <path d="M18 17a4 4 0 0 1-2 3H8" />
        </svg>
      </button>
      {/* 清除行内格式 */}
      <button type="button" role="menuitem" title="清除行内格式" aria-label="清除行内格式" onClick={onMenuClearInline}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l18 18" />
          <path d="M8 4h10l-6 8" />
        </svg>
      </button>
    </>
  );
}

// 选中态横向工具栏按钮集合（紧凑尺寸）
function SelectionMenu(props: {
  activeHeader: number;
  activeList: string | null;
  activeCodeBlock: boolean;
  activeAlign: "left" | "center" | "right" | "justify";
  activeInline: { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean };
  onMenuParagraph: () => void;
  onMenuHeader: (lvl: 1 | 2 | 3) => void;
  onMenuList: (type: "bullet" | "ordered") => void;
  onMenuCode: () => void;
  onMenuAlign: (val: "left" | "center" | "right" | "justify") => void;
  onMenuInline: (type: "bold" | "italic" | "underline" | "strike") => void;
  onMenuClearInline: () => void;
}) {
  const { activeHeader, activeList, activeCodeBlock, activeAlign, activeInline, onMenuParagraph, onMenuHeader, onMenuList, onMenuCode, onMenuAlign, onMenuInline, onMenuClearInline } = props;
  return (
    <>
      {/* 段落 */}
      <button type="button" title="正文" aria-label="正文" className={activeHeader === 0 && !activeList && !activeCodeBlock ? "active" : ""} style={{ color: activeHeader === 0 && !activeList && !activeCodeBlock ? "#2563eb" : undefined }} onClick={onMenuParagraph}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M12 6v12" />
        </svg>
      </button>
      {/* left */}
      <button type="button" title="左对齐" aria-label="左对齐" className={activeAlign === "left" ? "active" : ""} style={{ color: activeAlign === "left" ? "#2563eb" : undefined }} onClick={() => onMenuAlign("left")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 10h12" />
          <path d="M4 14h16" />
          <path d="M4 18h10" />
        </svg>
      </button>
      {/* center */}
      <button type="button" title="居中对齐" aria-label="居中对齐" className={activeAlign === "center" ? "active" : ""} style={{ color: activeAlign === "center" ? "#2563eb" : undefined }} onClick={() => onMenuAlign("center")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M6 10h12" />
          <path d="M4 14h16" />
          <path d="M7 18h10" />
        </svg>
      </button>
      {/* right */}
      <button type="button" title="右对齐" aria-label="右对齐" className={activeAlign === "right" ? "active" : ""} style={{ color: activeAlign === "right" ? "#2563eb" : undefined }} onClick={() => onMenuAlign("right")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M8 10h12" />
          <path d="M4 14h16" />
          <path d="M10 18h10" />
        </svg>
      </button>
      {/* justify */}
      <button type="button" title="两端对齐" aria-label="两端对齐" className={activeAlign === "justify" ? "active" : ""} style={{ color: activeAlign === "justify" ? "#2563eb" : undefined }} onClick={() => onMenuAlign("justify")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 10h16" />
          <path d="M4 14h16" />
          <path d="M4 18h16" />
        </svg>
      </button>
      {/* H1 */}
      <button type="button" title="H1" aria-label="H1" className={activeHeader === 1 ? "active" : ""} style={{ color: activeHeader === 1 ? "#2563eb" : undefined }} onClick={() => onMenuHeader(1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="9" fill="currentColor">1</text>
        </svg>
      </button>
      {/* H2 */}
      <button type="button" title="H2" aria-label="H2" className={activeHeader === 2 ? "active" : ""} style={{ color: activeHeader === 2 ? "#2563eb" : undefined }} onClick={() => onMenuHeader(2)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="9" fill="currentColor">2</text>
        </svg>
      </button>
      {/* H3 */}
      <button type="button" title="H3" aria-label="H3" className={activeHeader === 3 ? "active" : ""} style={{ color: activeHeader === 3 ? "#2563eb" : undefined }} onClick={() => onMenuHeader(3)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="9" fill="currentColor">3</text>
        </svg>
      </button>
      {/* bullet */}
      <button type="button" title="• 列表" aria-label="• 列表" className={activeList === "bullet" ? "active" : ""} style={{ color: activeList === "bullet" ? "#2563eb" : undefined }} onClick={() => onMenuList("bullet")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="7" r="1.4" />
          <path d="M9 7h10" />
          <circle cx="5" cy="12" r="1.4" />
          <path d="M9 12h10" />
          <circle cx="5" cy="17" r="1.4" />
          <path d="M9 17h10" />
        </svg>
      </button>
      {/* ordered */}
      <button type="button" title="1. 列表" aria-label="1. 列表" className={activeList === "ordered" ? "active" : ""} style={{ color: activeList === "ordered" ? "#2563eb" : undefined }} onClick={() => onMenuList("ordered")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <text x="3" y="9" fontSize="7" fill="currentColor">1</text>
          <path d="M9 7h10" />
          <text x="3" y="14" fontSize="7" fill="currentColor">2</text>
          <path d="M9 12h10" />
          <text x="3" y="19" fontSize="7" fill="currentColor">3</text>
          <path d="M9 17h10" />
        </svg>
      </button>
      {/* code-block */}
      <button type="button" title="代码块" aria-label="代码块" className={activeCodeBlock ? "active" : ""} style={{ color: activeCodeBlock ? "#2563eb" : undefined }} onClick={onMenuCode}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 16l-4-4 4-4" />
          <path d="M16 8l4 4-4 4" />
          <path d="M14 4l-4 16" />
        </svg>
      </button>
      {/* bold */}
      <button type="button" title="B" aria-label="B" className={activeInline.bold ? "active" : ""} style={{ color: activeInline.bold ? "#2563eb" : undefined }} onClick={() => onMenuInline("bold")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 5h6a3 3 0 0 1 0 6H7z" />
          <path d="M7 11h7a3 3 0 0 1 0 6H7z" />
        </svg>
      </button>
      {/* italic */}
      <button type="button" title="I" aria-label="I" className={activeInline.italic ? "active" : ""} style={{ color: activeInline.italic ? "#2563eb" : undefined }} onClick={() => onMenuInline("italic")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>
      {/* underline */}
      <button type="button" title="U" aria-label="U" className={activeInline.underline ? "active" : ""} style={{ color: activeInline.underline ? "#2563eb" : undefined }} onClick={() => onMenuInline("underline")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4v7a6 6 0 0 0 12 0V4" />
          <line x1="4" y1="20" x2="20" y2="20" />
        </svg>
      </button>
      {/* strike */}
      <button type="button" title="S" aria-label="S" className={activeInline.strike ? "active" : ""} style={{ color: activeInline.strike ? "#2563eb" : undefined }} onClick={() => onMenuInline("strike")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="20" y2="12" />
          <path d="M6 7a4 4 0 0 1 2-3h8" />
          <path d="M18 17a4 4 0 0 1-2 3H8" />
        </svg>
      </button>
      {/* clear inline */}
      <button type="button" title="清除" aria-label="清除行内格式" onClick={onMenuClearInline}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l18 18" />
          <path d="M8 4h10l-6 8" />
        </svg>
      </button>
    </>
  );
}

// 在按下空格时检测并转换 Markdown 语法（标题/列表/代码块）
function detectMarkdown(
  quillInstance: any,
  range: any,
  opts?: { setCodeLang?: (lang?: string) => void },
): boolean {
  if (!quillInstance || !range) {
    return false;
  }
  const lineInfo = quillInstance.getLine?.(range.index);
  if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
    return false;
  }
  const [_line, offset] = lineInfo as [any, number];
  const lineStart = range.index - offset;
  const prefix = quillInstance.getText?.(lineStart, offset) ?? "";
  const formats = quillInstance.getFormat?.(lineStart, 1) ?? {};

  // ``` 或 ```lang
  const fence = /^```([\w#+-]+)?$/.exec(prefix);
  if (fence) {
    const lang = fence[1];
    const markerLen = prefix.length;
    quillInstance.deleteText(lineStart, markerLen, "user");
    const toEnable = !("code-block" in formats);
    quillInstance.formatLine(lineStart, 1, "code-block", toEnable, "user");
    try {
      if (toEnable) {
        // 在当前行后追加一个普通段落，便于离开代码块
        const curLineInfo = quillInstance.getLine?.(lineStart);
        const curLine = curLineInfo && Array.isArray(curLineInfo) ? curLineInfo[0] : null;
        const curLen = curLine && typeof curLine.length === "function" ? curLine.length() : 0;
        const afterLine = lineStart + Math.max(0, curLen);
        quillInstance.insertText?.(afterLine, "\n", "api");
        quillInstance.formatLine?.(afterLine, 1, "code-block", false, "api");
      }
    }
    catch {
      // ignore
    }
    quillInstance.setSelection(lineStart, 0, "silent");
    opts?.setCodeLang?.(toEnable ? lang : undefined);
    return true;
  }

  if (prefix === "###") {
    quillInstance.deleteText(lineStart, 3, "user");
    quillInstance.formatLine(lineStart, 1, "header", 3, "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }
  if (prefix === "##") {
    quillInstance.deleteText(lineStart, 2, "user");
    quillInstance.formatLine(lineStart, 1, "header", 2, "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }
  if (prefix === "#") {
    quillInstance.deleteText(lineStart, 1, "user");
    quillInstance.formatLine(lineStart, 1, "header", 1, "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }

  if (prefix === "-") {
    quillInstance.deleteText(lineStart, 1, "user");
    quillInstance.formatLine(lineStart, 1, "list", "bullet", "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }
  if (/^\d+\.$/.test(prefix)) {
    const markerLen = prefix.length;
    quillInstance.deleteText(lineStart, markerLen, "user");
    quillInstance.formatLine(lineStart, 1, "list", "ordered", "user");
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }
  return false;
}

// 在输入空格时检测并应用内联格式：**bold**、__underline__、~~strike~~
function detectInlineFormats(
  quillInstance: any,
  selRange: any,
): boolean {
  if (!quillInstance || !selRange || typeof selRange.index !== "number") {
    return false;
  }
  // 不在代码块中做内联转换
  const curFormats = quillInstance.getFormat?.(Math.max(0, selRange.index - 1), 1) ?? {};
  if ("code-block" in curFormats) {
    return false;
  }
  const lineInfo = quillInstance.getLine?.(selRange.index);
  if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
    return false;
  }
  const [line, offset] = lineInfo as [any, number];
  const lineStart = selRange.index - offset;
  const lineLength = typeof line?.length === "function" ? line.length() : 0;
  const rawLineText = (quillInstance.getText?.(lineStart, Math.max(0, lineLength)) ?? "").replace(/\n$/, "");
  // selRange.index 在空格之后，offset 包含该空格，leftOffset 不包含当前这个空格
  const leftOffset = Math.max(0, offset - 1);
  const leftText = rawLineText.slice(0, leftOffset);
  const rightAfterSpaceText = rawLineText.slice(leftOffset + 1); // 跳过空格后的文本

  // 先处理“闭合标记在光标右侧”的场景：**text␠** / __text␠__ / ~~text␠~~
  // 即：空格位于内文与闭合标记之间
  {
    const candidates: Array<{ token: string; attr: "bold" | "underline" | "strike" | "italic" }> = [
      // 顺序很重要：先长标记，后短标记，避免 ** 被当作 * 解析
      { token: "**", attr: "bold" },
      { token: "__", attr: "underline" },
      { token: "~~", attr: "strike" },
      { token: "*", attr: "italic" },
      { token: "_", attr: "italic" },
    ];
    for (const c of candidates) {
      // 空格后的文本需紧跟闭合标记
      if (!rightAfterSpaceText.startsWith(c.token)) {
        continue;
      }
      const openPos = leftText.lastIndexOf(c.token);
      if (openPos < 0) {
        continue;
      }
      const innerStart = openPos + c.token.length;
      const innerLen = Math.max(0, leftOffset - innerStart);
      // 需要至少有 1 个字符作为内文，且内文首字符不能是空白
      if (innerLen <= 0) {
        continue;
      }
      const firstInnerCh = leftText.charAt(innerStart);
      if (/\s/.test(firstInnerCh)) {
        continue;
      }
      // 删除前的冲突校验：对于斜体的单字符标记，确保开标记前一个字符不是同一标记（避免 ** / __ 冲突）
      const openStart = lineStart + openPos;
      if (c.token.length === 1) {
        const prevCh = quillInstance.getText?.(Math.max(0, openStart - 1), 1) ?? "";
        if (prevCh === c.token) {
          continue;
        }
      }
      try {
        // 先删除右侧闭合标记（位于空格之后）
        const closeStart = lineStart + leftOffset + 1; // 空格之后开始是闭合标记
        quillInstance.deleteText(closeStart, c.token.length, "user");
        // 再删除左侧开标记
        quillInstance.deleteText(openStart, c.token.length, "user");
        // 对“内文”应用格式：此时内文区间起点位于 openStart，长度 = innerLen
        quillInstance.formatText(openStart, innerLen, c.attr, true, "user");
        // 调整光标：删除了左侧开标记（在光标左侧），光标左移开标记长度；
        // 右侧闭合标记的删除不影响现有光标位置。
        const finalIndex = Math.max(0, selRange.index - c.token.length);
        quillInstance.setSelection(finalIndex, 0, "silent");
        return true;
      }
      catch {
        // ignore and try next candidate
      }
    }
  }

  // 常规场景：闭合标记在空格左侧，匹配形如 **text**␠ / __text__␠ / ~~text~~␠
  // 三种模式的正则，锚定到 leftText 的末尾（即空格之前）
  const patterns: Array<{ re: RegExp; attr: "bold" | "underline" | "strike" | "italic"; open: number; close: number; token?: string }>
    = [
      // **bold** → 不允许以空白或*开头，内部不包含*
      { re: /\*\*([^\s*][^*]*)\*\*$/, attr: "bold", open: 2, close: 2, token: "**" },
      // __underline__ → 不允许以空白或_开头，内部不包含_
      { re: /__([^\s_][^_]*)__$/, attr: "underline", open: 2, close: 2, token: "__" },
      // ~~strike~~ → 内部不包含~
      { re: /~~([^~]+)~~$/, attr: "strike", open: 2, close: 2, token: "~~" },
      // *italic* → 不允许以空白或*开头，内部不包含*
      { re: /\*([^\s*][^*]*)\*$/, attr: "italic", open: 1, close: 1, token: "*" },
      // _italic_ → 不允许以空白或_开头，内部不包含_
      { re: /_([^\s_][^_]*)_$/, attr: "italic", open: 1, close: 1, token: "_" },
    ];

  for (const pat of patterns) {
    const m = pat.re.exec(leftText);
    if (!m) {
      continue;
    }
    const matched = m[0];
    const inner = m[1] ?? "";
    const matchLen = matched.length;
    const innerLen = inner.length;
    if (innerLen <= 0) {
      continue;
    }
    // 计算文档中的起始索引
    const startInLine = leftOffset - matchLen;
    const startIndex = lineStart + Math.max(0, startInLine);
    // 额外校验：对于斜体的单字符标记，确保开标记前一个字符不是同一标记，避免与 **/__ 冲突
    if (pat.token === "*" || pat.token === "_") {
      const prevCh = quillInstance.getText?.(Math.max(0, startIndex - 1), 1) ?? "";
      if (prevCh === pat.token) {
        continue;
      }
    }
    // 先从右往左删除关闭标记，再删除打开标记，避免索引位移干扰
    try {
      const closePos = startIndex + matchLen - pat.close;
      quillInstance.deleteText(closePos, pat.close, "user");
      quillInstance.deleteText(startIndex, pat.open, "user");
      // 对“内文”应用内联格式（删除两端标记后，内文现在位于 startIndex）
      quillInstance.formatText(startIndex, innerLen, pat.attr, true, "user");
      // 将光标定位到空格之后；由于删除了 4 个标记字符，整体左移 4
      const finalIndex = Math.max(0, selRange.index - (pat.open + pat.close));
      quillInstance.setSelection(finalIndex, 0, "silent");
      return true;
    }
    catch {
      // ignore并尝试下一个模式
    }
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
  const lineText = (quillInstance.getText?.(lineStart, Math.max(0, lineLength)) ?? "").replace(/\n$/, "");
  const isEmptyOrWs = lineText.trim().length === 0;
  const formats = quillInstance.getFormat?.(lineStart, 1) ?? {};

  // 情况 1：当前行空白（或仅空格），移除块级格式
  if (isEmptyOrWs) {
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
    if ("code-block" in formats) {
      // 在代码块中：如果代码块不止一行，且当前行为空且在行首，优先删除该空行（合并到上一行）
      // 仅当这是代码块的最后一行（整个代码块仅剩这一行）时，才移除 code-block 格式
      try {
        // 向上查找上一行与下一行是否同为 code-block
        const prevFormats = quillInstance.getFormat?.(Math.max(0, lineStart - 1), 1) ?? {};
        const nextFormats = quillInstance.getFormat?.(lineStart + Math.max(0, lineLength), 1) ?? {};
        const hasPrevInBlock = !!("code-block" in prevFormats);
        const hasNextInBlock = !!("code-block" in nextFormats);
        const multipleLines = hasPrevInBlock || hasNextInBlock;
        if (multipleLines) {
          // 删除本行的换行符，使之与上一行合并
          // 当前行通常占据一个换行字符：删除 lineStart 处的 1 个字符（若在行首按 Backspace 调用此函数）
          quillInstance.deleteText(Math.max(0, lineStart - 1), 1, "user");
          quillInstance.setSelection(Math.max(0, lineStart - 1), 0, "silent");
          return true;
        }
      }
      catch {
        // ignore
      }
      // 单行代码块：移除 code-block 格式
      quillInstance.formatLine(lineStart, 1, "code-block", false, "user");
      quillInstance.setSelection(lineStart, 0, "silent");
      return true;
    }
  }

  // 情况 2：即便非空，只要位于行首按 Backspace，也允许“退出块级格式”
  if (offset === 0) {
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
    if ("code-block" in formats) {
      quillInstance.formatLine(lineStart, 1, "code-block", false, "user");
      quillInstance.setSelection(lineStart, 0, "silent");
      return true;
    }
  }
  return false;
}

export default function Veditor({ id, placeholder, onchange }: vditorProps) {
  const vdRef = useRef<quill | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const floatingTbRef = useRef<HTMLDivElement | null>(null);
  // 调试：可视化/日志开关与参考线
  const debugLineRef = useRef<HTMLDivElement | null>(null);
  // 提供稳定引用，供事件处理器中调用，避免依赖项警告
  const scheduleToolbarUpdateRef = useRef<() => void>(() => {});
  const [tbVisible, setTbVisible] = useState(false);
  const [tbTop, setTbTop] = useState(0);
  const [tbLeft, setTbLeft] = useState(0);
  // 编辑器实例是否已就绪（用于在就绪后再绑定滚动/尺寸监听）
  const [editorReady, setEditorReady] = useState(false);
  // 供组件内任意位置调用的工具栏位置更新函数
  const updateToolbarPosRef = useRef<((idx: number) => void) | null>(null);
  // 用于在下一帧刷新工具栏位置（避免读取到旧的布局）
  const raf1Ref = useRef<number | null>(null);
  const raf2Ref = useRef<number | null>(null);
  // 用于触发函数
  const onChangeRef = useRef(onchange);
  const initialPlaceholderRef = useRef(placeholder);
  const lastAppliedMarkdownRef = useRef<string | null>(null);
  const applyingExternalRef = useRef(false);
  // 检测是否格式化
  const isFormattedRef = useRef(false);
  // 防重入：在 text-change 中删除空格时避免递归触发
  const handlingSpaceRef = useRef(false);
  // 记录监听器，便于卸载
  const textChangeHandlerRef = useRef<((delta: any, oldDelta: any, source: any) => void) | null>(null);
  const selectionChangeHandlerRef = useRef<((range: any) => void) | null>(null);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // 选中文本时的横向工具栏（与光标态小方块互斥）
  const selectionTbRef = useRef<HTMLDivElement | null>(null);
  const [selTbVisible, setSelTbVisible] = useState(false);
  const [selTbTop, setSelTbTop] = useState(0);
  const [selTbLeft, setSelTbLeft] = useState(0);
  // 当前格式高亮状态
  const [activeHeader, setActiveHeader] = useState<0 | 1 | 2 | 3>(0);
  const [activeList, setActiveList] = useState<"" | "bullet" | "ordered">("");
  const [activeCodeBlock, setActiveCodeBlock] = useState(false);
  const [activeAlign, setActiveAlign] = useState<"left" | "center" | "right" | "justify">("left");
  const [activeInline, setActiveInline] = useState({ bold: false, italic: false, underline: false, strike: false });

  // 读取当前选区的格式并刷新高亮
  const refreshActiveFormats = useCallback((): void => {
    try {
      const editor = vdRef.current as any;
      if (!editor) {
        return;
      }
      const sel = editor.getSelection?.(true);
      if (!sel || typeof sel.index !== "number") {
        setActiveHeader(0);
        setActiveList("");
        setActiveCodeBlock(false);
        setActiveInline({ bold: false, italic: false, underline: false, strike: false });
        return;
      }
      const inlineFmt = editor.getFormat?.(sel.index, sel.length || 0) || {};
      setActiveInline({
        bold: !!inlineFmt.bold,
        italic: !!inlineFmt.italic,
        underline: !!inlineFmt.underline,
        strike: !!inlineFmt.strike,
      });
      const lineInfo = editor.getLine?.(sel.index);
      if (lineInfo && Array.isArray(lineInfo) && lineInfo.length >= 2) {
        const [_line, offset] = lineInfo as [any, number];
        const lineStart = Math.max(0, sel.index - offset);
        const blockFmt = editor.getFormat?.(lineStart, 1) || {};
        const headerLv = Number(blockFmt.header) || 0;
        const listKind = (blockFmt.list || "") as "" | "bullet" | "ordered";
        const inCode = "code-block" in blockFmt;
        setActiveHeader((headerLv === 1 || headerLv === 2 || headerLv === 3) ? headerLv : 0);
        setActiveList(listKind);
        setActiveCodeBlock(!!inCode);
        const alignVal = (blockFmt.align || "left") as "left" | "center" | "right" | "justify";
        setActiveAlign(alignVal || "left");
      }
      else {
        setActiveHeader(0);
        setActiveList("");
        setActiveCodeBlock(false);
      }
    }
    catch {
      // ignore
    }
  }, []);

  // 稳定引用：供 effect/回调中安全调用而不引入额外依赖
  const refreshActiveFormatsRef = useRef<() => void>(() => {});
  useEffect(() => {
    refreshActiveFormatsRef.current = refreshActiveFormats;
  }, [refreshActiveFormats]);

  // 始终保持最新的回调，但不触发实例的重建
  useEffect(() => {
    onChangeRef.current = onchange;
  }, [onchange]);

  // 调试：通过 window.__VEDITOR_DEBUG__ 控制

  // 外部点击时关闭菜单（点击菜单或工具栏内部不关闭）
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onDocMouseDown = (e: MouseEvent) => {
      const menuEl = menuRef.current;
      const tbEl = floatingTbRef.current;
      const target = e.target as Node | null;
      const insideMenu = !!(menuEl && target && menuEl.contains(target));
      const insideToolbar = !!(tbEl && target && tbEl.contains(target));
      if (!insideMenu && !insideToolbar) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
    };
  }, [menuOpen]);

  // 根据视口空间决定下拉或上拉，避免菜单显示不全（通过切换 DOM class 实现，避免额外状态更新）
  useEffect(() => {
    if (!menuOpen) {
      const m = menuRef.current;
      if (m) {
        m.classList.remove("drop-up");
      }
      return;
    }
    const compute = () => {
      try {
        const tb = floatingTbRef.current;
        const menu = menuRef.current;
        if (!tb || !menu) {
          return;
        }
        const tbRect = tb.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const spaceBelow = window.innerHeight - tbRect.bottom;
        const need = Math.max(menuRect.height, 0) + 8; // 额外留白
        const dropUp = spaceBelow < need;
        menu.classList.toggle("drop-up", dropUp);
      }
      catch {
        // ignore
      }
    };
    compute();
    const onWin = () => compute();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, { passive: true });
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin);
    };
  }, [menuOpen, tbTop]);

  // 调度在下一帧（或下一帧的下一帧）刷新工具栏位置，确保布局变更已生效
  const scheduleToolbarUpdate = useCallback(() => {
    try {
      if (raf1Ref.current) {
        cancelAnimationFrame(raf1Ref.current);
        raf1Ref.current = null;
      }
      if (raf2Ref.current) {
        cancelAnimationFrame(raf2Ref.current);
        raf2Ref.current = null;
      }
      const editor = vdRef.current as any;
      const el = editor?.root as HTMLElement | null;
      const wrapper = wrapperRef.current as HTMLDivElement | null;
      if (!editor || !el || !wrapper) {
        return;
      }
      raf1Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = requestAnimationFrame(() => {
          try {
            const sel = editor.getSelection?.(true);
            if (sel && typeof sel.index === "number") {
              const rootRect = el.getBoundingClientRect();
              const wrapRect = wrapper.getBoundingClientRect();
              const fmt = editor.getFormat?.(sel.index, sel.length || 0) || {};
              const collapsed = !(sel.length && sel.length > 0);

              // 1) 光标态：小方块工具栏（仅当选区折叠时显示）
              if (collapsed) {
                const bCaret = editor.getBounds?.(sel.index, 0) || { top: 0 };
                const caretTop = (rootRect.top + (bCaret.top || 0) - el.scrollTop) - wrapRect.top;
                if (typeof window !== "undefined" && (window as any).__VEDITOR_DEBUG__) {
                  console.warn("[Veditor][schedule/caret]", {
                    selIndex: sel.index,
                    boundsTop: bCaret.top || 0,
                    rootRectTop: rootRect.top,
                    wrapRectTop: wrapRect.top,
                    rootScrollTop: el.scrollTop,
                    clientHeight: el.clientHeight,
                    scrollHeight: el.scrollHeight,
                    computedTop: caretTop,
                  });
                }
                setTbTop(Math.max(0, caretTop));
                // 计算小方块左侧位置：放到编辑区左外侧
                try {
                  const tbEl = floatingTbRef.current as HTMLDivElement | null;
                  const tbW = tbEl?.offsetWidth || 34;
                  // 默认在容器左外：-width - 8px 间距
                  let nextLeft = -tbW - 8;
                  // 视口兜底：保证距离视口左侧 >= 8px
                  const viewportLeft = wrapRect.left + nextLeft;
                  if (viewportLeft < 8) {
                    nextLeft = Math.max(-tbW - 8, 8 - wrapRect.left);
                  }
                  setTbLeft(nextLeft);
                }
                catch {
                  // ignore
                }
                // 调试线跟随小方块工具栏
                try {
                  if (debugLineRef.current) {
                    debugLineRef.current.style.top = `${Math.max(0, caretTop)}px`;
                    debugLineRef.current.style.display = (typeof window !== "undefined" && (window as any).__VEDITOR_DEBUG__)
                      ? "block"
                      : "none";
                  }
                }
                catch {
                  // ignore
                }
                // 选中态工具栏隐藏
                setSelTbVisible(false);
              }
              // 2) 选中态：横向工具栏（排除代码块）
              else {
                const inCodeBlock = !!("code-block" in fmt);
                if (!inCodeBlock) {
                  const bSel = editor.getBounds?.(sel.index, sel.length) || { top: 0, left: 0, width: 0 };
                  const selTop = (rootRect.top + (bSel.top || 0) - el.scrollTop) - wrapRect.top;
                  const approxWidth = selectionTbRef.current?.offsetWidth || 260;
                  const approxHeight = selectionTbRef.current?.offsetHeight || 34;
                  let left = (rootRect.left + (bSel.left || 0) - wrapRect.left);
                  // 居中于选区
                  const centerShift = Math.max(0, ((bSel as any).width || 0) / 2 - approxWidth / 2);
                  left += centerShift;
                  // 约束在容器范围内
                  const maxLeft = Math.max(0, wrapper.clientWidth - approxWidth - 8);
                  left = Math.max(8, Math.min(left, maxLeft));
                  const top = Math.max(0, selTop - approxHeight - 8);
                  if (typeof window !== "undefined" && (window as any).__VEDITOR_DEBUG__) {
                    console.warn("[Veditor][schedule/selection]", {
                      selIndex: sel.index,
                      selLength: sel.length,
                      boundsTop: (bSel as any).top || 0,
                      boundsLeft: (bSel as any).left || 0,
                      boundsWidth: (bSel as any).width || 0,
                      rootRectTop: rootRect.top,
                      wrapRectTop: wrapRect.top,
                      rootScrollTop: el.scrollTop,
                      computedTop: top,
                      computedLeft: left,
                    });
                  }
                  setSelTbTop(top - 15);
                  setSelTbLeft(left);
                  setSelTbVisible(true);
                }
                else {
                  setSelTbVisible(false);
                }
              }
            }
            else {
              // 无有效选区，隐藏两个工具栏
              setTbVisible(false);
              setSelTbVisible(false);
              try {
                if (debugLineRef.current) {
                  debugLineRef.current.style.display = "none";
                }
              }
              catch {
                // ignore
              }
            }
          }
          catch {
            // ignore
          }
        });
      });
    }
    catch {
      // ignore
    }
  }, []);

  // 将回调存入 ref，供事件回调用
  useEffect(() => {
    scheduleToolbarUpdateRef.current = scheduleToolbarUpdate;
  }, [scheduleToolbarUpdate]);

  // 组件卸载时清理 RAF
  useEffect(() => {
    return () => {
      try {
        if (raf1Ref.current) {
          cancelAnimationFrame(raf1Ref.current);
          raf1Ref.current = null;
        }
        if (raf2Ref.current) {
          cancelAnimationFrame(raf2Ref.current);
          raf2Ref.current = null;
        }
      }
      catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current; // 在 useEffect 内部保存 containerRef 的当前值
    let rootEl: HTMLElement | null = null;
    let onRootKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let onRootKeyUp: ((e: KeyboardEvent) => void) | null = null;
    let onRootMouseUp: ((e: MouseEvent) => void) | null = null;
    let onRootPaste: ((e: ClipboardEvent) => void) | null = null;
    // 为可清理的 DOM 事件处理器预留引用（此处不需要 scroll 句柄，滚动监听在独立 effect 中）
    // Enter/换行后用于清理新行块级格式的定时器
    let lineFormatTimer: ReturnType<typeof setTimeout> | null = null;
    // 初次载入占位 Markdown 的复位定时器
    let initMdTimer: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      // 动态加载 vditor 以避免首屏阻塞，并利用上方的预加载
      const mod = await preloadVeditor();
      const Q = (mod?.default ?? mod) as any;
      if (!Q || vdRef.current || !container) {
        return;
      }
      // 防御：若容器内已存在旧的 Quill DOM（例如严格模式下的首次装载后立即卸载再装载），先清空
      try {
        if (container.firstChild) {
          container.innerHTML = "";
        }
      }
      catch {
        // ignore
      }

      vdRef.current = new Q(container, {
        theme: "snow",
        modules: {
          toolbar: false,
          // 统一以 delta 处理，Clipboard 配置最小化；自定义粘贴在 root paste 事件中完成
          clipboard: {
            matchVisual: false,
          },
        },
      });
      const editor = vdRef.current!;
      // 聚焦编辑器，确保键盘事件由编辑器接收
      editor.focus?.();

      // 根据当前选区更新悬浮工具栏位置
      const updateToolbarPosition = (idx: number) => {
        try {
          const root = (editor as any).root as HTMLElement;
          const wrapper = wrapperRef.current as HTMLDivElement | null;
          if (!root || !wrapper) {
            return;
          }
          const b = (editor as any).getBounds?.(idx, 0) || { top: 0 };
          const rootRect = root.getBoundingClientRect();
          const wrapRect = wrapper.getBoundingClientRect();
          const top = (rootRect.top + (b.top || 0) - root.scrollTop) - wrapRect.top;
          if (typeof window !== "undefined" && (window as any).__VEDITOR_DEBUG__) {
            console.warn("[Veditor][update]", {
              selIndex: idx,
              boundsTop: b.top || 0,
              rootRectTop: rootRect.top,
              wrapRectTop: wrapRect.top,
              rootScrollTop: root.scrollTop,
              clientHeight: root.clientHeight,
              scrollHeight: root.scrollHeight,
              computedTop: top,
            });
          }
          setTbTop(Math.max(0, top));
          // 计算小方块左侧位置：放到编辑区左外侧
          try {
            const tbEl = floatingTbRef.current as HTMLDivElement | null;
            const tbW = tbEl?.offsetWidth || 34;
            let nextLeft = -tbW - 8;
            const viewportLeft = wrapRect.left + nextLeft;
            if (viewportLeft < 8) {
              nextLeft = Math.max(-tbW - 8, 8 - wrapRect.left);
            }
            setTbLeft(nextLeft);
          }
          catch {
            // ignore
          }
          try {
            if (debugLineRef.current) {
              debugLineRef.current.style.top = `${Math.max(0, top)}px`;
              debugLineRef.current.style.display = (typeof window !== "undefined" && (window as any).__VEDITOR_DEBUG__)
                ? "block"
                : "none";
            }
          }
          catch {
            // ignore
          }
        }
        catch {
          // ignore
        }
      };
      // 暴露给外层使用，便于在 silent setSelection 后手动刷新位置
      updateToolbarPosRef.current = updateToolbarPosition;

      // 载入初始 Markdown（来自 props.placeholder）
      try {
        const md = initialPlaceholderRef.current || "";
        if (md && typeof md === "string") {
          const html = markdownToHtml(md);
          applyingExternalRef.current = true;
          lastAppliedMarkdownRef.current = md;
          // 清空现有内容并插入
          (editor as any).setText?.("");
          (editor as any).clipboard?.dangerouslyPasteHTML?.(0, html, "api");
          initMdTimer = setTimeout(() => {
            applyingExternalRef.current = false;
          }, 0);
        }
      }
      catch {
        // ignore
      }

      // 文本变更：
      // 1) 同步 HTML 到外部
      // 2) 兜底：若刚插入的是空格，则再跑一遍 detectMarkdown（处理 IME/绑定失效场景）
      const onTextChange = (delta: any, _old: any, source: any) => {
        // 1) 同步：将 HTML 转为 Markdown，仅在用户操作时回传，避免外部设置导致回环
        if (!applyingExternalRef.current && source === "user") {
          try {
            const html = (editor as any).root?.innerHTML ?? "";
            const md = htmlToMarkdown(html);
            lastAppliedMarkdownRef.current = md;
            onChangeRef.current?.(md);
          }
          catch {
            // ignore
          }
        }

        // 2) 基于 delta 的 Markdown 检测：仅在用户输入、非重入时处理
        if (handlingSpaceRef.current || source !== "user") {
          return;
        }
        try {
          // 收集本次插入的文本（可能是单字符，也可能是批量，比如粘贴或 IME 上屏）
          let inserted = "";
          if (delta && Array.isArray(delta.ops)) {
            for (const op of delta.ops) {
              if (op && typeof op.insert === "string") {
                inserted += op.insert;
              }
            }
          }
          // 2.a 处理换行：确保新行是普通段落（清除 header/list/code-block）
          if (inserted.includes("\n")) {
            if (lineFormatTimer) {
              clearTimeout(lineFormatTimer);
            }
            lineFormatTimer = setTimeout(() => {
              try {
                const selAfter = editor.getSelection?.(true);
                if (!selAfter || typeof selAfter.index !== "number") {
                  return;
                }
                const newLineInfo = editor.getLine?.(selAfter.index);
                if (!newLineInfo || !Array.isArray(newLineInfo) || newLineInfo.length < 2) {
                  return;
                }
                const [_nLine, nOffset] = newLineInfo as [any, number];
                const newLineStart = selAfter.index - nOffset;
                // 判断换行前一行是否在 code-block：以 selAfter.index - 1 获取前一行并检查其块格式
                const prevLineTuple = editor.getLine?.(Math.max(0, selAfter.index - 1));
                let prevLineStart = Math.max(0, selAfter.index - 1);
                if (prevLineTuple && Array.isArray(prevLineTuple) && prevLineTuple.length >= 2) {
                  const [_pLine, pOffset] = prevLineTuple as [any, number];
                  prevLineStart = Math.max(0, selAfter.index - 1 - pOffset);
                }
                const prevFormats = editor.getFormat?.(prevLineStart, 1) ?? {};
                const prevInCodeBlock = !!("code-block" in prevFormats);
                if (prevInCodeBlock) {
                  // 代码块中回车：确保新行也处于 code-block
                  editor.formatLine(newLineStart, 1, "code-block", true, "user");
                }
                else {
                  // 非代码块：清除所有块级格式，让新行成为普通段落
                  editor.formatLine(newLineStart, 1, "header", false, "user");
                  editor.formatLine(newLineStart, 1, "list", false, "user");
                  editor.formatLine(newLineStart, 1, "code-block", false, "user");
                }
                // 回车后刷新工具栏位置
                updateToolbarPosRef.current?.(selAfter.index);
              }
              catch {
                // ignore
              }
            }, 0);
          }
          // 仅当插入以空格结尾时再尝试触发（支持半角/不间断/全角空格）
          const endsWithSpace = /[\u0020\u00A0\u2007\u3000]$/.test(inserted);
          if (!endsWithSpace) {
            return;
          }

          const sel = editor.getSelection?.(true);
          if (!sel || typeof sel.index !== "number") {
            return;
          }
          // 刚插入的空格位于 sel.index - 1
          if (sel.index <= 0) {
            return;
          }
          const lastChar = editor.getText?.(sel.index - 1, 1);
          // 同时兼容普通空格、NBSP、不间断空格、全角空格
          if (lastChar !== " " && lastChar !== "\u00A0" && lastChar !== "\u2007" && lastChar !== "\u3000") {
            return;
          }
          // 构造一个位于空格位置的 range，供 detectMarkdown 识别前缀
          const fakeRange = { index: sel.index - 1, length: 0 } as any;
          // 先尝试块级（行首前缀）
          const blockHandled = detectMarkdown(editor, fakeRange);
          // 若不是块级，再尝试行内 **/__ /~~ 模式
          const inlineHandled = !blockHandled && detectInlineFormats(editor, sel);
          if (blockHandled || inlineHandled) {
            handlingSpaceRef.current = true;
            try {
              // 对块级触发：删除触发用的空格；对行内触发：保留空格（更符合连续输入）
              if (blockHandled) {
                editor.deleteText(sel.index - 1, 1, "user");
              }
              isFormattedRef.current = true;
            }
            finally {
              handlingSpaceRef.current = false;
            }
            // silent 选区变动后手动刷新工具栏位置
            try {
              const afterSel = editor.getSelection?.(true);
              if (afterSel && typeof afterSel.index === "number") {
                updateToolbarPosRef.current?.(afterSel.index);
              }
            }
            catch {
              // ignore
            }
          }
        }
        catch {
          // ignore
        }

        // 最后：刷新高亮并在本次用户变更后调度一次位置刷新
        refreshActiveFormatsRef.current();
        scheduleToolbarUpdateRef.current();
      };
      editor.on?.("text-change", onTextChange);
      textChangeHandlerRef.current = onTextChange;

      // 选择区变化：仅折叠时显示小方块；有选区时显示横向（非代码块）
      const onSelChange = (range: any) => {
        const root = (editor as any).root as HTMLElement;
        const hasFocus = !!range && document.activeElement === root;
        focusRef.current = hasFocus;
        if (!range) {
          setTbVisible(false);
          setSelTbVisible(false);
          return;
        }
        const collapsed = !(range.length && range.length > 0);
        // 折叠：仅在 hover 或 focus 时显示小方块；隐藏横向
        setTbVisible(collapsed && (hoverRef.current || hasFocus));
        if (collapsed) {
          if (typeof range.index === "number") {
            updateToolbarPosition(range.index);
          }
          setSelTbVisible(false);
        }
        else {
          // 非折叠：交给统一调度计算横向工具栏位置（并在代码块中隐藏）
          // 先进行一次“同步”定位，立即可见，随后再用 RAF 精修位置
          try {
            const fmt = editor.getFormat?.(range.index, range.length || 0) || {};
            const inCodeBlock = !!("code-block" in fmt);
            if (!inCodeBlock) {
              // 立即计算一次位置（无 RAF）
              const el = (editor as any).root as HTMLElement;
              const wrapper = wrapperRef.current as HTMLDivElement | null;
              if (el && wrapper) {
                const bSel = editor.getBounds?.(range.index, range.length) || { top: 0, left: 0, width: 0 };
                const rootRect = el.getBoundingClientRect();
                const wrapRect = wrapper.getBoundingClientRect();
                const selTop = (rootRect.top + (bSel.top || 0) - el.scrollTop) - wrapRect.top;
                const approxWidth = selectionTbRef.current?.offsetWidth || 260;
                const approxHeight = selectionTbRef.current?.offsetHeight || 34;
                let left = (rootRect.left + (bSel.left || 0) - wrapRect.left);
                const centerShift = Math.max(0, ((bSel as any).width || 0) / 2 - approxWidth / 2);
                left += centerShift;
                const maxLeft = Math.max(0, wrapper.clientWidth - approxWidth - 8);
                left = Math.max(8, Math.min(left, maxLeft));
                const top = Math.max(0, selTop - approxHeight - 8);
                setSelTbTop(top - 15);
                setSelTbLeft(left);
                setSelTbVisible(true);
              }
            }
            else {
              setSelTbVisible(false);
            }
          }
          catch {
            // ignore
          }
          // RAF 调度进一步稳定位置
          scheduleToolbarUpdateRef.current?.();
        }
        refreshActiveFormatsRef.current();
      };
      editor.on?.("selection-change", onSelChange);
      selectionChangeHandlerRef.current = onSelChange;

      // 不再依赖 space/enter 的键盘绑定，统一在 delta 中识别（稳定于 IME 与不同浏览器事件序）

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
            // Backspace 触发后调度刷新位置
            scheduleToolbarUpdateRef.current();
            return false;
          }
          return true;
        },
      );
      // 不再使用 Enter 键绑定，改为在 delta 中识别 "\n" 并清除新行格式（见 onTextChange 内）

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
            // 兜底：调度刷新工具栏位置
            scheduleToolbarUpdateRef.current();
          }
        }
      };
      rootEl?.addEventListener("keydown", onRootKeyDown, true);

      // 鼠标结束选择（mouseup）与键盘选择（keyup）时，立即显示和定位横向工具栏
      onRootMouseUp = () => {
        try {
          const sel = editor.getSelection?.(true);
          if (sel && sel.length && sel.length > 0) {
            onSelChange(sel);
          }
        }
        catch {
          // ignore
        }
      };
      rootEl?.addEventListener("mouseup", onRootMouseUp, true);

      onRootKeyUp = (_e: KeyboardEvent) => {
        try {
          // Shift+Arrow 或 Ctrl+A 等产生选区变化
          const sel = editor.getSelection?.(true);
          if (sel && sel.length && sel.length > 0) {
            onSelChange(sel);
          }
        }
        catch {
          // ignore
        }
      };
      rootEl?.addEventListener("keyup", onRootKeyUp, true);

      // 粘贴：若是 Markdown 文本，则转换为 HTML 并以所见即所得形式插入
      onRootPaste = (e: ClipboardEvent) => {
        try {
          // 在代码块中不做 Markdown 转换，保持原样
          const sel = editor.getSelection?.(true);
          if (sel && typeof sel.index === "number") {
            const fmt = editor.getFormat?.(Math.max(0, sel.index - 1), 1) ?? {};
            if ("code-block" in fmt) {
              return;
            }
          }

          // 优先使用 text/plain；若为空则尝试 text/markdown；再退化为从 text/html 提取纯文本
          let text = e.clipboardData?.getData("text/plain") ?? "";
          if (!text) {
            text = e.clipboardData?.getData("text/markdown") ?? "";
          }
          if (!text) {
            const htmlData = e.clipboardData?.getData("text/html") ?? "";
            if (htmlData) {
              try {
                const tmp = document.createElement("div");
                tmp.innerHTML = htmlData;
                text = tmp.textContent || "";
              }
              catch {
                // ignore html parse errors
              }
            }
          }

          if (!text) {
            return; // 无法解析纯文本，交由默认流程
          }

          // 规范化换行，去除尾部空白以提高命中率
          const normalized = text.replace(/\r\n/g, "\n").replace(/[\u00A0\u2007\u3000]/g, " ").replace(/[\t ]+$/gm, "").trim();
          if (!isLikelyMarkdown(normalized)) {
            return; // 交由默认流程处理
          }

          e.preventDefault();
          const html = markdownToHtml(normalized);
          const selection = editor.getSelection?.(true);
          const insertIndex = selection && typeof selection.index === "number"
            ? selection.index
            : (editor.getLength?.() ?? 0);
          // 使用 Quill 内置粘贴 HTML（带 index），保证生成正确 Delta 并插入到光标处
          (editor as any).clipboard?.dangerouslyPasteHTML?.(insertIndex, html, "user");
        }
        catch {
          // ignore, fallback to default
        }
      };
      rootEl?.addEventListener("paste", onRootPaste, true);
      // 滚动监听改为独立 effect 绑定，见组件底部 useEffect

      // 悬停控制显示
      // 悬停控制由 JSX 上的 onMouseEnter/onMouseLeave 负责
      // 标记编辑器已就绪，触发依赖 editor 的副作用（如 ResizeObserver 绑定）
      setEditorReady(true);
      // 初次刷新一次格式高亮
      refreshActiveFormatsRef.current();
    })();

    // 清理事件监听，避免重复绑定
    return () => {
      // 1) 移除根节点事件
      if (rootEl && onRootKeyDown) {
        try {
          rootEl.removeEventListener("keydown", onRootKeyDown, true);
        }
        catch {
          // ignore
        }
      }
      if (rootEl && onRootMouseUp) {
        try {
          rootEl.removeEventListener("mouseup", onRootMouseUp, true);
        }
        catch {
          // ignore
        }
      }
      if (rootEl && onRootKeyUp) {
        try {
          rootEl.removeEventListener("keyup", onRootKeyUp, true);
        }
        catch {
          // ignore
        }
      }
      if (rootEl && onRootPaste) {
        try {
          rootEl.removeEventListener("paste", onRootPaste, true);
        }
        catch {
          // ignore
        }
      }
      // 2) 移除 Quill 事件
      const editor = vdRef.current as any;
      if (editor && textChangeHandlerRef.current) {
        try {
          editor.off?.("text-change", textChangeHandlerRef.current);
        }
        catch {
          // ignore
        }
        textChangeHandlerRef.current = null;
      }
      if (editor && selectionChangeHandlerRef.current) {
        try {
          editor.off?.("selection-change", selectionChangeHandlerRef.current);
        }
        catch {
          // ignore
        }
        selectionChangeHandlerRef.current = null;
      }
      // 清理新行格式定时器
      try {
        if (lineFormatTimer) {
          clearTimeout(lineFormatTimer);
          lineFormatTimer = null;
        }
      }
      catch {
        // ignore
      }
      // 3) 清空容器，避免严格模式下重复装载导致的重复工具栏/DOM
      if (container) {
        try {
          container.innerHTML = "";
        }
        catch {
          // ignore
        }
      }
      // 4) 释放实例引用
      vdRef.current = null;
      // 6) 其他清理
      try {
        // no-op
      }
      catch {
        // ignore
      }
      // 5) 清理初始占位定时器
      try {
        if (initMdTimer) {
          clearTimeout(initMdTimer);
          initMdTimer = null;
        }
      }
      catch {
        // ignore
      }
      // 重置就绪标记
      setEditorReady(false);
    };
  }, []);

  // 独立滚动监听：编辑器滚动时更新工具栏位置与显示
  useEffect(() => {
    const editor = vdRef.current as any;
    const el = editor?.root as HTMLElement | null;
    if (!editor || !el) {
      return;
    }
    const onScroll = () => {
      try {
        scheduleToolbarUpdateRef.current?.();
      }
      catch {
        // ignore
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => {
      try {
        el.removeEventListener("scroll", onScroll);
      }
      catch {
        // ignore
      }
    };
  }, []);

  // 根元素尺寸变化时（例如 Backspace 导致内容高度变化），刷新工具栏位置
  useEffect(() => {
    const editor = vdRef.current as any;
    const el = editor?.root as HTMLElement | null;
    if (!editor || !el || typeof (window as any).ResizeObserver === "undefined") {
      return;
    }
    const ro = new (window as any).ResizeObserver(() => {
      try {
        scheduleToolbarUpdateRef.current?.();
      }
      catch {
        // ignore
      }
    });
    ro.observe(el);
    return () => {
      try {
        ro.disconnect();
      }
      catch {
        // ignore
      }
    };
  }, [editorReady]);

  // 当 placeholder（后端传来的 Markdown）变化时，重置编辑器内容
  useEffect(() => {
    const editor = vdRef.current as any;
    if (!editor) {
      return;
    }
    const md = placeholder || "";
    if (md === lastAppliedMarkdownRef.current) {
      return;
    }
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const html = markdownToHtml(md);
      applyingExternalRef.current = true;
      lastAppliedMarkdownRef.current = md;
      editor.setText?.("");
      editor.clipboard?.dangerouslyPasteHTML?.(0, html, "api");
      timeoutId = setTimeout(() => {
        applyingExternalRef.current = false;
      }, 0);
    }
    catch {
      // ignore
    }
    return () => {
      try {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
      catch {
        // ignore
      }
    };
  }, [placeholder]);

  // 工具栏动作：块级与行内
  const applyHeader = (level: 1 | 2 | 3) => {
    const editor = vdRef.current as any;
    if (!editor) {
      return;
    }
    const sel = editor.getSelection?.(true);
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    const formats = editor.getFormat?.(lineStart, 1) ?? {};
    const current = formats.header;
    const target: any = current === level ? false : level;
    editor.formatLine?.(lineStart, 1, "header", target, "user");
    editor.setSelection?.(lineStart, 0, "silent");
    updateToolbarPosRef.current?.(lineStart);
    scheduleToolbarUpdateRef.current();
  };

  const toggleList = (kind: "bullet" | "ordered") => {
    const editor = vdRef.current as any;
    if (!editor) {
      return;
    }
    const sel = editor.getSelection?.(true);
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    const formats = editor.getFormat?.(lineStart, 1) ?? {};
    const current = formats.list;
    const target: any = current === kind ? false : kind;
    editor.formatLine?.(lineStart, 1, "list", target, "user");
    editor.setSelection?.(lineStart, 0, "silent");
    updateToolbarPosRef.current?.(lineStart);
    scheduleToolbarUpdateRef.current();
  };

  const toggleInline = (attr: "bold" | "italic" | "underline" | "strike") => {
    const editor = vdRef.current as any;
    if (!editor) {
      return;
    }
    const sel = editor.getSelection?.(true);
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const fmt = editor.getFormat?.(sel.index, sel.length || 0) ?? {};
    const isOn = !!fmt[attr];
    if (sel.length && sel.length > 0) {
      editor.formatText?.(sel.index, sel.length, attr, !isOn, "user");
    }
    else {
      editor.format?.(attr, !isOn, "user");
    }
    editor.focus?.();
    const cur = editor.getSelection?.(true);
    if (cur && typeof cur.index === "number") {
      updateToolbarPosRef.current?.(cur.index);
    }
    scheduleToolbarUpdateRef.current();
  };

  const toggleCodeBlock = () => {
    const editor = vdRef.current as any;
    if (!editor) {
      return;
    }
    const sel = editor.getSelection?.(true);
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    const formats = editor.getFormat?.(lineStart, 1) ?? {};
    const toEnable = !("code-block" in formats);
    editor.formatLine?.(lineStart, 1, "code-block", toEnable, "user");
    if (toEnable) {
      try {
        const curLineInfo = editor.getLine?.(lineStart);
        const curLine = curLineInfo && Array.isArray(curLineInfo) ? curLineInfo[0] : null;
        const curLen = curLine && typeof curLine.length === "function" ? curLine.length() : 0;
        const afterLine = lineStart + Math.max(0, curLen);
        editor.insertText?.(afterLine, "\n", "api");
        editor.formatLine?.(afterLine, 1, "code-block", false, "api");
        editor.setSelection?.(lineStart, 0, "silent");
        updateToolbarPosRef.current?.(lineStart);
        scheduleToolbarUpdateRef.current();
      }
      catch {
        // ignore
      }
    }
    else {
      editor.setSelection?.(lineStart, 0, "silent");
      updateToolbarPosRef.current?.(lineStart);
      scheduleToolbarUpdateRef.current();
    }
  };

  // 对齐：左/中/右/两端（左视作清除 align）
  const setAlign = (val: "left" | "center" | "right" | "justify") => {
    const editor = vdRef.current as any;
    if (!editor) {
      return;
    }
    const sel = editor.getSelection?.(true);
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    const formats = editor.getFormat?.(lineStart, 1) ?? {};
    const target: any = (val === "left") ? false : val;
    // 在代码块中不应用对齐
    if ("code-block" in formats) {
      return;
    }
    editor.formatLine?.(lineStart, 1, "align", target, "user");
    editor.setSelection?.(lineStart, 0, "silent");
    updateToolbarPosRef.current?.(lineStart);
    scheduleToolbarUpdateRef.current();
    refreshActiveFormats();
  };

  // 菜单点击封装，避免内联多语句导致 lint 警告
  const onMenuHeader = (lv: 1 | 2 | 3) => {
    applyHeader(lv);
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuList = (kind: "bullet" | "ordered") => {
    toggleList(kind);
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuCode = () => {
    toggleCodeBlock();
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuAlign = (val: "left" | "center" | "right" | "justify") => {
    setAlign(val);
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuInline = (attr: "bold" | "italic" | "underline" | "strike") => {
    toggleInline(attr);
    refreshActiveFormats();
    setMenuOpen(false);
  };

  // 段落（清除块级格式）与清除行内格式
  const onMenuParagraph = () => {
    const editor = vdRef.current as any;
    if (!editor) {
      return;
    }
    const sel = editor.getSelection?.(true);
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    editor.formatLine?.(lineStart, 1, "header", false, "user");
    editor.formatLine?.(lineStart, 1, "list", false, "user");
    editor.formatLine?.(lineStart, 1, "code-block", false, "user");
    editor.setSelection?.(lineStart, 0, "silent");
    updateToolbarPosRef.current?.(lineStart);
    scheduleToolbarUpdateRef.current();
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuClearInline = () => {
    const editor = vdRef.current as any;
    if (!editor) {
      return;
    }
    const sel = editor.getSelection?.(true);
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const len = sel.length || 0;
    if (len > 0) {
      editor.removeFormat?.(sel.index, len, "user");
    }
    const cur = editor.getSelection?.(true);
    if (cur && typeof cur.index === "number") {
      updateToolbarPosRef.current?.(cur.index);
    }
    scheduleToolbarUpdateRef.current();
    refreshActiveFormats();
    setMenuOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className="ql-outer relative"
      style={{ overflow: "visible" }}
      onMouseEnter={() => {
        hoverRef.current = true;
        try {
          const editor = vdRef.current as any;
          const sel = editor?.getSelection?.(true);
          // 仅在折叠选区时显示小方块工具栏
          setTbVisible(!!sel && !(sel.length && sel.length > 0));
          // 统一调度，确保两类工具栏位置/可见性正确
          scheduleToolbarUpdateRef.current?.();
        }
        catch {
          // ignore
        }
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
        if (!focusRef.current) {
          setTbVisible(false);
        }
      }}
    >
      <div
        id={id}
        ref={containerRef}
        className="ql-wrapper bg-white border border-gray-300 rounded-md shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 min-h-[200px]"
      />
      {/* 光标态：小方块工具栏（始终挂载，按状态显示/隐藏） */}
      <div
        ref={floatingTbRef}
        className={`ql-inline-toolbar ${tbVisible ? "visible" : ""}`}
        style={{ position: "absolute", top: tbTop, left: tbLeft, zIndex: 1000, display: selTbVisible ? "none" : (tbVisible ? "block" : "none") }}
        onMouseDown={e => e.preventDefault()}
      >
        <button
          type="button"
          className="icon-btn"
          title="显示菜单"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(v => !v)}
        >
          <BaselineAutoAwesomeMotion />
        </button>
        {/* 下拉菜单：位于图标下方（图标样式，网格布局） */}
        <div
          ref={menuRef}
          className={`ql-inline-menu ${menuOpen ? "open" : ""}`}
          role="menu"
          aria-label="插入与样式菜单"
        >
          <InlineMenu
            activeHeader={activeHeader}
            activeList={activeList || null}
            activeCodeBlock={activeCodeBlock}
            activeAlign={activeAlign}
            activeInline={activeInline}
            onMenuParagraph={onMenuParagraph}
            onMenuHeader={onMenuHeader}
            onMenuList={onMenuList}
            onMenuCode={onMenuCode}
            onMenuAlign={onMenuAlign}
            onMenuInline={onMenuInline}
            onMenuClearInline={onMenuClearInline}
          />
        </div>
      </div>

      {/* 选中态：横向工具栏（始终挂载，按状态显示/隐藏） */}
      <div
        ref={selectionTbRef}
        className="ql-selection-toolbar"
        style={{ position: "absolute", top: selTbTop, left: selTbLeft, zIndex: 1000, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: "4px 6px", display: selTbVisible ? "flex" : "none", gap: 4, alignItems: "center" }}
        onMouseDown={e => e.preventDefault()}
      >
        <SelectionMenu
          activeHeader={activeHeader}
          activeList={activeList || null}
          activeCodeBlock={activeCodeBlock}
          activeAlign={activeAlign}
          activeInline={activeInline}
          onMenuParagraph={onMenuParagraph}
          onMenuHeader={onMenuHeader}
          onMenuList={onMenuList}
          onMenuCode={onMenuCode}
          onMenuAlign={onMenuAlign}
          onMenuInline={onMenuInline}
          onMenuClearInline={onMenuClearInline}
        />
      </div>
      {/* 调试：在 wrapper 内渲染一条虚线参考线，显示当前计算的 top（默认隐藏，通过 window.__VEDITOR_DEBUG__ 控制显示） */}
      <div
        ref={debugLineRef}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: tbTop,
          height: 0,
          borderTop: "1px dashed rgba(255, 0, 0, 0.6)",
          pointerEvents: "none",
          zIndex: 9999,
          display: "none",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

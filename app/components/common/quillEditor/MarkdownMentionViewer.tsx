/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import { useEffect, useMemo, useRef, useState } from "react";
import { renderInlineHtmlUsingWysiwyg } from "./htmlTagWysiwyg";
import { markdownToHtmlWithEntities, rawMarkdownToHtml } from "./markdownToHtml";
import MentionPreview from "./MentionPreview";

interface MarkdownMentionViewerProps {
  markdown: string;
  entitiesMap?: Record<string, string[]>; // { 人物: [...], 地点: [...], 物品: [...] }
  className?: string;
  // 控制预览面板是否启用
  enableHoverPreview?: boolean;
  // 可选：自定义提取实体详情（描述）的方法
  resolveDescription?: (category: string, name: string) => string | undefined;
}

/**
 * 只读模式：
 * - 将输入 markdown 渲染为 HTML（带实体校验的 mention span）
 * - 不提供编辑 / 所见即所得
 * - 支持鼠标悬停显示缩略 MentionPreview（与编辑器共用组件）
 */
export default function MarkdownMentionViewer(props: MarkdownMentionViewerProps) {
  const { markdown, entitiesMap, className, enableHoverPreview = true, resolveDescription } = props;
  const effectiveEntitiesMap = useMemo(() => {
    return entitiesMap || {};
  }, [entitiesMap]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<{
    category: string;
    name: string;
    description?: string;
    leftVw: number;
    topVw: number;
  } | null>(null);
  const lockRef = useRef(false);

  // 预编译 HTML（最小化重算）
  // 全局调试开关与便捷函数（与 MentionPreview 保持一致）
  // 打开方式：在浏览器控制台执行 window.__MENTION_PREVIEW_DEBUG__=true
  // 这里沿用相同变量，避免重复概念
  const html = useMemo(() => {
    const isDbg = (() => {
      try {
        return typeof window !== "undefined" && !!(window as any).__MENTION_PREVIEW_DEBUG__;
      }
      catch {
        return false;
      }
    })();
    const mvDbg = (...a: any[]) => {
      if (!isDbg) {
        return;
      }
      try {
        console.error("[MD-MENTION-VIEWER]", ...a);
      }
      catch {
        // ignore
      }
    };
    try {
      const md = markdown || "";
      const map = effectiveEntitiesMap;
      // 如果没有任何实体映射（提升性能），允许直接使用 rawMarkdownToHtml（与 MentionPreview 的逻辑对齐）
      const totalEntities = Object.values(map).reduce((acc, arr) => acc + (arr?.length || 0), 0);
      let baseHtml: string;
      if (totalEntities === 0) {
        baseHtml = rawMarkdownToHtml(md);
        mvDbg("rawMarkdownToHtml", { len: baseHtml.length });
      }
      else {
        baseHtml = markdownToHtmlWithEntities(md, map);
        mvDbg("markdownToHtmlWithEntities", { len: baseHtml.length });
      }
      if (!baseHtml) {
        return baseHtml;
      }
      // 引入与 MentionPreview 相同的：还原被转义的 <a>、Markdown 链接与裸链接自动转换
      try {
        if (baseHtml.includes("&lt;a")) {
          baseHtml = baseHtml.replace(/&lt;a\s+([^&]{0,300})&gt;([\s\S]*?)&lt;\/a&gt;/gi, (_m, attrPart, innerText) => {
            try {
              const allow = new Set(["href", "title", "id", "class"]);
              const attrs: string[] = [];
              const attrRegex = /(href|title|id|class)\s*=\s*("([^"]*)"|'([^']*)')/gi;
              let mm: RegExpExecArray | null = attrRegex.exec(attrPart);
              while (mm) {
                const rawName = mm[1];
                const name = rawName.toLowerCase();
                const val = mm[3] ?? mm[4] ?? "";
                if (allow.has(name)) {
                  if (name === "href" && /^javascript:/i.test(val)) {
                    // 跳过不安全协议
                  }
                  else {
                    const safeVal = val.replace(/"/g, "&quot;");
                    attrs.push(`${name}="${safeVal}` + `"`); // 拆开避免高亮器误判
                  }
                }
                mm = attrRegex.exec(attrPart);
              }
              const decodedInner = innerText
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, "\"");
              const safeInner = decodedInner
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
              const hrefAttr = attrs.find(a => a.startsWith("href="));
              if (!hrefAttr) {
                return _m;
              }
              const finalAttr = [hrefAttr, ...attrs.filter(a => !a.startsWith("href=")), "target=\"_blank\"", "rel=\"noopener noreferrer\""]
                .join(" ");
              return `<a ${finalAttr}>${safeInner}</a>`;
            }
            catch { return _m; }
          });
          mvDbg("restored escaped <a>");
        }
        // Markdown 链接
        baseHtml = baseHtml.replace(/\[([^\]]{1,80})\]\((https?:\/\/[^)\s]+)\)/g, (_m, text, url) => {
          const safeText = String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const safeUrl = String(url).replace(/"/g, "&quot;");
          return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${safeText}</a>`;
        });
        // 裸链接
        baseHtml = baseHtml.replace(/(^|[^"'>=])(https?:\/\/[^\s<]+)(?=$|\s|<)/g, (m, lead, url) => {
          if (/<a\b[^>]*>$/.test(lead)) {
            return m;
          }
          const safeUrl = url.replace(/"/g, "&quot;");
          return `${lead}<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${safeUrl}</a>`;
        });
        mvDbg("after link transforms");
        // 统一白名单再加工 (a/img/span/div) —— 复用 renderInlineHtmlUsingWysiwyg
        baseHtml = renderInlineHtmlUsingWysiwyg(baseHtml);
        mvDbg("after wysiwyg", { hasA: baseHtml.includes("<a") });
      }
      catch (err) {
        mvDbg("link transform error", err);
      }
      return baseHtml;
    }
    catch (e) {
      if ((window as any)?.__MENTION_PREVIEW_DEBUG__) {
        try {
          console.error("[MD-MENTION-VIEWER] parse error", e);
        }
        catch { /* ignore */ }
      }
      const esc = (markdown || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<pre style=\"margin:0;white-space:pre-wrap;\">${esc}</pre>`;
    }
  }, [markdown, effectiveEntitiesMap]);

  // 悬停逻辑（与编辑器类似但更精简）
  useEffect(() => {
    if (!enableHoverPreview) {
      return;
    }
    const root = containerRef.current;
    if (!root) {
      return;
    }
    const onOver = (e: MouseEvent) => {
      if (lockRef.current) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const span = target.closest("span.ql-mention-span[data-label][data-category]") as HTMLElement | null;
      if (!span) {
        setPreview(null);
        return;
      }
      try {
        const name = span.getAttribute("data-label") || span.textContent || "";
        const category = span.getAttribute("data-category") || "";
        if (!name || !category) {
          setPreview(null);
          return;
        }
        // 仅当实体仍存在
        const list = effectiveEntitiesMap[category] || [];
        if (!list.includes(name)) {
          setPreview(null);
          return;
        }
        const rect = span.getBoundingClientRect();
        const vw = Math.max(1, window.innerWidth || 1);
        // 位置：优先右侧，溢出则向左回退
        let left = rect.left / vw * 100;
        let top = rect.bottom / vw * 100; // 用同一 vw 比例即可，近似即可
        const panelW = 17.9; // 与 MentionPreview 保持一致
        if (left + panelW > 100) {
          left = Math.max(0, 100 - panelW - 1);
        }
        if (top + panelW > 100) {
          top = Math.max(0, (rect.top / vw * 100) - panelW - 1);
        }
        const desc = resolveDescription ? resolveDescription(category, name) : undefined;
        setPreview({ category, name, description: desc, leftVw: left, topVw: top });
      }
      catch {
        // ignore
      }
    };
    const onOut = (e: MouseEvent) => {
      if (lockRef.current) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const span = target?.closest("span.ql-mention-span[data-label][data-category]");
      if (span) {
        // 移出 span 但进入面板时保持
        // 直接等待 preview 面板自身的 onMouseEnter 处理锁
        // 这里不立即清除
      }
      else {
        setPreview(null);
      }
    };
    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseout", onOut);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseout", onOut);
    };
  }, [effectiveEntitiesMap, enableHoverPreview, resolveDescription]);

  return (
    <div className={className} style={{ position: "relative" }}>
      <div
        ref={containerRef}
        className="markdown-mention-viewer mention-markdown prose max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {preview && enableHoverPreview && (
        <MentionPreview
          category={preview.category}
          name={preview.name}
          description={preview.description}
          left={preview.leftVw}
          top={preview.topVw}
          onMouseEnter={() => { lockRef.current = true; }}
          onMouseLeave={() => {
            lockRef.current = false;
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}

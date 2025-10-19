/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import { useMemo, useRef } from "react";
import { renderInlineHtmlUsingWysiwyg } from "./htmlTagWysiwyg"; // 新增：复用只读 HTML 标签安全渲染
import { markdownToHtmlWithEntities, rawMarkdownToHtml } from "./markdownToHtml";
import "./quill-overrides.css";

let __mpCounter = 0; // 调试：区分多个 MentionPreview 实例
// 全局调试开关：在控制台执行 window.__MENTION_PREVIEW_DEBUG__=true 打开；false 关闭
declare global { interface Window { __MENTION_PREVIEW_DEBUG__?: boolean } }
function mpDbg(...args: any[]) {
  try {
    if (typeof window === "undefined" || !window.__MENTION_PREVIEW_DEBUG__) {
      return;
    }
    console.error("[MP-DBG]", ...args);
  }
  catch { /* ignore */ }
}
mpDbg("file loaded / module eval");

interface MentionPreviewProps {
  category: string;
  name: string;
  description?: string;
  left: number; // vw
  top: number; // vw
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  // 可选：用于校验 @类别名称 是否存在；如果不传则直接按原始 markdown 渲染（与编辑区保持一致）
  entitiesMap?: Record<string, string[]>; // { 人物: [...], 地点: [...], 物品: [...] }
}

// 300px / 1680px ≈ 17.86vw；使用 17.9vw 四舍五入
const WRAP_WIDTH_VW = 17.9;
const WRAP_HEIGHT_VW = 17.9; // 同宽度形成正方/接近正方区域

export function MentionPreview(props: MentionPreviewProps) {
  const { category, name, description, left, top, onMouseEnter, onMouseLeave, entitiesMap } = props;
  const idRef = useRef<number>(++__mpCounter);
  const id = idRef.current;
  mpDbg("render start", { id, descLen: (description || "").length });

  // 只读转换：支持 **bold** / *italic* / _italic_ / ~~strike~~ / ++underline++ / @人物张三 及 /t 缩进 等现有自定义规则
  // 说明：
  // 1) 使用现有 markdownToHtmlWithEntities 以最大复用（里面已处理 @mention 生成 span、空行、列表、code 等）
  // 2) MentionPreview 本身不需要 hover 再弹下一层，所以不加额外事件；span.ql-mention-span 仍可沿用样式。
  // 3) 【新增】与 MarkdownMentionViewer 对齐：支持还原被转义的 <a>、Markdown 链接 [text](url) 与裸链接自动转为 <a>，以及批量处理保留的 <a>/<img>/<span>/<div> 标签（安全白名单）
  const renderedHtml = useMemo(() => {
    mpDbg("useMemo start", { id });
    if (!description || !description.trim()) {
      mpDbg("empty description", { id });
      return "";
    }
    const safeMap = entitiesMap || { 人物: [], 地点: [], 物品: [] };
    const totalEntities = [...(safeMap.人物 || []), ...(safeMap.地点 || []), ...(safeMap.物品 || [])].length;
    let baseHtml: string;
    try {
      if (totalEntities === 0) {
        baseHtml = rawMarkdownToHtml(description);
        mpDbg("rawMarkdownToHtml", { id, len: baseHtml.length, head: baseHtml.slice(0, 120) });
      }
      else {
        baseHtml = markdownToHtmlWithEntities(description, safeMap);
        mpDbg("markdownToHtmlWithEntities", { id, len: baseHtml.length, head: baseHtml.slice(0, 120) });
      }
    }
    catch {
      mpDbg("md parse error -> fallback pre", { id });
      const esc = description
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<pre style=\"margin:0;white-space:pre-wrap;\">${esc}</pre>`;
    }

    if (!baseHtml) {
      mpDbg("baseHtml empty after parse", { id });
      return baseHtml;
    }

    try {
      if (baseHtml.includes("&lt;a")) {
        mpDbg("detected escaped <a>", { id });
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
                  // skip unsafe
                }
                else {
                  const safeVal = val.replace(/"/g, "&quot;");
                  attrs.push(`${name}="${safeVal}` + `"`); // 拆开避免某些高亮器误判
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
          catch {
            return _m;
          }
        });
        mpDbg("after escaped <a> restore", { id, len: baseHtml.length });
      }
      // Markdown 链接 [text](url)
      baseHtml = baseHtml.replace(/\[([^\]]{1,80})\]\((https?:\/\/[^)\s]+)\)/g, (_m, text, url) => {
        const safeText = String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeUrl = String(url).replace(/"/g, "&quot;");
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${safeText}</a>`;
      });
      mpDbg("after md link replace", { id, len: baseHtml.length, head: baseHtml.slice(0, 120) });
      // 裸链接 http/https（不在现有 <a> 内）
      baseHtml = baseHtml.replace(/(^|[^"'>=])(https?:\/\/[^\s<]+)(?=$|\s|<)/g, (m, lead, url) => {
        if (/<a\b[^>]*>$/.test(lead)) {
          return m;
        }
        const safeUrl = url.replace(/"/g, "&quot;");
        return `${lead}<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${safeUrl}</a>`;
      });
      mpDbg("after bare link replace", { id, len: baseHtml.length, head: baseHtml.slice(0, 120) });
      // 补：处理未闭合的原始 <a ...>（无 </a>）——自动补全并以 href 作为显示文本
      // 使用较为保守的模式匹配“可能未闭合的 <a ...>”——限制属性长度避免回溯；不跨多标签
      if (/<a\s[^>]{0,200}>/i.test(baseHtml) && !/<a\s[^>]{0,200}>[\s\S]*?<\/a>/i.test(baseHtml)) {
        baseHtml = baseHtml.replace(/<a\s([^>]{0,200}href=(?:"[^"]{0,180}"|'[^']{0,180}')[^>]*)>(?![\s\S]*?<\/a>)/gi, (m, attrPart) => {
          try {
            const attrRegex = /(href|title|id|class)\s*=\s*("([^"]*)"|'([^']*)')/gi;
            const allow = new Set(["href", "title", "id", "class"]);
            const kept: string[] = [];
            let mm: RegExpExecArray | null = attrRegex.exec(attrPart);
            let hrefVal = "";
            while (mm) {
              const name = mm[1].toLowerCase();
              const val = mm[3] ?? mm[4] ?? "";
              if (allow.has(name)) {
                if (name === "href") {
                  if (/^javascript:/i.test(val)) {
                    return m; // 不安全直接放弃
                  }
                  hrefVal = val;
                }
                const safeVal = val.replace(/"/g, "&quot;");
                kept.push(`${name}="${safeVal}"`);
              }
              mm = attrRegex.exec(attrPart);
            }
            if (!hrefVal) {
              return m; // 没有 href 不处理
            }
            kept.push("target=\"_blank\"", "rel=\"noopener noreferrer\"");
            mpDbg("auto-close orphan <a>", { id, href: hrefVal });
            const display = hrefVal.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<a ${kept.join(" ")}>${display}</a>`;
          }
          catch {
            return m;
          }
        });
      }
      // 最终：调用统一的 HTML 白名单再加工（a/img/span/div）
      mpDbg("before wysiwyg pass", { id, len: baseHtml.length });
      mpDbg("pre-wysiwyg-snippet", {
        id,
        aIndex: baseHtml.indexOf("<a"),
        around: (() => {
          const idx = baseHtml.indexOf("<a");
          return idx >= 0 ? baseHtml.slice(Math.max(0, idx - 40), idx + 120) : "";
        })(),
      });
      baseHtml = renderInlineHtmlUsingWysiwyg(baseHtml);
      mpDbg("after wysiwyg pass", { id, len: baseHtml.length, head: baseHtml.slice(0, 160) });
      if (!baseHtml.includes("<a") && /[_/]t="_blank"/.test(baseHtml)) {
        mpDbg("post-wysiwyg-broken-frag-detected", {
          id,
          frag: baseHtml.match(/.{0,30}[_/]t="_blank".{0,30}/),
        });
      }
    }
    catch {
      mpDbg("link/html transform error", { id });
    }
    mpDbg("useMemo end", { id });
    // 暴露 debug 数据到 window 方便 hover 急速消失时在控制台取值
    try {
      if (typeof window !== "undefined") {
        (window as any).__mpDebug = (window as any).__mpDebug || {};
        (window as any).__mpDebug[id] = {
          id,
          description,
          finalLen: baseHtml.length,
          preview: baseHtml.slice(0, 400),
        };
      }
    }
    catch { /* ignore */ }
    return baseHtml;
  }, [description, entitiesMap, id]);
  return (
    <div
      className="mention-preview shadow-lg rounded-md overflow-hidden border border-base-300 bg-base-100 text-sm"
      style={{
        position: "fixed",
        width: `${WRAP_WIDTH_VW}vw`,
        maxWidth: `${WRAP_WIDTH_VW}vw`,
        height: `${WRAP_HEIGHT_VW}vw`,
        maxHeight: `${WRAP_HEIGHT_VW}vw`,
        left: `${left}vw`,
        top: `${top}vw`,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
      data-mention-preview-id={id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="px-3 py-2 font-semibold border-b border-base-300 flex items-center gap-2 text-primary">
        <span className="text-xs uppercase tracking-wide opacity-70">{category}</span>
        <span className="truncate" title={name}>{name}</span>
      </div>
      <div
        className="flex-1 p-3 overflow-auto leading-relaxed text-xs markdown-preview-body mention-markdown"
        style={{ wordBreak: "break-word" }}
      >
        {renderedHtml
          ? <div className="preview-html" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          : <span className="opacity-50">暂无描述</span>}
      </div>
    </div>
  );
}

export default MentionPreview;

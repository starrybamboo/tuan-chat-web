// 极简 Markdown/HTML 转换占位实现（保证类型与调用方存在，避免构建错误）
// 原始 Markdown -> HTML（不做实体存在性校验）
// 空行兼容：旧版本可能序列化为字面 "\\n"、"__BLANK_LINE__" 或私有区哨兵 U+E000。
// 现在策略：解析阶段统一识别后直接用空字符串标识，不再向下游传递私有区字符，避免渲染字体显示方块。
const LEGACY_SENTINEL = "\uE000";
export function isBlankLineSentinel(v: string): boolean {
  return v === LEGACY_SENTINEL;
}

export function rawMarkdownToHtml(md: string): string {
  if (!md)
    return "";
  try {
    console.warn("[MD->HTML][rawMarkdownToHtml] input.length", md.length);
  }
  catch { /* ignore */ }
  const norm = md.replace(/\r\n?/g, "\n");
  let lines = norm.split(/\n/);
  // 统一折叠为空字符串（逻辑空行）
  lines = lines.map(l => (l === "\\n" || l === "__BLANK_LINE__" || l === LEGACY_SENTINEL) ? "" : l);
  const blocks: string[] = [];
  const mentionPattern = /@(人物|地点|物品)(\S+)/g;
  const applyInline = (text: string): string => {
    if (!text)
      return "";
    let out = text.replace(mentionPattern, (_m, cat, name) => {
      const safeName = String(name || "").replace(/[<>]/g, "");
      const safeCat = String(cat || "").replace(/[<>]/g, "");
      return `<span class="ql-mention-span" data-label="${safeName}" data-category="${safeCat}">${safeName}</span>`;
    });
    out = out.replace(/(\*\*|__)([^\n]+?)\1/g, (_m, _b, inner) => `<strong>${inner}</strong>`);
    out = out.replace(/(^|\s)\*([^\n*]+)\*(?=\s|$)/g, (m, pre, inner) => `${pre}<em>${inner}</em>`);
    out = out.replace(/(^|\s)_([^\n_]+)_(?=\s|$)/g, (m, pre, inner) => `${pre}<em>${inner}</em>`);
    out = out.replace(/\+\+([^\n]+?)\+\+/g, (_m, inner) => `<u>${inner}</u>`);
    out = out.replace(/~~([^\n]+?)~~/g, (_m, inner) => `<s>${inner}</s>`);
    return out;
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      blocks.push("<p><br></p>");
      i++;
      continue;
    }
    const headingMatch = /^(#{1,3})[ \t]([^\n]+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      blocks.push(`<h${level}>${applyInline(content)}</h${level}>`);
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const trimmed = line.trim();
      if (trimmed === "``````") {
        blocks.push("<pre><code></code></pre>");
        i++;
        continue;
      }
      const single = /^```([^`].*?)```$/.exec(trimmed);
      if (single) {
        const inner = single[1];
        const escaped = inner.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        blocks.push(`<pre><code>${escaped}</code></pre>`);
        i++;
        continue;
      }
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i] === "" ? "" : lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].startsWith("```")) {
        i++;
      }
      const joined = codeLines.join("\n");
      if (joined.trim().length === 0) {
        blocks.push("<pre><code></code></pre>");
      }
      else {
        const escaped = joined.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        blocks.push(`<pre><code>${escaped}</code></pre>`);
      }
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const raw = lines[i].replace(/^\d+\.\s+/, "");
        items.push(`<li>${applyInline(raw)}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (/^[\-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-*+]\s+/.test(lines[i])) {
        const raw = lines[i].replace(/^[\-*+]\s+/, "");
        items.push(`<li>${applyInline(raw)}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) {
      let combined = para.join(" ");
      let alignAttr = "";
      if (combined.endsWith("c")) {
        alignAttr = " align=\"center\"";
        combined = combined.slice(0, -1).trimEnd();
      }
      else if (combined.endsWith("r")) {
        alignAttr = " align=\"right\"";
        combined = combined.slice(0, -1).trimEnd();
      }
      else if (combined.endsWith("b")) {
        alignAttr = " align=\"justify\"";
        combined = combined.slice(0, -1).trimEnd();
      }
      blocks.push(`<p${alignAttr}>${applyInline(combined)}</p>`);
    }
  }
  const html = blocks.join("");
  try {
    console.warn("[MD->HTML][rawMarkdownToHtml] output.length", html.length);
  }
  catch { /* ignore */ }
  return html;
}

// 带实体校验版本：仅当名称存在于 entitiesMap[category] 时保留 span，否则回退为原始文本 @类别名称
export function markdownToHtmlWithEntities(md: string, entitiesMap: Record<string, string[]>): string {
  if (!md)
    return "";
  try {
    console.warn("[MD->HTML][markdownToHtmlWithEntities] input.length", md.length);
  }
  catch { /* ignore */ }
  const preliminary = rawMarkdownToHtml(md);
  if (!preliminary)
    return "";
  const container = typeof document !== "undefined" ? document.createElement("div") : null;
  if (!container)
    return preliminary; // 非浏览器环境直接返回
  container.innerHTML = preliminary;
  const spans = container.querySelectorAll("span.ql-mention-span[data-label][data-category]");
  spans.forEach((span: Element) => {
    const label = span.getAttribute("data-label") || "";
    const category = span.getAttribute("data-category") || "";
    if (!label || !category)
      return;
    const list = entitiesMap[category] || [];
    // 精确匹配（大小写敏感）
    if (!list.includes(label)) {
      // 回退为纯文本形式 @类别名称
      const textNode = container.ownerDocument!.createTextNode(`@${category}${label}`);
      span.parentNode?.replaceChild(textNode, span);
    }
  });
  const out = container.innerHTML;
  try {
    console.warn("[MD->HTML][markdownToHtmlWithEntities] output.length", out.length);
  }
  catch { /* ignore */ }
  return out;
}

/**
 * 将 HTML 或纯文本中的 @类别名称 转成 span.ql-mention-span
 */
export function enhanceMentionsInHtml(raw: string, categories: string[] = ["人物", "地点", "物品"]): string {
  if (!raw)
    return "";
  try {
    console.warn("[MENTION][enhanceMentionsInHtml] input.length", raw.length);
  }
  catch { /* ignore */ }
  if (typeof document === "undefined") {
    const catAlt = categories.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const re = new RegExp(`@(${catAlt})([^\\s<>{}]+)`, "g");
    return raw.replace(re, (_m, cat, name) => `<span class=\"ql-mention-span\" data-label=\"${name}\" data-category=\"${cat}\">${name}</span>`);
  }
  const container = document.createElement("div");
  container.innerHTML = raw;
  const catSet = new Set(categories);
  const catAlt = categories.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const mentionRe = new RegExp(`@(${catAlt})([^\s<>\u3000\u00A0\t\r\n]+)`, "g");
  const skip = (n: Node | null): boolean => {
    while (n) {
      if (n instanceof HTMLElement) {
        if (n.classList.contains("ql-code-block"))
          return true;
        const tag = n.tagName.toLowerCase();
        if (tag === "code" || tag === "pre")
          return true;
        if (n.classList.contains("ql-mention-span"))
          return true;
      }
      n = n.parentNode as (Node | null);
    }
    return false;
  };
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      if (skip(node.parentNode))
        return;
      const text = node.textContent || "";
      if (!text.includes("@"))
        return;
      if (!mentionRe.test(text)) {
        mentionRe.lastIndex = 0;
        return;
      }
      mentionRe.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      let m: RegExpExecArray | null = mentionRe.exec(text);
      while (m) {
        const full = m[0];
        const cat = m[1];
        const name = m[2];
        if (m.index > last)
          frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        if (catSet.has(cat)) {
          const span = document.createElement("span");
          span.className = "ql-mention-span";
          span.setAttribute("data-label", name);
          span.setAttribute("data-category", cat);
          span.textContent = name;
          frag.appendChild(span);
        }
        else {
          frag.appendChild(document.createTextNode(full));
        }
        last = m.index + full.length;
        m = mentionRe.exec(text);
      }
      if (last < text.length)
        frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode?.replaceChild(frag, node);
      return;
    }
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === "code" || tag === "pre" || el.classList.contains("ql-code-block"))
        return;
      Array.from(el.childNodes).forEach(c => walk(c));
    }
  };
  Array.from(container.childNodes).forEach(c => walk(c));
  const enhanced = container.innerHTML;
  try {
    console.warn("[MENTION][enhanceMentionsInHtml] replacedSpans", container.querySelectorAll("span.ql-mention-span").length);
  }
  catch { /* ignore */ }
  return enhanced;
}

/**
 * 后端内容 -> HTML（覆盖导入场景）
 */
export function backendContentToQuillHtml(content: string, format: "markdown" | "html" | "text" = "html"): string {
  if (!content)
    return "";
  try {
    console.warn("[IMPORT][backendContentToQuillHtml] start", { format, len: content.length });
  }
  catch { /* ignore */ }
  let html: string;
  if (format === "markdown") {
    html = rawMarkdownToHtml(content);
  }
  else if (format === "text") {
    const safe = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = safe.split(/\r?\n/).map(l => l.trim() ? `<p>${l}</p>` : "").join("");
  }
  else {
    html = content;
  }
  const finalHtml = enhanceMentionsInHtml(html);
  try {
    console.warn("[IMPORT][backendContentToQuillHtml] done", { finalLen: finalHtml.length });
  }
  catch { /* ignore */ }
  return finalHtml;
}

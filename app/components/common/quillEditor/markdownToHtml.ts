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
  const norm = md.replace(/\r\n?/g, "\n");
  let lines = norm.split(/\n/);
  // 统一折叠为空字符串（逻辑空行）
  lines = lines.map(l => (l === "\\n" || l === "__BLANK_LINE__" || l === LEGACY_SENTINEL) ? "" : l);
  const blocks: string[] = [];
  const mentionPattern = /@(人物|地点|物品)(\S+)/g;
  const preserveRuns = (txt: string): string => {
    // 已经包含 &nbsp; 的段落说明部分空格已被处理，避免重复；我们只把纯普通空格的连续串转换
    return txt.replace(/ {2,}/g, (m) => {
      // m 长度 >=2, 保留首个普通空格，其余转 &nbsp;
      if (!m.trim()) {
        return ` ${"&nbsp;".repeat(m.length - 1)}`;
      }
      return m; // 理论上纯空格，这里防御
    });
  };
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
    out = preserveRuns(out);
    return out;
  };
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) { // 空行
      blocks.push("<p><br></p>");
      continue;
    }
    // 水平分隔线：独立一行的 --- （不允许有其它字符，允许前后空白）
    if (/^\s*---\s*$/.test(line)) {
      blocks.push("<hr>");
      continue;
    }
    // 单行 heading
    const headingMatch = /^(#{1,3})[ \t]([^\n]+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      blocks.push(`<h${level}>${applyInline(content)}</h${level}>`);
      continue;
    }
    // fenced code（单行）
    if (/^```[^`].*?```$/.test(line.trim())) {
      const inner = line.trim().replace(/^```|```$/g, "");
      const escaped = inner.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      blocks.push(`<pre><code>${escaped}</code></pre>`);
      continue;
    }
    // fenced code 多行块开始
    if (line.trim().startsWith("```")) {
      const codeBody: string[] = [];
      let j = idx + 1;
      while (j < lines.length) {
        const ln = lines[j].trim();
        if (ln.startsWith("```"))
          break;
        codeBody.push(lines[j]);
        j++;
      }
      if (j < lines.length && lines[j].trim().startsWith("```")) {
        idx = j; // 跳过结束 fence
      }
      else {
        idx = lines.length; // 未闭合：视作到末尾
      }
      const joined = codeBody.join("\n");
      const escaped = joined.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      blocks.push(`<pre><code>${escaped}</code></pre>`);
      continue;
    }
    // ===== 嵌套列表解析（树构建：子列表嵌入父 <li> 内） =====
    if (/^[ \t]{0,30}(?:\d+\.\s+|[\-*+]\s+)/.test(line)) {
      type ListNode = { indent: number; ordered: boolean; content: string; children: ListNode[] };
      const root: ListNode[] = [];
      const stack: { indent: number; nodes: ListNode[] }[] = [{ indent: -1, nodes: root }];
      const getIndent = (s: string) => s.replace(/\t/g, "    ").length;
      let j = idx;
      for (; j < lines.length; j++) {
        const ln = lines[j];
        if (!ln.trim()) {
          break;
        }
        const m = /^([ \t]{0,30})(.*)$/.exec(ln);
        if (!m) {
          break;
        }
        const indent = getIndent(m[1] || "");
        let rest = m[2];
        let ordered = false;
        const orderedHead = /^\d+\.\s+/.exec(rest);
        if (orderedHead) {
          ordered = true;
          rest = rest.slice(orderedHead[0].length);
        }
        else {
          const bulletHead = /^[\-*+]\s+/.exec(rest);
          if (bulletHead) {
            rest = rest.slice(bulletHead[0].length);
          }
          else {
            break; // 非列表行
          }
        }
        while (stack.length && indent <= stack[stack.length - 1].indent) {
          stack.pop();
        }
        if (!stack.length) {
          stack.push({ indent: -1, nodes: root });
        }
        // 仅当缩进 > 顶层且不是 0（根层）时才进入子层级
        if (indent > stack[stack.length - 1].indent && !(stack[stack.length - 1].indent === -1 && indent === 0)) {
          const parentArr = stack[stack.length - 1].nodes;
          const parentNode = parentArr[parentArr.length - 1];
          if (parentNode) {
            stack.push({ indent, nodes: parentNode.children });
          }
        }
        const arr = stack[stack.length - 1].nodes;
        arr.push({ indent, ordered, content: rest.trim(), children: [] });
      }
      const renderNodes = (nodes: ListNode[]): string => {
        let html = "";
        let i = 0;
        while (i < nodes.length) {
          const orderedFlag = nodes[i].ordered;
          html += orderedFlag ? "<ol>" : "<ul>";
          while (i < nodes.length && nodes[i].ordered === orderedFlag) {
            const n = nodes[i];
            html += `<li>${applyInline(n.content)}${n.children.length ? renderNodes(n.children) : ""}</li>`;
            i++;
          }
          html += orderedFlag ? "</ol>" : "</ul>";
        }
        return html;
      };
      blocks.push(renderNodes(root));
      idx = j - 1;
      continue;
    }
    // 普通段落（单行）
    let alignAttr = "";
    let content = line;
    // 解析首行 /t 缩进令牌：连续 /t 代表缩进单位，每单位转为 4 个不可折叠空格（&nbsp;×4）
    if (/^(?:\/t)+/.test(content)) {
      const tokenMatch = /^(?:\/t)+/.exec(content);
      if (tokenMatch) {
        const tokenSeq = tokenMatch[0];
        const unitCount = tokenSeq.length / 2; // '/t' 长度为2
        const indentHtml = Array.from({ length: unitCount }, () => "&nbsp;&nbsp;&nbsp;&nbsp;").join("");
        content = indentHtml + content.slice(tokenSeq.length);
      }
    }
    if (content.endsWith("/center")) {
      alignAttr = " align=\"center\"";
      content = content.slice(0, -7).trimEnd();
    }
    else if (content.endsWith("/right")) {
      alignAttr = " align=\"right\"";
      content = content.slice(0, -6).trimEnd();
    }
    else if (content.endsWith("/justify")) {
      alignAttr = " align=\"justify\"";
      content = content.slice(0, -8).trimEnd();
    }
    content = preserveRuns(content);
    blocks.push(`<p${alignAttr}>${applyInline(content)}</p>`);
  }
  const html = blocks.join("");
  return html;
}

// 带实体校验版本：仅当名称存在于 entitiesMap[category] 时保留 span，否则回退为原始文本 @类别名称
export function markdownToHtmlWithEntities(md: string, entitiesMap: Record<string, string[]>): string {
  if (!md)
    return "";
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
  return out;
}

/**
 * 将 HTML 或纯文本中的 @类别名称 转成 span.ql-mention-span
 */
export function enhanceMentionsInHtml(raw: string, categories: string[] = ["人物", "地点", "物品"]): string {
  if (!raw)
    return "";
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
  return enhanced;
}

/**
 * 后端内容 -> HTML（覆盖导入场景）
 */
export function backendContentToQuillHtml(content: string, format: "markdown" | "html" | "text" = "html"): string {
  if (!content)
    return "";
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
  return finalHtml;
}

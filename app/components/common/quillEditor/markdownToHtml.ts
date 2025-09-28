// 极简 Markdown/HTML 转换占位实现（保证类型与调用方存在，避免构建错误）
// 原始 Markdown -> HTML（不做实体存在性校验）
export function rawMarkdownToHtml(md: string): string {
  if (!md)
    return "";
  // 统一换行
  const norm = md.replace(/\r\n?/g, "\n");
  const lines = norm.split(/\n/);
  const blocks: string[] = [];
  const mentionPattern = /@(人物|地点|物品)(\S+)/g;

  // 行内格式：先在块级拼装后统一处理（避免被块解析拆散）
  const applyInline = (text: string): string => {
    if (!text)
      return "";
    // 先处理 mention
    let out = text.replace(mentionPattern, (_m, cat, name) => {
      const safeName = String(name || "").replace(/[<>]/g, "");
      const safeCat = String(cat || "").replace(/[<>]/g, "");
      return `<span class=\"ql-mention-span\" data-label=\"${safeName}\" data-category=\"${safeCat}\">${safeName}</span>`;
    });
    // 加粗 **text** 或 __text__
    out = out.replace(/(\*\*|__)([^\n]+?)\1/g, (_m, _b, inner) => `<strong>${inner}</strong>`);
    // 斜体 *text* 或 _text_ （排除已被加粗处理的 ** 形式）
    // 斜体：简单版本，避免复杂回溯；不匹配 ** 已处理过的场景（加粗在前）
    out = out.replace(/(^|\s)\*([^\n*]+)\*(?=\s|$)/g, (m, pre, inner) => `${pre}<em>${inner}</em>`);
    out = out.replace(/(^|\s)_([^\n_]+)_(?=\s|$)/g, (m, pre, inner) => `${pre}<em>${inner}</em>`);
    // 下划线：自定义语法 ++text++ （Markdown 标准无下划线，这里自定义）
    out = out.replace(/\+\+([^\n]+?)\+\+/g, (_m, inner) => `<u>${inner}</u>`);
    // 删除线 ~~text~~
    out = out.replace(/~~([^\n]+?)~~/g, (_m, inner) => `<s>${inner}</s>`);
    return out;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // 空行 -> 段落分隔
    if (!line.trim()) {
      blocks.push("");
      i++;
      continue;
    }
    // 标题 # / ## / ###
    const headingMatch = /^(#{1,3})[ \t]([^\n]+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      blocks.push(`<h${level}>${applyInline(content)}</h${level}>`);
      i++;
      continue;
    }
    // 代码块
    if (line.startsWith("```")) {
      const trimmed = line.trim();
      // 占位符
      if (trimmed === "``````") {
        blocks.push("<pre><code></code></pre>");
        i++;
        continue;
      }
      // 单行 fenced
      const single = /^```([^`].*?)```$/.exec(trimmed);
      if (single) {
        const inner = single[1];
        const escaped = inner.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        blocks.push(`<pre><code>${escaped}</code></pre>`);
        i++;
        continue;
      }
      // 多行 fenced: 收集后续直到结束 ```
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].startsWith("```")) {
        i++; // consume closing
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
    // 有序列表
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
    // 无序列表
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
    // 段落：直到空行
    const para: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      para.push(lines[i]);
      i++;
    }

    if (para.length > 0) {
      let combined = para.join(" "); // 在此简化实现中，将多行合并为空格
      let alignAttr = "";

      // 检测并移除对齐后缀
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

  // 把空块压成段落分隔
  const html = blocks.map(b => b === "" ? "" : b).join("");
  return html;
}

// 带实体校验版本：仅当名称存在于 entitiesMap[category] 时保留 span，否则回退为原始文本 @类别名称
export function markdownToHtmlWithEntities(md: string, entitiesMap: Record<string, string[]>): string {
  if (!md)
    return "";
    // 先用 raw 转，再扫描 span 校验
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
  return container.innerHTML;
}

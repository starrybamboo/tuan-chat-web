// ================= 重构版本说明 =================
// 目标：在保持旧实现输出兼容的前提下，拆分逻辑、提高可读性与可维护性。
// 关键兼容点：
//  1. 空行 -> 以字面 "\\n" 行表示（旧私有区与 __BLANK_LINE__ 继续识别）。
//  2. 代码块：连续 div.ql-code-block 合并为 fenced，空代码块 -> `````` ，单行 -> ```code```。
//  3. 缩进：Tab / 4 空格 -> 一个 /t；ql-indent-N / style(text-indent|padding-left|margin-left) -> 追加 /t。
//  4. 对齐：段末追加 /center | /right | /between (原 c/r/b 改为明确指令，方便后端区分；/between 对应 justify)。
//  5. Mention: <span class=ql-mention-span data-label data-category> -> @类别名称。
//  6. 行内格式：strong/b -> ** **; em/i -> * *; u -> ++ ++; s/strike/del -> ~~ ~~; code -> ` `。
//  7. a/img 标签保留 outerHTML，但剔除 rel/target。
//  8. 列表：<ol>/<ul> 与 <li>，含 <ol class=ql-bullet> 强制无序。
//  9. 回退：若未检测到 fenced 但 DOM 含 code-block 结构，补充一次扫描。

const LEGACY_SENTRY_BLANK_LINE = "\uE000"; // 仅识别，不再写入

type ListCtx = { type: "ol" | "ul"; counter: number };

type ParseEnv = {
  lines: string[];
  listStack: ListCtx[];
  rootHtml: string;
};

// ---------- 工具函数 ----------
function createRoot(html: string): HTMLElement | null {
  if (!html)
    return null;
  if (typeof document === "undefined")
    return null;
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
}

function normalizeInlineText(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\s+/g, m => (m.length > 1 ? " " : m));
}

function stripLinkRelTarget(raw: string): string {
  let cleaned = raw
    .replace(/\s+(?:rel|target)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:rel|target)(?=\s|>)/gi, "");
  cleaned = cleaned.replace(/<a\s+/i, m => m.replace(/\s{2,}/g, " "));
  cleaned = cleaned.replace(/\s+>/g, ">");
  return cleaned;
}

function convertInlineHtmlToMd(container: HTMLElement): string {
  let html = container.innerHTML || "";
  const preserved: string[] = [];
  html = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (m) => {
    preserved.push(stripLinkRelTarget(m));
    return `__PRESERVE_A_${preserved.length - 1}__`;
  });
  html = html.replace(/<img\b[^>]*>/gi, (m) => {
    preserved.push(m);
    return `__PRESERVE_IMG_${preserved.length - 1}__`;
  });
  html = html
    .replace(/<strong>([\s\S]*?)<\/strong>/g, "**$1**")
    .replace(/<b>([\s\S]*?)<\/b>/g, "**$1**")
    .replace(/<em>([\s\S]*?)<\/em>/g, "*$1*")
    .replace(/<i>([\s\S]*?)<\/i>/g, "*$1*")
    .replace(/<u>([\s\S]*?)<\/u>/g, "++$1++")
    .replace(/<(?:s|strike|del)>([\s\S]*?)<\/(?:s|strike|del)>/g, "~~$1~~")
    .replace(/<code>([\s\S]*?)<\/code>/g, "`$1`");
  html = html.replace(/<[^>]+>/g, "");
  html = html.replace(/__PRESERVE_(A|IMG)_(\d+)__/g, (_m, _t, i) => preserved[Number(i)] || "");
  return html;
}

function ensureBulletOlToUl(root: HTMLElement) {
  try {
    const bulletOls = root.querySelectorAll("ol.ql-bullet");
    bulletOls.forEach((ol) => {
      const ul = root.ownerDocument!.createElement("ul");
      Array.from(ol.childNodes).forEach(n => ul.appendChild(n));
      ol.parentNode?.replaceChild(ul, ol);
    });
  }
  catch { /* ignore */ }
}

function restoreMentions(root: HTMLElement) {
  try {
    const nodes = root.querySelectorAll("span.ql-mention-span[data-label][data-category]");
    nodes.forEach((node: any) => {
      const label = node.getAttribute("data-label") || node.textContent || "";
      const category = node.getAttribute("data-category") || "";
      if (category && label) {
        node.parentNode?.replaceChild(root.ownerDocument!.createTextNode(`@${category}${label}`), node);
      }
    });
  }
  catch { /* ignore */ }
}

function pushCodeFenced(env: ParseEnv, raw: string) {
  const joined = raw;
  if (joined.trim().length === 0) {
    env.lines.push("``````");
  }
  else {
    const sanitized = joined.replace(/```/g, "\`\`\`");
    if (!/\n/.test(sanitized)) {
      env.lines.push(`\`\`\`${sanitized}\`\`\``);
    }
    else {
      env.lines.push(`\n\`\`\`\n${sanitized}\n\`\`\``.trim());
    }
  }
}

function handleCodeBlockDiv(node: HTMLElement, env: ParseEnv) {
  // 若前一个兄弟也是 code-block 则跳过（第一行聚合）
  let prev = node.previousSibling;
  while (prev && prev.nodeType === 3 && (prev.textContent || "").trim() === "") {
    prev = prev.previousSibling; // 跳过空白文本
  }
  if (prev && prev.nodeType === 1 && (prev as HTMLElement).classList.contains("ql-code-block")) {
    return; // 不是首行
  }
  const lines: string[] = [];
  let cursor: Node | null = node;
  while (cursor) {
    if (cursor.nodeType === 1 && (cursor as HTMLElement).classList.contains("ql-code-block")) {
      lines.push(((cursor as HTMLElement).textContent || "").replace(/\u00A0/g, " "));
      cursor = cursor.nextSibling;
      continue;
    }
    if (cursor.nodeType === 3 && (cursor.textContent || "").trim() === "") {
      cursor = cursor.nextSibling;
      continue;
    }
    break;
  }
  pushCodeFenced(env, lines.join("\n"));
}

function handlePre(node: HTMLElement, env: ParseEnv) {
  const codeEl = node.querySelector("code");
  const text = (codeEl ? codeEl.textContent : node.textContent) || "";
  pushCodeFenced(env, text.replace(/\u00A0/g, " "));
}

function handleHeading(node: HTMLElement, env: ParseEnv) {
  const tag = node.tagName.toLowerCase();
  const text = normalizeInlineText(node.textContent || "").trim();
  if (!text)
    return;
  const prefix = tag === "h1" ? "# " : tag === "h2" ? "## " : "### ";
  env.lines.push(prefix + text);
}

function listCtxPush(env: ParseEnv, type: "ol" | "ul") {
  env.listStack.push({ type, counter: 0 });
}
function listCtxPop(env: ParseEnv) {
  env.listStack.pop();
}
function flushListContextIfNeeded(env: ParseEnv, tag: string) {
  if (!(tag === "ul" || tag === "ol" || tag === "li")) {
    env.listStack = [];
  }
}

function handleLi(node: HTMLElement, env: ParseEnv) {
  const ctx = env.listStack[env.listStack.length - 1];
  const forceBullet = node.getAttribute("data-list") === "bullet" || node.classList.contains("ql-bullet");
  const text = normalizeInlineText(node.textContent || "").trim();
  if (ctx && ctx.type === "ol" && !forceBullet) {
    ctx.counter += 1;
    env.lines.push(`${ctx.counter}. ${text}`);
  }
  else {
    env.lines.push(`- ${text}`);
  }
}

function extractIndentTokens(node: HTMLElement, inlineRawIn: string): { textBody: string; indentPrefix: string } {
  let inlineRaw = inlineRawIn;
  if (inlineRaw.includes("&nbsp;")) {
    inlineRaw = inlineRaw.replace(/&nbsp;/g, "\u00A0");
  }
  const leadingMatch = /^([ \t\u00A0]+)/.exec(inlineRaw);
  let indentPrefix = "";
  let body = inlineRaw;
  if (leadingMatch) {
    const leading = leadingMatch[1];
    body = inlineRaw.slice(leading.length);
    const expanded = leading.replace(/\u00A0/g, " ");
    const tabCount = (expanded.match(/\t/g) || []).length;
    const spacesOnly = expanded.replace(/\t/g, "");
    const spaceCount = spacesOnly.length;
    const fromTabs = tabCount;
    const fromSpaces = Math.floor(spaceCount / 4);
    const leftover = spaceCount % 4;
    indentPrefix = "/t".repeat(fromTabs + fromSpaces) + (leftover ? " ".repeat(leftover) : "");
  }
  // ql-indent-N
  const clsIndent = Array.from(node.classList).find(c => /^ql-indent-\d+$/.test(c));
  if (clsIndent) {
    const n = Number.parseInt(clsIndent.replace(/\D/g, ""), 10);
    if (!Number.isNaN(n) && n > 0) {
      indentPrefix = "/t".repeat(n) + indentPrefix;
    }
  }
  // style based
  const styleAttr = (node.getAttribute("style") || "").toLowerCase();
  if (styleAttr && !/ql-indent-\d+/.test(node.className)) {
    const extractLen = (prop: string): number | null => {
      const re = new RegExp(`${prop}\\s*:\\s*([^;]+)`);
      const m = re.exec(styleAttr);
      if (!m)
        return null;
      const raw = m[1].trim().replace(/!important$/, "");
      const vm = /^(\d+(?:\.\d+)?)(px|em|rem)?$/.exec(raw);
      if (!vm)
        return null;
      const num = Number.parseFloat(vm[1]);
      if (Number.isNaN(num) || num <= 0)
        return null;
      const unit = vm[2] || "px";
      let px = num;
      if (unit === "em" || unit === "rem")
        px = num * 16;
      return px;
    };
    const pxIndent = extractLen("text-indent") ?? extractLen("padding-left") ?? extractLen("margin-left");
    if (pxIndent != null) {
      const units = Math.floor(pxIndent / 32); // 32px ~ 2em
      if (units > 0) {
        indentPrefix = "/t".repeat(units) + indentPrefix;
      }
    }
  }
  return { textBody: body, indentPrefix };
}

function handleParagraphLike(node: HTMLElement, env: ParseEnv) {
  // 若包含 code 结构，递归其子节点，不单独成段
  if (node.querySelector("div.ql-code-block, pre, code")) {
    Array.from(node.childNodes).forEach(ch => walkNode(ch, env));
    flushListContextIfNeeded(env, node.tagName.toLowerCase());
    return;
  }
  // 若是仅包裹 hr
  const childrenEls = Array.from(node.children) as HTMLElement[];
  if (childrenEls.length === 1 && childrenEls[0].tagName.toLowerCase() === "hr") {
    env.lines.push("---");
    flushListContextIfNeeded(env, node.tagName.toLowerCase());
    return;
  }
  // 对齐
  let align = "";
  if (node.classList.contains("ql-align-center")) {
    align = "center";
  }
  else if (node.classList.contains("ql-align-right")) {
    align = "right";
  }
  else if (node.classList.contains("ql-align-justify")) {
    align = "justify";
  }

  const inlineRaw = convertInlineHtmlToMd(node);
  let { textBody, indentPrefix } = extractIndentTokens(node, inlineRaw);
  textBody = textBody.replace(/\u00A0/g, " ").replace(/\r\n?/g, "\n").replace(/\n+/g, " ").replace(/^ +/, "");
  let text = indentPrefix + textBody;
  if (text) {
    if (align === "center") {
      text += "/center";
    }
    else if (align === "right") {
      text += "/right";
    }
    else if (align === "justify") {
      text += "/between";
    }
    env.lines.push(text);
  }
  else {
    // 真空段
    const inner = node.innerHTML.replace(/\s+/g, "");
    if (inner === "" || inner === "<br>" || /<br\/?>(?:<br\/?>)*/i.test(inner)) {
      env.lines.push("");
    }
  }
  flushListContextIfNeeded(env, node.tagName.toLowerCase());
}

function handleAnchorOrImg(node: HTMLElement, env: ParseEnv) {
  const tag = node.tagName.toLowerCase();
  if (tag === "a" && node.getAttribute("href")) {
    const outer = node.outerHTML;
    if (outer) {
      env.lines.push(stripLinkRelTarget(outer).trim());
    }
    return true;
  }
  if (tag === "img" && node.getAttribute("src")) {
    const outer = node.outerHTML;
    if (outer) {
      env.lines.push(outer.trim());
    }
    return true;
  }
  return false;
}

function walkNode(node: Node, env: ParseEnv) {
  if (node.nodeType === 3) {
    // 文本节点（不在 code 结构内部）
    let p: Node | null = node.parentNode;
    while (p) {
      if (p instanceof HTMLElement) {
        const tag = p.tagName.toLowerCase();
        if (tag === "pre" || tag === "code" || p.classList.contains("ql-code-block")) {
          return; // 由父级统一处理
        }
      }
      p = p.parentNode;
    }
    const txt = normalizeInlineText(node.textContent || "").trim();
    if (txt) {
      env.lines.push(txt);
    }
    return;
  }
  if (!(node instanceof HTMLElement)) {
    return;
  }
  const tag = node.tagName.toLowerCase();
  if (tag === "script" || tag === "style") {
    return;
  }
  if (node.classList.contains("ql-code-block")) {
    handleCodeBlockDiv(node, env);
    return;
  }
  if (tag === "pre") {
    handlePre(node, env);
    return;
  }
  if (tag === "h1" || tag === "h2" || tag === "h3") {
    handleHeading(node, env);
    flushListContextIfNeeded(env, tag);
    return;
  }
  if (tag === "hr") {
    env.lines.push("---");
    flushListContextIfNeeded(env, tag);
    return;
  }
  if (tag === "ul" || tag === "ol") {
    const logical: "ol" | "ul" = (tag === "ol" && node.classList.contains("ql-bullet")) ? "ul" : tag as ("ol" | "ul");
    listCtxPush(env, logical);
    Array.from(node.children).forEach(ch => walkNode(ch, env));
    listCtxPop(env);
    if (env.lines.length && env.lines[env.lines.length - 1].trim() !== "") {
      env.lines.push("");
    }
    return;
  }
  if (tag === "li") {
    handleLi(node, env);
    return;
  }
  if (tag === "p" || tag === "div" || tag === "section" || tag === "article") {
    handleParagraphLike(node, env);
    return;
  }
  if (handleAnchorOrImg(node, env)) {
    return;
  }
  // 其它容器继续下钻
  Array.from(node.childNodes).forEach(ch => walkNode(ch, env));
  flushListContextIfNeeded(env, tag);
}

function dedupeCodeLines(lines: string[]) {
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    if (!cur) {
      continue;
    }
    const m = /^```([^`\n]+)```$/.exec(cur.trim());
    if (!m) {
      continue;
    }
    const inner = m[1].trim();
    if (!inner) {
      continue;
    }
    if (i > 0 && lines[i - 1] && lines[i - 1].trim() === inner) {
      lines[i - 1] = "";
    }
    if (i + 1 < lines.length && lines[i + 1] && lines[i + 1].trim() === inner) {
      lines[i + 1] = "";
    }
  }
}

function encodeBlankLines(lines: string[], originalHtml: string): string {
  const normalized = lines.map(l => (l === "__BLANK_LINE__" || l === LEGACY_SENTRY_BLANK_LINE ? "" : l));
  const encoded = normalized.map(l => (l.trim() === "" ? "\\n" : l));
  const result = encoded.join("\n");
  if (!/```/.test(result) && /ql-code-block|<pre[\s>]/i.test(originalHtml)) {
    try {
      const root = createRoot(originalHtml);
      if (root) {
        const collected: string[] = [];
        root.querySelectorAll("div.ql-code-block, pre").forEach((b) => {
          const ct = (b.textContent || "").replace(/\u00A0/g, " ").replace(/\r\n?/g, "\n");
          if (ct.trim().length === 0) {
            collected.push("``````");
          }
          else if (!/\n/.test(ct)) {
            collected.push(`\`\`\`${ct.replace(/```/g, "\`\`\`")}\`\`\``);
          }
          else {
            collected.push(["```", ct.replace(/```/g, "\`\`\`"), "```"].join("\n"));
          }
        });
        if (collected.length) {
          let base = result;
          let replaced: number | null = null;
          const parts = base.split(/\n\n/);
          const last = parts[parts.length - 1];
          collected.forEach((c, idx) => {
            if (replaced != null)
              return;
            if (/^```[^\n]*```$/.test(c)) {
              const inner = c.replace(/^```|```$/g, "");
              if (last === inner) {
                parts[parts.length - 1] = c;
                base = parts.join("\n\n");
                replaced = idx;
              }
            }
          });
          const appendList = replaced == null ? collected : collected.filter((_c, i) => i !== replaced);
          return appendList.length ? (base ? `${base}\n\n${appendList.join("\n\n")}` : appendList.join("\n\n")) : base;
        }
      }
    }
    catch { /* ignore */ }
  }
  return result;
}

// ---------- 主入口 ----------
export function htmlToMarkdown(html: string): string {
  if (!html)
    return "";
  try {
    const root = createRoot(html);
    if (!root)
      return html; // 无 DOM 环境，直接回退
    ensureBulletOlToUl(root);
    restoreMentions(root);
    const env: ParseEnv = { lines: [], listStack: [], rootHtml: html };
    Array.from(root.childNodes).forEach(ch => walkNode(ch, env));
    dedupeCodeLines(env.lines);
    return encodeBlankLines(env.lines, html);
  }
  catch {
    return html; // 容错回退
  }
}

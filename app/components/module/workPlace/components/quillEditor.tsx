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

// 简易 HTML 转义
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 将我们支持的行内 Markdown 变为 HTML 标签（在内容已做 HTML 转义的前提下）
function applyInlineMarkdownToHtml(escapedText: string): string {
  let text = escapedText;
  // 顺序很重要：先处理长标记，避免与短标记冲突
  // 粗体 **text**
  text = text.replace(/\*\*([^\s*][^*]*)\*\*/g, "<strong>$1</strong>");
  // 下划线 __text__（自定义）
  text = text.replace(/__([^\s_][^_]*)__ /g, "<u>$1</u> "); // 带空格的边界情况
  text = text.replace(/__([^\s_][^_]*)__\b/g, "<u>$1</u>");
  // 删除线 ~~text~~
  text = text.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  // 斜体 *text* 与 _text_（与上面长标记做了顺序避免）
  text = text.replace(/\*([^\s*][^*]*)\*/g, "<em>$1</em>");
  text = text.replace(/_([^\s_][^_]*)_/g, "<em>$1</em>");
  return text;
}

// 将 HTML 转为 Markdown（覆盖与 markdownToHtml 对应的子集）
function htmlToMarkdown(html: string): string {
  try {
    const container = document.createElement("div");
    container.innerHTML = html;

    // 辅助：常规节点序列化（不含代码块特殊处理）
    const serializeInlineOrBlock = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || "";
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const mapChildren = (joiner = "") => Array.from(el.childNodes).map(serializeInlineOrBlock).join(joiner);

      // 优先处理 <pre> 形式的代码块（可能来自带语法模块的 Quill 或外部粘贴）
      if (tag === "pre") {
        const codeEl = el.querySelector("code");
        const raw = ((codeEl ? codeEl.textContent : el.textContent) || "").replace(/\r\n/g, "\n");
        const trimmed = raw.trim();
        // 若内容本身已是 ```...```，则不再二次包裹
        if (/^```[\s\S]*```$/.test(trimmed)) {
          return trimmed;
        }
        // 导出为三反引号成对包裹（无语言）
        const fence = "```";
        return `${fence}${raw}${fence}`;
      }

      // 处理被容器包裹的代码块：<div> 下的直接子元素若全部是 .ql-code-block，则合并为一个代码块
      if (tag === "div") {
        const childEls = Array.from(el.children) as HTMLElement[];
        if (
          childEls.length > 0
          && childEls.every(c => c.classList && c.classList.contains("ql-code-block"))
        ) {
          const lines = childEls.map(c => (c.textContent || "").replace(/\r\n/g, "\n"));
          const content = lines.join("\n");
          const trimmed = content.trim();
          // 若内容本身已是 ```...```，则直接返回
          if (/^```[\s\S]*```$/.test(trimmed)) {
            return trimmed;
          }
          // 无语言导出
          const fence = "```";
          return `${fence}${content}${fence}`;
        }
      }

      switch (tag) {
        case "strong":
          return `**${mapChildren()}**`;
        case "em":
          return `*${mapChildren()}*`;
        case "u":
          return `__${mapChildren()}__`;
        case "s":
        case "del":
          return `~~${mapChildren()}~~`;
        case "br":
          return "\n";
        case "h1":
          return `# ${mapChildren()}\n\n`;
        case "h2":
          return `## ${mapChildren()}\n\n`;
        case "h3":
          return `### ${mapChildren()}\n\n`;
        case "p":
        case "div": {
          // 常规段落/容器
          let inner = mapChildren("");
          inner = inner.replace(/\n+/g, "\n");
          return inner.trim().length ? `${inner}\n\n` : "\n";
        }
        case "ul": {
          const items = Array.from(el.children)
            .filter(c => c.tagName && c.tagName.toLowerCase() === "li")
            .map(li => `- ${serializeInlineOrBlock(li)}\n`)
            .join("");
          return `${items}\n`;
        }
        case "ol": {
          const lis = Array.from(el.children).filter(c => c.tagName && c.tagName.toLowerCase() === "li");
          const items = lis.map((li, i) => `${i + 1}. ${serializeInlineOrBlock(li)}\n`).join("");
          return `${items}\n`;
        }
        case "li": {
          const inner = Array.from(el.childNodes).map(serializeInlineOrBlock).join("");
          return inner.replace(/\n+/g, " ").trim();
        }
        default:
          return mapChildren("");
      }
    };

    // 特殊：Quill（未启用 syntax 模块）会将代码块渲染为多行 <div class="ql-code-block">，需要成组合并为单个围栏代码块
    const isCodeBlockLine = (n: Node): n is HTMLElement => {
      return n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).classList?.contains("ql-code-block");
    };

    const nodes = Array.from(container.childNodes);
    const parts: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (isCodeBlockLine(n)) {
        const lines: string[] = [];
        // 收集连续的 code-block 行
        while (i < nodes.length && isCodeBlockLine(nodes[i])) {
          const el = nodes[i] as HTMLElement;
          const lineText = el.textContent ?? "";
          lines.push(lineText.replace(/\r\n/g, "\n"));
          i++;
        }
        // 回退一位，因为 for 循环还会 i++
        i -= 1;
        const content = lines.join("\n");
        const trimmed = content.trim();
        if (/^```[\s\S]*```$/.test(trimmed)) {
          parts.push(trimmed);
        }
        else {
          // 三反引号成对包裹（无语言）
          const fence = "```";
          parts.push(`${fence}${content}${fence}`);
        }
        continue;
      }

      // 非代码块行，按常规序列化
      parts.push(serializeInlineOrBlock(n));
    }

    let md = parts.join("");
    // 规范化空行：最多保留两个换行
    md = md.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trimEnd();
    return md;
  }
  catch {
    return "";
  }
}

// 将 Markdown 文本转换为 HTML（覆盖标题/列表/代码块/行内样式）。
function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let inCode = false;
  let codeLang: string | undefined;
  let codeBuf: string[] = [];

  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushCode = () => {
    if (!inCode) {
      return;
    }
    const codeHtml = escapeHtml(codeBuf.join("\n"));
    const cls = codeLang ? ` class="language-${codeLang}"` : "";
    out.push(`<pre><code${cls}>${codeHtml}</code></pre>`);
    inCode = false;
    codeLang = undefined;
    codeBuf = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      return;
    }
    const tag = listType;
    const itemsHtml = listItems.map(it => `<li>${it}</li>`).join("");
    out.push(`<${tag}>${itemsHtml}</${tag}>`);
    listType = null;
    listItems = [];
  };

  const pushParagraph = (raw: string) => {
    const html = applyInlineMarkdownToHtml(escapeHtml(raw));
    out.push(`<p>${html}</p>`);
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // 代码围栏开始/结束（允许前导空白）
    // 支持标准三反引号 ``` 围栏；兼容旧的六反引号逻辑（若出现则同样处理）
    const sixFence = /^[ \t]*``````\s*$/.exec(rawLine);
    const triFence = !sixFence && /^[ \t]*```\s*$/.exec(rawLine);
    const fenceMatch = sixFence || triFence;
    if (fenceMatch) {
      if (!inCode) {
        // 开始代码块
        flushList();
        inCode = true;
        codeLang = undefined;
        continue;
      }
      else {
        // 结束代码块
        flushCode();
        continue;
      }
    }

    // 单行内联围栏形式：```some code``` → 解析为代码块（无语言）
    const inlineFence = /```([^`]+)```/.exec(rawLine);
    if (inlineFence) {
      flushList();
      const raw = inlineFence[1];
      inCode = true;
      codeLang = undefined;
      codeBuf.push(raw);
      flushCode();
      continue;
    }

    if (inCode) {
      codeBuf.push(rawLine);
      continue;
    }

    // 空行：结束任何段落/列表
    if (/^\s*$/.test(rawLine)) {
      flushList();
      // 空行不强制输出 <p>，作为分隔即可
      continue;
    }

    // 标题（允许前导空白）
    if (/^[ \t]*###\s+/.test(rawLine)) {
      flushList();
      const content = rawLine.replace(/^[ \t]*###\s+/, "");
      out.push(`<h3>${applyInlineMarkdownToHtml(escapeHtml(content))}</h3>`);
      continue;
    }
    if (/^[ \t]*##\s+/.test(rawLine)) {
      flushList();
      const content = rawLine.replace(/^[ \t]*##\s+/, "");
      out.push(`<h2>${applyInlineMarkdownToHtml(escapeHtml(content))}</h2>`);
      continue;
    }
    if (/^[ \t]*#\s+/.test(rawLine)) {
      flushList();
      const content = rawLine.replace(/^[ \t]*#\s+/, "");
      out.push(`<h1>${applyInlineMarkdownToHtml(escapeHtml(content))}</h1>`);
      continue;
    }

    // 列表（无序/有序）
    const ulPrefix = rawLine.match(/^[ \t]*[-*][ \t]+/);
    const olPrefix = rawLine.match(/^[ \t]*\d+\.[ \t]+/);
    if (ulPrefix) {
      const itemSrc = rawLine.slice(ulPrefix[0].length);
      const item = applyInlineMarkdownToHtml(escapeHtml(itemSrc));
      if (listType === "ol") {
        flushList();
      }
      listType = "ul";
      listItems.push(item);
      continue;
    }
    if (olPrefix) {
      const itemSrc = rawLine.slice(olPrefix[0].length);
      const item = applyInlineMarkdownToHtml(escapeHtml(itemSrc));
      if (listType === "ul") {
        flushList();
      }
      listType = "ol";
      listItems.push(item);
      continue;
    }

    // 普通段落
    flushList();
    pushParagraph(rawLine);
  }

  // 收尾
  flushCode();
  flushList();
  return out.join("\n");
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

// 在按下空格时检测并转换 Markdown 语法（标题/列表/代码块）
function detectMarkdown(
  quillInstance: any,
  range: any,
  opts?: { setCodeLang?: (lang?: string) => void },
): boolean {
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
  const formats = quillInstance.getFormat?.(lineStart, 1) ?? {};

  // 代码块围栏：``` 或 ```lang + 空格 -> 切换 code-block（可指定语言）
  const codeFenceMatch = /^```([\w#+-]+)?$/.exec(prefix);
  if (codeFenceMatch) {
    const lang = codeFenceMatch[1];
    const markerLen = prefix.length;
    quillInstance.deleteText(lineStart, markerLen, "user");
    const toEnable = !("code-block" in formats);
    quillInstance.formatLine(lineStart, 1, "code-block", toEnable, "user");
    // 若开启代码块：在其后额外插入一个“普通段落”，方便用户用↓或回车离开代码块
    // 注意：使用 API 源插入，避免触发 onTextChange 中“回车继承 code-block”的逻辑
    let caretIndex = lineStart;
    try {
      if (toEnable) {
        const curLineInfo = quillInstance.getLine?.(lineStart);
        const curLine = curLineInfo && Array.isArray(curLineInfo) ? curLineInfo[0] : null;
        const curLen = curLine && typeof curLine.length === "function" ? curLine.length() : 0; // 含行尾换行
        const afterLine = lineStart + Math.max(0, curLen);
        // 在代码块行之后插入一个换行
        quillInstance.insertText?.(afterLine, "\n", "api");
        // 将新行显式清除 code-block，使之成为普通段落
        // 注意：新插入的空行的换行符本身承载了该行的块级格式，其索引即为 afterLine
        quillInstance.formatLine?.(afterLine, 1, "code-block", false, "api");
        // 将光标移到新增的普通段落行，便于用户直观看到该行
        caretIndex = lineStart;
      }
    }
    catch {
      // ignore
    }
    quillInstance.setSelection(caretIndex, 0, "silent");
    opts?.setCodeLang?.(toEnable ? lang : undefined);
    return true;
  }
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
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  // 始终保持最新的回调，但不触发实例的重建
  useEffect(() => {
    onChangeRef.current = onchange;
  }, [onchange]);

  useEffect(() => {
    const container = containerRef.current; // 在 useEffect 内部保存 containerRef 的当前值
    let rootEl: HTMLElement | null = null;
    let onRootKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let onRootPaste: ((e: ClipboardEvent) => void) | null = null;
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
          toolbar: true,
          // 统一以 delta 处理，Clipboard 配置最小化；自定义粘贴在 root paste 事件中完成
          clipboard: {
            matchVisual: false,
          },
        },
        placeholder: initialPlaceholderRef.current || "",
      });
      const editor = vdRef.current!;
      // 聚焦编辑器，确保键盘事件由编辑器接收
      editor.focus?.();

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
          }
        }
        catch {
          // ignore
        }
      };
      editor.on?.("text-change", onTextChange);
      textChangeHandlerRef.current = onTextChange;

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
          }
        }
      };
      rootEl?.addEventListener("keydown", onRootKeyDown, true);

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
    };
  }, []);

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

  return (
    <div
      id={id}
      ref={containerRef}
      className="ql-wrapper bg-white border border-gray-300 rounded-md shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 min-h-[200px]"
    />
  );
}

// 在按下空格时检测并转换 Markdown 语法（标题/列表/代码块）
export function detectMarkdown(
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
export function detectInlineFormats(
  quillInstance: any,
  selRange: any,
): boolean {
  if (!quillInstance || !selRange || typeof selRange.index !== "number") {
    return false; // Early exit if quillInstance or selRange is invalid
  }
  // 不在代码块中做内联转换
  const curFormats = quillInstance.getFormat?.(Math.max(0, selRange.index - 1), 1) ?? {};
  if ("code-block" in curFormats) {
    return false; // Prevent inline formatting in code blocks
  }
  const lineInfo = quillInstance.getLine?.(selRange.index);
  if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
    return false; // Ensure line information is valid
  }
  const [line, offset] = lineInfo as [any, number];
  const lineStart = selRange.index - offset;
  const lineLength = typeof line?.length === "function" ? line.length() : 0;
  const rawLineText = (quillInstance.getText?.(lineStart, Math.max(0, lineLength)) ?? "").replace(/\n$/, "");
  // selRange.index 在空格之后，offset 包含该空格，leftOffset 不包含当前这个空格
  const leftOffset = Math.max(0, offset - 1);
  const leftText = rawLineText.slice(0, leftOffset);
  const rightAfterSpaceText = rawLineText.slice(leftOffset + 1); // 跳过空格后的文本

  // 先处理“闭合标记在光标右侧”的场景：**text␠** / __text␠__ / ~~text␠~~ / *text␠* （允许 text 前后出现 0~1 个空格，将被修剪）
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
      let innerLen = Math.max(0, leftOffset - innerStart);
      if (innerLen <= 0) {
        continue;
      }
      let innerRaw = leftText.slice(innerStart, innerStart + innerLen);
      // 允许首尾各 1 个空格（用户在 * 文本*␠ 或 ** 文本**␠ 的情况）
      innerRaw = innerRaw.replace(/^ (.+)$/s, "$1").replace(/^(.+) $/s, "$1");
      if (!innerRaw || /^\s+$/.test(innerRaw)) {
        continue;
      }
      // 删除前的冲突校验：对于斜体的单字符标记，确保开标记前一个字符不是同一标记（避免 ** / __ 冲突）
      const openStart = lineStart + openPos;
      if (c.token.length === 1 && openStart > 0) {
        const prevCh = quillInstance.getText?.(openStart - 1, 1) ?? "";
        if (prevCh === c.token) {
          continue; // 前面同一标记，推测是 ** / __ 中的一部分
        }
      }
      try {
        // 先删除右侧闭合标记（位于空格之后）
        const closeStart = lineStart + leftOffset + 1; // 空格之后开始是闭合标记
        quillInstance.deleteText(closeStart, c.token.length, "user");
        // 再删除左侧开标记
        quillInstance.deleteText(openStart, c.token.length, "user");
        // 对“内文”应用格式：此时内文区间起点位于 openStart，长度 = innerLen
        // 如果修剪了首尾空格，需要先删除内文中多余的前导/尾随空格再格式化
        const segment = leftText.slice(innerStart, innerStart + innerLen);
        const leadingSpace = segment.startsWith(" ");
        const trailingSpace = segment.endsWith(" ");
        if (trailingSpace) {
          quillInstance.deleteText(openStart + c.token.length + innerLen - 1, 1, "user");
          innerLen -= 1;
        }
        if (leadingSpace) {
          quillInstance.deleteText(openStart + c.token.length, 1, "user");
          innerLen -= 1;
        }
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
      // 允许内部出现普通字符与空格；后续我们自行修剪首尾至多一个空格
      { re: /\*\*([^*]+)\*\*$/, attr: "bold", open: 2, close: 2, token: "**" },
      { re: /__([^_]+)__$/, attr: "underline", open: 2, close: 2, token: "__" },
      { re: /~~([^~]+)~~$/, attr: "strike", open: 2, close: 2, token: "~~" },
      { re: /\*([^*]+)\*$/, attr: "italic", open: 1, close: 1, token: "*" },
      { re: /_([^_]+)_$/, attr: "italic", open: 1, close: 1, token: "_" },
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
    if ((pat.token === "*" || pat.token === "_") && startIndex > 0) {
      const prevCh = quillInstance.getText?.(startIndex - 1, 1) ?? "";
      if (prevCh === pat.token) {
        continue; // 避免与 **/__ 冲突，但允许行首单标记
      }
    }
    // 先从右往左删除关闭标记，再删除打开标记，避免索引位移干扰
    try {
      const closePos = startIndex + matchLen - pat.close;
      quillInstance.deleteText(closePos, pat.close, "user");
      quillInstance.deleteText(startIndex, pat.open, "user");
      // 现在内文从 startIndex 开始，长度为 innerLen
      // 修剪首尾至多一个空格（允许 ** 文本**␠ / **文本 **␠）
      let leading = false;
      let trailing = false;
      if (inner.startsWith(" ")) {
        leading = true;
      }
      if (inner.endsWith(" ")) {
        trailing = true;
      }
      if (leading) {
        quillInstance.deleteText(startIndex, 1, "user");
      }
      if (trailing) {
        quillInstance.deleteText(startIndex + innerLen - (leading ? 2 : 1), 1, "user");
      }
      const finalInnerLen = innerLen - (leading ? 1 : 0) - (trailing ? 1 : 0);
      if (finalInnerLen > 0) {
        quillInstance.formatText(startIndex, finalInnerLen, pat.attr, true, "user");
        quillInstance.setSelection(startIndex + finalInnerLen, 0, "silent");
        return true;
      }
    }
    catch {
      // ignore并尝试下一个模式
    }
  }
  return false;
}

// 检测 Slash 对齐命令：/center /right /left /justify （在输入空格后触发）
// 规则：行首允许若干空格，紧跟 /keyword，最后一个空格触发检测（即当前 range.index 位于命令后面的空格处）
export function detectAlignment(quillInstance: any, range: any): boolean {
  if (!quillInstance || !range) {
    return false;
  }
  const lineInfo = quillInstance.getLine?.(range.index);
  if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
    return false;
  }
  const [_line, offset] = lineInfo as [any, number];
  const lineStart = range.index - offset;
  // 取得从行首到当前光标（含刚输入的空格）的文本
  const raw = quillInstance.getText?.(lineStart, offset) ?? ""; // 可能以空格结尾
  const trimmedEnd = raw.replace(/\n$/, "").trimEnd();

  // Slash 命令匹配
  const m = /^\s*\/(center|right|left|justify)$/.exec(trimmedEnd);
  if (!m) {
    return false;
  }
  const keyword = m[1];
  const alignValue: false | "center" | "right" | "justify" = keyword === "left"
    ? false
    : keyword === "justify"
      ? "justify"
      : (keyword as "center" | "right");

  try {
    // 删除整行命令文本（到当前 offset，包含命令与末尾空格）
    quillInstance.deleteText(lineStart, raw.length, "user");
    if (alignValue) {
      quillInstance.formatLine(lineStart, 1, "align", alignValue, "user");
    }
    else {
      // left -> 取消对齐（传 false）
      quillInstance.formatLine(lineStart, 1, "align", false, "user");
    }
    quillInstance.setSelection(lineStart, 0, "silent");
    return true;
  }
  catch {
    return false;
  }
}
// Backspace 时：若当前行为空并且为 header 或列表项，则移除其块级格式，退化为普通段落
export function removeBlockFormatIfEmpty(quillInstance: any, range: any): boolean {
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

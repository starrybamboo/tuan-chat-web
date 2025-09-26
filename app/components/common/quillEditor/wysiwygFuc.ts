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

// 检测行尾的对齐语法：c/r/b + 空格
export function detectAlignment(quillInstance: any, range: any): boolean {
  if (!quillInstance || !range)
    return false;

  const lineInfo = quillInstance.getLine?.(range.index);
  if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2)
    return false;

  const [_line, offset] = lineInfo as [any, number];
  const lineStart = range.index - offset;
  // 获取整行文本（不含末尾换行符）
  const lineText = (quillInstance.getText?.(lineStart, offset) ?? "").trimEnd();

  // 匹配行尾的 c/r/b
  const alignMatch = /^(.*)([crb])$/.exec(lineText);
  if (!alignMatch)
    return false;

  const content = alignMatch[1].trimEnd(); // 移除后缀前的所有尾随空格
  const suffix = alignMatch[2];

  const mapping: Record<string, "center" | "right" | "justify"> = {
    c: "center",
    r: "right",
    b: "justify",
  };
  const align = mapping[suffix];
  if (!align)
    return false;

  try {
    // 必须先格式化，再删除文本，否则 quill 会将格式应用到错误的行
    quillInstance.formatLine(lineStart, 1, "align", align, "user");
    // 计算需要删除的长度：后缀(1) + content 与 lineText 之间的空格
    const deleteLen = lineText.length - content.length;
    const deleteStart = lineStart + content.length;
    quillInstance.deleteText(deleteStart, deleteLen, "user");
    // 光标定位到内容末尾
    quillInstance.setSelection(lineStart + content.length, 0, "silent");
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

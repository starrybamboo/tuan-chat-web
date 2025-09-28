export function htmlToMarkdown(html: string): string {
  if (!html)
    return "";
  try {
    const el = typeof document !== "undefined" ? document.createElement("div") : null;
    if (!el)
      return html;
    el.innerHTML = html;
    // 预处理：将 <ol class="ql-bullet"> 强制转成 <ul>，避免后续误判为有序列表
    try {
      const bulletOls = el.querySelectorAll("ol.ql-bullet");
      bulletOls.forEach((ol) => {
        const ul = el.ownerDocument!.createElement("ul");
        Array.from(ol.childNodes).forEach(n => ul.appendChild(n));
        ol.parentNode?.replaceChild(ul, ol);
      });
    }
    catch { /* ignore */ }
    // 将 mention span 恢复为 @类别名称 语法
    try {
      const nodes = el.querySelectorAll("span.ql-mention-span[data-label][data-category]");
      nodes.forEach((node: any) => {
        const label = node.getAttribute("data-label") || node.textContent || "";
        const category = node.getAttribute("data-category") || "";
        if (category && label) {
          // 用一个临时文本节点替换 span
          const textNode = el.ownerDocument!.createTextNode(`@${category}${label}`);
          node.parentNode?.replaceChild(textNode, node);
        }
      });
    }
    catch {
      // ignore mention parse errors
    }
    // 递归遍历，支持被外层 <div class="ql-editor"> 包裹的情况
    // 支持: h1/h2/h3, p/div 段落, ul/ol + li, 以及空行
    const lines: string[] = [];
    const normalize = (text: string) => text
      .replace(/\u00A0/g, " ")
      .replace(/\r\n?/g, "\n")
      .replace(/\s+/g, m => m.length > 1 ? " " : m);

    // 使用更明确的栈结构区分有序 / 无序列表，避免把无序列表错误编号
    type ListContext = { type: "ol" | "ul"; counter: number };
    let listStack: ListContext[] = [];

    const flushListContextIfNeeded = (nodeTag: string) => {
      if (!(nodeTag === "ul" || nodeTag === "ol" || nodeTag === "li"))
        listStack = [];
    };

    const toInlineMd = (el: HTMLElement): string => {
      let txt = el.innerHTML || "";
      txt = txt
        .replace(/<strong>([\s\S]*?)<\/strong>/g, "**$1**")
        .replace(/<b>([\s\S]*?)<\/b>/g, "**$1**")
        .replace(/<em>([\s\S]*?)<\/em>/g, "*$1*")
        .replace(/<i>([\s\S]*?)<\/i>/g, "*$1*")
        .replace(/<u>([\s\S]*?)<\/u>/g, "++$1++")
        .replace(/<(?:s|strike|del)>([\s\S]*?)<\/(?:s|strike|del)>/g, "~~$1~~")
        .replace(/<code>([\s\S]*?)<\/code>/g, "`$1`");
      txt = txt.replace(/<[^>]+>/g, "");
      return txt;
    };

    const walk = (node: Node) => {
      if (node.nodeType === 3) { // 文本节点
        // 若文本节点位于代码块 / pre / code 内部，则跳过，让其由上层专用逻辑(ql-code-block / pre 分支)统一处理，避免重复：
        // 产生的典型重复模式为：纯文本代码行 + ```代码 fenced``` 各输出一次。
        // 这里向上查找父级，命中即不单独推入 lines。
        let p: Node | null = node.parentNode;
        let inCodeStructure = false;
        while (p) {
          if (p instanceof HTMLElement) {
            const tag = p.tagName.toLowerCase();
            if (tag === "pre" || tag === "code" || p.classList.contains("ql-code-block")) {
              inCodeStructure = true;
              break;
            }
          }
          p = p.parentNode;
        }
        if (!inCodeStructure) {
          const txt = normalize(node.textContent || "").trim();
          if (txt)
            lines.push(txt);
        }
        return;
      }
      if (!(node instanceof HTMLElement))
        return;
      const tag = node.tagName.toLowerCase();
      if (tag === "script" || tag === "style")
        return;

      // Quill 在未开启 syntax 高亮时，代码块会以多行 <div class="ql-code-block"> 形式出现
      // 我们只在连续块的第一行输出一个占位符 ```代码```，其余行跳过，避免重复
      if (node.classList.contains("ql-code-block")) {
        // 聚合连续 code-block 行，保持原始文本
        let prev = node.previousSibling;
        let hasPrevCode = false;
        while (prev) {
          if (prev.nodeType === 1 && (prev as HTMLElement).classList.contains("ql-code-block")) {
            hasPrevCode = true;
            break;
          }
          if (prev.nodeType === 3 && (prev.textContent || "").trim() === "") {
            prev = prev.previousSibling;
            continue;
          }
          break;
        }
        if (hasPrevCode)
          return; // 仅第一行处理
        // 收集后续连续行
        let cursor: Node | null = node;
        const codeLines: string[] = [];
        while (cursor) {
          if (cursor.nodeType === 1 && (cursor as HTMLElement).classList.contains("ql-code-block")) {
            codeLines.push((cursor as HTMLElement).textContent?.replace(/\u00A0/g, " ") || "");
            cursor = cursor.nextSibling;
            continue;
          }
          if (cursor.nodeType === 3 && (cursor.textContent || "").trim() === "") {
            cursor = cursor.nextSibling;
            continue;
          }
          break;
        }
        const joined = codeLines.join("\n");
        if (joined.trim().length === 0) {
          lines.push("``````");
        }
        else {
          const sanitized = joined.replace(/```/g, "\`\`\`");
          if (!/\n/.test(sanitized)) {
            // 单行 -> ```code```
            lines.push(`\`\`\`${sanitized}\`\`\``);
          }
          else {
            lines.push(`\n\`\`\`\n${sanitized}\n\`\`\``.trim());
          }
        }
        return;
      }

      if (tag === "pre") {
        // 优先查 <code>
        let codeText = "";
        const codeEl = node.querySelector("code");
        if (codeEl)
          codeText = codeEl.textContent || "";
        else
          codeText = node.textContent || "";
        codeText = codeText.replace(/\u00A0/g, " ");
        if (codeText.trim().length === 0) {
          lines.push("``````");
        }
        else {
          const sanitized = codeText.replace(/```/g, "\`\`\`");
          if (!/\n/.test(sanitized)) {
            lines.push(`\`\`\`${sanitized}\`\`\``);
          }
          else {
            lines.push(`\n\`\`\`\n${sanitized}\n\`\`\``.trim());
          }
        }
        return;
      }

      if (tag === "h1" || tag === "h2" || tag === "h3") {
        const text = normalize(node.textContent || "").trim();
        if (text) {
          const prefix = tag === "h1" ? "# " : tag === "h2" ? "## " : "### ";
          lines.push(prefix + text);
        }
        flushListContextIfNeeded(tag);
        return; // 不再下钻其子（已经提取）
      }
      if (tag === "ul" || tag === "ol") {
        // Quill 可能会用 <ol class="ql-bullet"> 来表示无序列表，这里根据类名修正为逻辑上的 ul
        const logicalType: "ul" | "ol" = (tag === "ol" && node.classList.contains("ql-bullet")) ? "ul" : tag as ("ul" | "ol");
        listStack.push({ type: logicalType, counter: 0 });
        Array.from(node.children).forEach(child => walk(child));
        listStack.pop();
        if (lines.length && lines[lines.length - 1].trim() !== "")
          lines.push("");
        return;
      }
      if (tag === "li") {
        const ctx = listStack[listStack.length - 1];
        const text = normalize(node.textContent || "").trim();
        // 单独检查 li 自身的 data-list 或 class，Quill 可能给 <li data-list="bullet"> 放在 <ol>
        const forceBullet = node.getAttribute("data-list") === "bullet" || node.classList.contains("ql-bullet");
        if (ctx && ctx.type === "ol" && !forceBullet) {
          ctx.counter += 1;
          lines.push(`${ctx.counter}. ${text}`);
        }
        else {
          lines.push(`- ${text}`);
        }
        return;
      }
      if (tag === "p" || tag === "div" || tag === "section" || tag === "article") {
        // 检查：若内部包含代码块结构，则不作为普通段落处理，而是下钻其子节点
        // 避免将代码块外层的 p/div 容器的文本内容（包含代码）重复输出
        if (node.querySelector("div.ql-code-block, pre, code")) {
          Array.from(node.childNodes).forEach(child => walk(child));
          flushListContextIfNeeded(tag);
          return;
        }

        // 修正：检查 class 而不是 align 属性
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

        let text = normalize(toInlineMd(node)).trim();
        if (text) {
          if (align === "center") {
            text += "c";
          }
          else if (align === "right") {
            text += "r";
          }
          else if (align === "justify") {
            text += "b";
          }
          lines.push(text);
          flushListContextIfNeeded(tag);
        }
        return;
      }
      // 其它块，继续遍历其子节点（例如 span 包裹的残余结构）
      Array.from(node.childNodes).forEach(child => walk(child));
      flushListContextIfNeeded(tag);
    };

    // 从根层的子节点挨个遍历，避免把所有文本粘连
    Array.from(el.childNodes).forEach(child => walk(child));

    // 去重：若出现模式  [纯文本代码行] 紧挨着 [```同内容```]，移除纯文本版本，保留 fenced
    // 产生原因：某些时序下 Quill 先产生普通段落再立即变为 code-block，前一次扫描可能已把纯文本收集
    for (let i = 0; i < lines.length; i++) {
      const cur = lines[i];
      if (!cur)
        continue;
      const m = /^```([^`\n]+)```$/.exec(cur.trim());
      if (!m)
        continue;
      const inner = m[1].trim();
      if (!inner)
        continue; // 空代码块不做
      // 上一行 / 下一行 若与 inner 完全一致则清空（留给后续压缩阶段去掉）
      if (i > 0 && lines[i - 1] && lines[i - 1].trim() === inner)
        lines[i - 1] = "";
      if (i + 1 < lines.length && lines[i + 1] && lines[i + 1].trim() === inner)
        lines[i + 1] = "";
    }

    // 合并多余的空行（>2 连续空行压缩为 1 个）
    const compressed: string[] = [];
    let prevEmpty = false;
    for (const l of lines) {
      const empty = l.trim().length === 0;
      if (empty) {
        if (!prevEmpty)
          compressed.push("");
        prevEmpty = true;
      }
      else {
        compressed.push(l);
        prevEmpty = false;
      }
    }
    // 去掉首尾空行
    while (compressed.length && compressed[0].trim() === "")
      compressed.shift();
    while (compressed.length && compressed[compressed.length - 1].trim() === "")
      compressed.pop();

    const result = compressed.join("\n\n");
    // Fallback: 若原始 HTML 中存在 code-block 相关结构，但 result 中没有生成任何 ```，说明上面的结构识别失败（例如 DOM 结构差异）
    if (!/```/.test(result) && /ql-code-block|<pre[\s>]/i.test(html)) {
      try {
        const fallbackRoot = el.ownerDocument!.createElement("div");
        fallbackRoot.innerHTML = html;
        const collected: string[] = [];
        const blocks = fallbackRoot.querySelectorAll("div.ql-code-block, pre");
        blocks.forEach((b) => {
          let codeText = b.textContent || "";
          codeText = codeText.replace(/\u00A0/g, " ").replace(/\r\n?/g, "\n");
          if (codeText.trim().length === 0) {
            collected.push("``````");
          }
          // 单行
          else if (!/\n/.test(codeText)) {
            const sanitized = codeText.replace(/```/g, "\`\`\`");
            collected.push(`\`\`\`${sanitized}\`\`\``);
          }
          else {
            const sanitized = codeText.replace(/```/g, "\`\`\`");
            collected.push(["```", sanitized, "```"].join("\n"));
          }
        });
        if (collected.length) {
          // 去重策略：若原 result 最后一段是某个代码内容的纯文本，替换为 fenced，并避免再次追加该 fenced
          let base = result;
          let replacedIndex: number | null = null;
          if (base) {
            const parts = base.split(/\n\n/);
            if (parts.length) {
              const last = parts[parts.length - 1];
              collected.forEach((c, idx) => {
                if (replacedIndex != null)
                  return;
                if (/^```[^\n]*```$/.test(c)) { // 单行 fenced
                  const inner = c.replace(/^```|```$/g, "");
                  if (last === inner) {
                    parts[parts.length - 1] = c; // 替换
                    base = parts.join("\n\n");
                    replacedIndex = idx; // 记录：后面不再追加
                  }
                }
              });
            }
          }
          const appendList = replacedIndex == null
            ? collected
            : collected.filter((_c, idx) => idx !== replacedIndex);
          return appendList.length ? (base ? `${base}\n\n${appendList.join("\n\n")}` : appendList.join("\n\n")) : base;
        }
      }
      catch {
        // ignore fallback errors
      }
    }
    return result;
  }
  catch {
    return html;
  }
}

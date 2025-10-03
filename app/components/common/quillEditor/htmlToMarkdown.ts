// 空行策略回退：不再在 Markdown 文本中写入私有区字符；仅把空行编码为字面 \\n。
// 兼容：若旧内容中已经存在 U+E000（私有区哨兵）或 __BLANK_LINE__ ，在序列化时同样视为逻辑空行。
const LEGACY_SENTRY_BLANK_LINE = "\uE000"; // 仅用作识别，不再新写入

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

    // 移除 anchor 中的 rel / target 属性（保存时不需要）
    const stripRelTarget = (outer: string): string => {
      // 简单字符串级处理，避免在序列化阶段创建过多临时 DOM；保持其它属性顺序
      let cleaned = outer
        .replace(/\s+(?:rel|target)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s+(?:rel|target)(?=\s|>)/gi, ""); // 处理无值属性
      // 压缩多余空格（不影响 href 等值内部）
      cleaned = cleaned.replace(/<a\s+/i, m => m.replace(/\s{2,}/g, " "));
      cleaned = cleaned.replace(/\s+>/g, ">");
      return cleaned;
    };

    const toInlineMd = (el: HTMLElement): string => {
      let txt = el.innerHTML || "";
      // 预处理：保留允许的原始标签（a/img），用占位符标记，后续再还原；避免被通用正则 strip 掉
      const preserved: string[] = [];
      txt = txt.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (m) => {
        preserved.push(stripRelTarget(m));
        return `__PRESERVE_A_${preserved.length - 1}__`;
      });
      txt = txt.replace(/<img\b[^>]*>/gi, (m) => {
        preserved.push(m);
        return `__PRESERVE_IMG_${preserved.length - 1}__`;
      });
      txt = txt
        .replace(/<strong>([\s\S]*?)<\/strong>/g, "**$1**")
        .replace(/<b>([\s\S]*?)<\/b>/g, "**$1**")
        .replace(/<em>([\s\S]*?)<\/em>/g, "*$1*")
        .replace(/<i>([\s\S]*?)<\/i>/g, "*$1*")
        .replace(/<u>([\s\S]*?)<\/u>/g, "++$1++")
        .replace(/<(?:s|strike|del)>([\s\S]*?)<\/(?:s|strike|del)>/g, "~~$1~~")
        .replace(/<code>([\s\S]*?)<\/code>/g, "`$1`");
      txt = txt.replace(/<[^>]+>/g, "");
      // 还原占位符
      txt = txt.replace(/__PRESERVE_(A|IMG)_(\d+)__/g, (_m, _type, idxStr) => {
        const idx = Number(idxStr);
        return preserved[idx] || "";
      });
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
        // ============ 首行缩进提取逻辑（Tab / ql-indent-N -> /t 令牌） ============
        // 目标：
        //  1. 用户通过 Tab 或前导空格产生的首行缩进被序列化。
        //  2. Quill 内置缩进格式（class="ql-indent-N"）同样被映射为 N 个 /t。
        //  3. 不影响空行与普通段落。
        // 规则：
        //  - 每 1 个实际 Tab 或 4 个连续空格视作一个缩进单位 -> 输出 /t 令牌。
        //  - 不足 4 的尾随空格原样保留。
        //  - 若存在 ql-indent-N 类，优先加上 N 个单位（再叠加真实前导空格/Tab）。
        let inlineRaw = toInlineMd(node); // 已转换为 markdown 风格的内联文本（仍可能含有 &nbsp; 实体）
        // 解码 &nbsp; -> \u00A0 以便统一被前导空白正则捕获
        if (inlineRaw.includes("&nbsp;")) {
          inlineRaw = inlineRaw.replace(/&nbsp;/g, "\u00A0");
        }
        // 某些情况下 Quill 可能产生包装 span（已在 toInlineMd 去标签），此处直接匹配前导空白（空格 / 制表 / 不断行空格）
        const rawLeadingMatch = /^([ \t\u00A0]+)/.exec(inlineRaw);
        let indentTokenPrefix = "";
        let bodyPart = inlineRaw;
        if (rawLeadingMatch) {
          const leading = rawLeadingMatch[1];
          bodyPart = inlineRaw.slice(leading.length);
          // 统一把 \u00A0 当作普通空格处理
          const leadingExpanded = leading.replace(/\u00A0/g, " ");
          // 统计 Tab 数（\t）
          const tabCount = (leadingExpanded.match(/\t/g) || []).length;
          // 剔除 Tab 后的剩余空格
          const spacesOnly = leadingExpanded.replace(/\t/g, "");
          const spaceCount = spacesOnly.length;
          const fromTabs = tabCount; // 1 Tab -> 1 单位
          const fromSpaces = Math.floor(spaceCount / 4);
          const leftoverSpaces = spaceCount % 4;
          const baseUnits = fromTabs + fromSpaces;
          indentTokenPrefix = "/t".repeat(baseUnits) + (leftoverSpaces ? " ".repeat(leftoverSpaces) : "");
        }
        // 解析 ql-indent-N 类（若有），在现有单位前追加（保持类产生的视觉缩进在最前）
        const indentClassMatch = Array.from(node.classList).find(c => /^ql-indent-\d+$/.test(c));
        if (indentClassMatch) {
          const n = Number.parseInt(indentClassMatch.replace(/^\D+/, ""), 10);
          if (!Number.isNaN(n) && n > 0) {
            indentTokenPrefix = "/t".repeat(n) + indentTokenPrefix; // 类缩进优先
          }
        }
        // 解析 inline style 缩进：text-indent / padding-left / margin-left
        // 适配场景：某些按 Tab 的实现可能只写入 style 而不生成前导空格或 ql-indent-N 类
        // 规则：
        //   - 基准单位 base = 2em 或 32px（与常见编辑器“首行缩进2字符”近似）；
        //   - text-indent 优先，其次 padding-left，再次 margin-left；
        //   - 若数值 < 1 个单位则忽略（避免误把极小微调视为缩进）；
        //   - em/rem -> 以 1em=16px 估算；px 直接使用；
        //   - 结果取 floor(value/base) 追加对应数量 /t；
        //   - 不与 class/前导空格互斥，可叠加。
        const styleAttr = (node.getAttribute("style") || "").toLowerCase();
        if (styleAttr && !/ql-indent-\d+/.test(node.className)) { // 若已有类仍允许叠加，但避免重复解析同来源
          const extractLen = (prop: string): number | null => {
            const re = new RegExp(`${prop}\\s*:\\s*([^;]+)`);
            const m = re.exec(styleAttr);
            if (!m)
              return null;
            let raw = m[1].trim();
            // 去掉可能的 !important
            raw = raw.replace(/!important$/, "").trim();
            const valMatch = /^(\d+(?:\.\d+)?)(px|em|rem)?$/.exec(raw);
            if (!valMatch)
              return null;
            const num = Number.parseFloat(valMatch[1]);
            const unit = valMatch[2] || "px"; // 无单位当 px
            if (Number.isNaN(num) || num <= 0)
              return null;
            let px = num;
            if (unit === "em" || unit === "rem")
              px = num * 16; // 估算
            return px;
          };
          const pxIndent = extractLen("text-indent") ?? extractLen("padding-left") ?? extractLen("margin-left");
          if (pxIndent != null) {
            const basePx = 32; // 2em 约等于 32px
            const units = Math.floor(pxIndent / basePx);
            if (units > 0) {
              indentTokenPrefix = "/t".repeat(units) + indentTokenPrefix;
            }
          }
        }
        // 对正文部分做（非首部）空白压缩：保留前导（已提取），内部连续空白仍折叠
        // 对正文：保留用户显式输入的连续空格（不再全部折叠），只做必要的换行与 \u00A0 -> 空格转换。
        // 去掉首尾空白时，保留尾部为了防止与对齐后缀 (c|r|b) 混淆，采用暂存策略：先检测对齐后缀再 trimEnd。
        let bodyNormalized = bodyPart.replace(/\u00A0/g, " ").replace(/\r\n?/g, "\n");
        // 暂不全局压缩多空格，避免合并：仅规范化换行。
        bodyNormalized = bodyNormalized.replace(/\n+/g, " ");
        // 不立即 trimEnd，这在下面对齐后缀检测后再处理
        bodyNormalized = bodyNormalized.replace(/^ +/, "");
        let text = indentTokenPrefix + bodyNormalized;
        // 如果段落内仅包含一个 <a> 或 <img> 并被保留下来，toInlineMd 会还原 outerHTML；此时继续下面对齐后缀逻辑即可
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
        else {
          // 检测真正的空段落（例如 <p><br></p> 或 纯空 <p>），需要被保留为一个“空行”占位
          // Quill 对多次回车会产生多个这样的段落；之前因为 trim() 直接忽略导致空行丢失
          const rawHtml = node.innerHTML.replace(/\s+/g, "");
          if (rawHtml === "" || rawHtml === "<br>" || /<br\/?>(?:<br\/?>)*/i.test(rawHtml)) {
            lines.push(""); // 直接暂存为空字符串，稍后统一编码为 \\n
          }
        }
        return;
      }
      // 直接保留裸露在根级别的 <a> 或 <img> 节点（不包裹段落），作为独立一行
      if (tag === "a" && node.getAttribute("href")) {
        let outer = node.outerHTML;
        if (outer) {
          outer = stripRelTarget(outer);
          lines.push(outer.trim());
        }
        return;
      }
      if (tag === "img" && node.getAttribute("src")) {
        const outer = node.outerHTML;
        if (outer) {
          lines.push(outer.trim());
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

    // 序列化策略说明：
    // - 单回车：Quill 产生两个相邻非空 <p>，直接对应为两行 Markdown（不插入 \n 标记），表示“段落分隔”。
    // - 双回车：中间出现一个空 <p><br></p>，该空段落编码成字面 \n，表示“可见空行/段落间额外间距”。
    // - 多回车：多个空 <p> -> 多个连续 \n。
    // 保留首尾空行的 \n 以保持用户显式输入。
    // 兼容历史：__BLANK_LINE__ / 私有区哨兵 -> 空行
    const normalized = lines.map(l => (l === "__BLANK_LINE__" || l === LEGACY_SENTRY_BLANK_LINE ? "" : l));
    // 空字符串（逻辑空行）统一编码为字面 \\n
    const encoded = normalized.map(l => (l.trim() === "" ? "\\n" : l));
    // 使用真实换行分隔行；只有本身为空行的行被替换成字面量 \\n 标记
    const result = encoded.join("\n");
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

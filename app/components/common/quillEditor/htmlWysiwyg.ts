// 简单 HTML 标签识别（所见即所得预处理阶段）
// 需求：在输入空格时（空格可位于标签中间或末尾），识别用户正在输入的部分/完整标签
// 仅支持标签: span, div, a, img
// 仅关注属性: src, href, id, width, height （其它属性忽略）
// 当前阶段功能：匹配后在控制台输出解析结果，不做内容转换
// 后续阶段可以在此基础上做真正的插入 / 富文本结构化

export type DetectedHtmlTagResult = {
  tag: string; // 标签名
  raw: string; // 原始匹配到的片段（不含触发空格自身）
  closed: boolean; // 是否自闭合（img 或 以 /> 结束）
  attrs: Record<string, string | true>; // 解析到的属性，只保留白名单
  isPartial: boolean; // 是否为未闭合/输入中的部分（如 <div 或 <img src=" ）
};

// 白名单
const TAG_ALLOW = new Set(["span", "div", "a", "img"]);
const ATTR_ALLOW = new Set(["src", "href", "id", "width", "height"]);

// 在行文本（到当前空格位置为止）中，向左回溯找到最近的 '<' 开头片段尝试解析
export function detectHtmlTagOnSpace(lineLeft: string): DetectedHtmlTagResult | null {
  // lineLeft: 截止当前输入空格(不含本次空格字符)之前的整行文本
  const ltPos = lineLeft.lastIndexOf("<");
  if (ltPos < 0) {
    return null;
  }
  const fragment = lineLeft.slice(ltPos); // 从 < 开始到行尾
  // 排除以 << 或 HTML 注释等复杂场景（简单防御）
  if (/^<<|^<!--/.test(fragment)) {
    return null;
  }
  // 基本标签名提取： <tag ...>
  const tagNameMatch = /^<\s*([a-z][a-z0-9]*)/i.exec(fragment);
  if (!tagNameMatch) {
    return null;
  }
  const tag = tagNameMatch[1].toLowerCase();
  if (!TAG_ALLOW.has(tag)) {
    return null;
  }

  // 截取标签内部（去掉开头 <tagName），用于属性解析
  const inner = fragment.slice(tagNameMatch[0].length);
  // 判断是否已经遇到闭合 '>' 或 '/>'
  const endGt = inner.indexOf(">");
  let closedSyntax = false;
  let attrArea = inner;
  if (endGt >= 0) {
    const beforeGt = inner.slice(0, endGt);
    closedSyntax = /\/\s*$/.test(beforeGt) || tag === "img";
    attrArea = beforeGt;
  }
  else {
    // 尚未输入到 '>'，视为部分
    attrArea = inner;
  }

  const attrs: Record<string, string | true> = {};
  // 属性 token 解析：允许形如 key="value" | key='value' | key=value | key
  // 只解析白名单属性，其它忽略
  // 使用 i 标记精简大小写类；第二层捕获组直接利用整体 ("..."|'...'|bare)
  // attr 解析：name (= value)? ; value 可以是 ".." | '..' | bare
  // 说明：匹配后 m[2], m[3], m[4] 之一为属性值；引用全部以避免 lint 误判未使用
  const attrRegex = /([a-z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/gi;
  for (;;) {
    const m = attrRegex.exec(attrArea);
    if (!m) {
      break;
    }
    const rawName = m[1];
    const name = rawName.toLowerCase();
    if (!ATTR_ALLOW.has(name)) {
      continue;
    }
    // 访问 m[2]/m[3]/m[4] 确保捕获组被使用
    const val = m[2] ?? m[3] ?? m[4];
    attrs[name] = val !== undefined ? val : true;
  }

  const isPartial = endGt === -1; // 未输入 >
  return {
    tag,
    raw: fragment,
    closed: closedSyntax,
    attrs,
    isPartial,
  };
}

// 调用入口：在空格插入后，提供当前行(到空格前)文本进行检测并输出
export function logHtmlTagIfAny(lineLeft: string): void {
  const r = detectHtmlTagOnSpace(lineLeft);
  if (r) {
    // 暂时只输出
    // 控制台格式化显示，便于后续扩展
    // eslint-disable-next-line no-console
    console.log("[HTML-TAG-DETECT]", r);
  }
}

// 将检测到的标签转换为 Quill 文档内容
// 调用时机：用户在标签末尾或标签内部敲下空格（已经调用 detectHtmlTagOnSpace）后
// 参数：
//  quillInstance: Quill 实例
//  lineLeft: 当前行（到空格前）文本
//  globalIndex: 空格的文档 index（即刚刚插入的空格位置）
// 返回：true 表示已处理并替换；false 表示未处理
export function convertHtmlTagIfAny(
  quillInstance: any,
  lineLeft: string,
  globalIndex: number,
): boolean {
  if (!quillInstance || typeof globalIndex !== "number") {
    return false;
  }
  const detected = detectHtmlTagOnSpace(lineLeft);
  if (!detected) {
    return false;
  }
  const { tag, raw, attrs, isPartial } = detected;
  // 不处理未闭合（仍然输入中）的标签
  if (isPartial) {
    return false;
  }
  // 旧实现：基于 lineLeft 末尾删除到行末，可能会把标签后面的其它文本一起删掉；
  // 新实现：精准只删除 raw 片段本身。
  // 直接使用 raw.length 并向左回溯匹配，避免多次出现相同子串导致 lastIndexOf 错误定位。
  const rawLen = raw.length;
  if (!rawLen) {
    return false;
  }
  // 最大向左回溯字符数（保护性能）
  const maxBack = Math.min(600, globalIndex); // 不会超过当前 index
  let tagDocStart = -1;
  // 由于我们已在上层构造了 lineLeft = 当前行(不含空格)文本，理论上 raw 一定在 lineLeft 末尾，
  // 但为提高健壮性，这里仍做从 globalIndex - rawLen 起始的精准匹配，失败则在一个窗口内继续回溯。
  const primaryStart = globalIndex - rawLen; // 假设标签紧邻空格
  try {
    const primaryText = quillInstance.getText?.(primaryStart, rawLen) || "";
    if (primaryText === raw) {
      tagDocStart = primaryStart;
    }
  }
  catch {
    // ignore
  }
  if (tagDocStart === -1) {
    // 回溯扫描（最多 maxBack - rawLen 次）
    const limit = Math.max(0, globalIndex - maxBack);
    for (let start = primaryStart - 1; start >= limit; start -= 1) {
      try {
        const seg = quillInstance.getText?.(start, rawLen) || "";
        if (seg === raw) {
          tagDocStart = start;
          break;
        }
      }
      catch {
        // ignore each iteration
      }
    }
  }
  if (tagDocStart < 0) {
    console.warn("[HTML-CONVERT] 未找到标签源码位置，放弃转换", { raw });
    return false;
  }
  const tagLength = rawLen; // 仅删除标签源码自身

  // 构造插入内容
  const ops: any[] = [];
  if (tag === "img") {
    // 简单使用 Quill 内置 image blot：插入 attrs.src
    const src = (attrs.src || attrs.href || "") as string;
    if (!src) {
      return false; // 没有 src 不转换
    }
    ops.push({ insert: { image: src } });
    // 若有 width/height，后续可考虑自定义 blot，这里暂不处理尺寸
  }
  else if (tag === "a") {
    // 以链接文字展示：优先 id / href / 占位符
    const href = (attrs.href || attrs.src || "") as string;
    const idText = (attrs.id as string) || "";
    // 增强1：若既没有 href 也没有 id，则不转换，维持原始输入（避免出现占位符“链接”干扰用户继续编辑）
    if (!href && !idText) {
      return false;
    }
    const text = href || idText;
    ops.push({ insert: text, attributes: { link: href || undefined } });
  }
  else if (tag === "span" || tag === "div") {
    // 目前没有特殊格式，直接插入一个空占位或 id
    const content = (attrs.id as string) || (tag === "div" ? "" : "");
    // 如果没有任何属性，尝试忽略，保持原样（返回 false）
    if (!content && Object.keys(attrs).length === 0) {
      return false;
    }
    ops.push({ insert: content || (tag === "div" ? "" : "") });
  }
  else {
    return false; // 未覆盖标签
  }

  try {
    // 先删除原始标签源码（silent 避免递归 text-change 引起的竞争）
    if (tagLength > 0) {
      quillInstance.deleteText(tagDocStart, tagLength, "silent");
    }
    // 在删除位置插入结构化内容（仍用 silent，手动调度刷新）并统计总插入长度
    let insertPos = tagDocStart;
    let insertedTotal = 0;
    for (const op of ops) {
      if (typeof op.insert === "object" && op.insert.image) {
        quillInstance.insertEmbed(insertPos, "image", op.insert.image, "silent");
        insertPos += 1;
        insertedTotal += 1; // embed 长度视为 1
      }
      else if (typeof op.insert === "string") {
        quillInstance.insertText(insertPos, op.insert, op.attributes || {}, "silent");
        insertPos += op.insert.length;
        insertedTotal += op.insert.length;
      }
    }
    // 若是 img 并提供 width/height，尝试直接设置 DOM 属性（增强3）
    if (tag === "img" && (attrs.width || attrs.height)) {
      try {
        const leafInfo = quillInstance.getLeaf(tagDocStart);
        const leafNode = leafInfo && leafInfo[0] && leafInfo[0].domNode;
        if (leafNode && leafNode.tagName === "IMG") {
          const imgEl = leafNode as HTMLImageElement;
          const w = attrs.width as string | undefined;
          const h = attrs.height as string | undefined;
          if (w) {
            if (/^\d+$/.test(w)) {
              imgEl.setAttribute("width", w);
            }
            else {
              imgEl.style.width = w;
            }
          }
          if (h) {
            if (/^\d+$/.test(h)) {
              imgEl.setAttribute("height", h);
            }
            else {
              imgEl.style.height = h;
            }
          }
        }
      }
      catch { /* ignore width/height set errors */ }
    }
    // 此时空格原 index(globalIndex) 已因为删除向左移动 tagLength，再因为插入向右移动 insertedTotal
    // 新的空格位置 = (globalIndex - tagLength) + insertedTotal
    const spaceNewIndex = (globalIndex - tagLength) + insertedTotal;
    // 希望光标落在空格之后继续输入
    quillInstance.setSelection(spaceNewIndex + 1, 0, "silent");
  }
  catch {
    return false;
  }
  return true;
}

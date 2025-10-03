// 将编辑器当前 HTML 中含 data-origin-raw 的节点还原为最初用户输入的原始标签源码
// 规则：
// 1. 仅处理 <img> 与 <a>（当前我们只对它们在插入时写入 data-origin-raw）
// 2. data-origin-raw 的值视为安全来源（来自用户最初输入的片段），仍做一次最小校验：必须以 '<' 开始且包含 '>'
// 3. 还原时：用原始源码替换该节点的 outerHTML
// 4. 若源码缺失或校验失败，则忽略保留现状
// 5. 结果返回新的 HTML 字符串，不直接修改传入字符串（通过 DOM 临时容器）

export function restoreRawHtml(currentHtml: string): string {
  if (!currentHtml || typeof document === "undefined") {
    return currentHtml || "";
  }
  const container = document.createElement("div");
  container.innerHTML = currentHtml;
  const selector = "img[data-origin-raw],a[data-origin-raw]";
  const nodes = container.querySelectorAll(selector);
  nodes.forEach((node) => {
    const raw = node.getAttribute("data-origin-raw");
    if (!raw) {
      return;
    }
    const trimmed = raw.trim();
    if (!trimmed.startsWith("<") || !trimmed.includes(">")) {
      return;
    }
    // 基础白名单：只允许我们支持的标签前缀 <img / <a / <span / <div
    if (!/^<\s*(?:img|a|span|div)\b/i.test(trimmed)) {
      return;
    }
    // 替换 outerHTML
    try {
      (node as HTMLElement).outerHTML = trimmed;
    }
    catch {
      // ignore replacement error
    }
  });
  return container.innerHTML;
}

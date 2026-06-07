// function isSafari() {
//   const userAgent = navigator.userAgent.toLowerCase();
//   return userAgent.includes("applewebkit") && !userAgent.includes("chrome");
// }

/**
 * 获取当前光标选区的信息
 * @param {HTMLElement | null} [contextElement] - 如果提供，函数将只返回完全包含在此上下文元素内部的选区
 * @returns {{range: Range, selection: Selection} | null} 包含光标选区和选区对象的对象，如果没有有效选区，则返回 null
 */
export function getEditorRange(contextElement?: HTMLElement | null): { range: Range; selection: Selection } | null {
  let range: Range | null = null;
  let selection: Selection | null = null;

  // 检查浏览器是否支持 getSelection
  if (typeof window.getSelection !== "function") {
    return null; // 浏览器不支持 getSelection
  }

  selection = window.getSelection();
  if (!selection) {
    return null; // 无法获取选区对象
  }

  // 检查是否有选区范围（这是所有现代浏览器的标准检查方式）
  if (selection.rangeCount === 0) {
    return null; // 当前没有选区
  }

  // 获取第一个选区范围
  range = selection.getRangeAt(0);
  if (!range) {
    return null; // 无法获取范围对象
  }

  // 如果提供了上下文元素（例如我们的聊天输入 div），
  // 则验证整个选区是否在该元素内部
  if (contextElement) {
    // range.commonAncestorContainer 是包含选区开始和结束点的最深层的共同父节点
    // 我们需要检查此节点是否是 contextElement 本身，或者是它的后代节点
    const container = range.commonAncestorContainer;

    // Node.contains() 方法检查一个节点是否是另一个节点的后代
    // 或是否是该节点本身
    if (!contextElement.contains(container)) {
      // 如果共同父节点不在 contextElement 内部
      // 这意味着选区（或其至少一部分）在我们的目标编辑器之外，应将其视为无效
      return null;
    }
  }

  // 验证通过（或不需要上下文验证），返回信息
  return {
    range,
    selection,
  };
}
// 重新设置光标的位置

/**
 * 获取光标坐标
 */
export function getSelectionCoords() {
  const win = window;
  const doc = win.document;
  let range;
  let rects;
  let rect;
  let x = 0;
  let y = 0;
  const sel = win.getSelection();
  if (sel?.rangeCount) {
    range = sel.getRangeAt(0).cloneRange();
    if (range.getClientRects) {
      range.collapse(true);
      rects = range.getClientRects();
      if (rects.length > 0) {
        rect = rects[0];
      }
      // 光标在行首时，rect 为 undefined
      if (rect) {
        x = rect.left;
        y = rect.top;
      }
    }
    if ((x === 0 && y === 0) || rect === undefined) {
      const span = doc.createElement("span");
      if (span.getClientRects) {
        span.appendChild(doc.createTextNode("\u200B"));
        range.insertNode(span);
        rect = span.getClientRects()[0];
        x = rect.left;
        y = rect.top;
        const spanParent = span.parentNode;
        spanParent?.removeChild(span);
        spanParent?.normalize();
      }
    }
  }
  return { x, y };
}

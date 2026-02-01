// function isSafari() {
//   const userAgent = navigator.userAgent.toLowerCase();
//   return userAgent.includes("applewebkit") && !userAgent.includes("chrome");
// }

/**
 * 获取当前光标选区的信息?
 * @param {HTMLElement | null} [contextElement] - 可如果提供，函数将只返回完全包含在此上下文元素内部的选区?
 * @returns {{range: Range, selection: Selection} | null} 包含光标选区和择对象的对象，如果没有有效选区，则返回 null?
 */
export function getEditorRange(contextElement?: HTMLElement | null): { range: Range; selection: Selection } | null {
  let range: Range | null = null;
  let selection: Selection | null = null;

  // 棢查浏览器是否支持 getSelection
  if (typeof window.getSelection !== "function") {
    return null; // 涓嶆敮鎸?
  }

  selection = window.getSelection();
  if (!selection) {
    return null; // 鏃犳硶鑾峰彇閫夊尯瀵硅薄
  }

  // 棢查是否有选区范围 (这是扢有现代浏览器的标准检查方?
  if (selection.rangeCount === 0) {
    return null; // 褰撳墠娌℃湁閫夊尯
  }

  // 获取第一个区范围
  range = selection.getRangeAt(0);
  if (!range) {
    return null; // 鏃犳硶鑾峰彇鑼冨洿瀵硅薄
  }

  // 如果提供了上下文元素（例如我们的聊天输入?div），
  // 则验证整个区是否在该元素内部?
  if (contextElement) {
    // range.commonAncestorContainer 是包含区弢始和结束点的朢深层的共同父节点?
    // 我们霢要检查此节点是否?contextElement 本身，或者是它的后代节点?
    const container = range.commonAncestorContainer;

    // Node.contains() 方法棢查一个节点是否是另一个节点的后代?
    // 或是否是该节点本身?
    if (!contextElement.contains(container)) {
      // 濡傛灉鍏卞悓鐖惰妭鐐逛笉鍦?contextElement 鍐呴儴锛?
      // 这意味着选区（或其至少一部分）在我们的目标编辑器之外，应将其视为无效?
      return null;
    }
  }

  // 楠岃瘉閫氳繃锛堟垨涓嶉渶瑕佷笂涓嬫枃楠岃瘉锛夛紝杩斿洖淇℃伅
  return {
    range,
    selection,
  };
}
// 閲嶆柊璁剧疆鍏夋爣鐨勪綅缃?

/**
 * 鑾峰彇鍏夋爣鍧愭爣
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
      // 光标在行首时，rect为undefined
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

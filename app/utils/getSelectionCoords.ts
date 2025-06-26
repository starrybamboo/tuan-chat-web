function isSafari() {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes("applewebkit") && !userAgent.includes("chrome");
}

/**
 * 获取当前光标选区的信息。
 * @returns {object | null} 包含光标选区和选择对象的对象，如果没有选区，则返回 null。
 */
export function getEditorRange() {
  let range = null;
  let selection = null;
  if (window.getSelection) {
    // 获取选区对象
    selection = window.getSelection();
    if (!selection) {
      return null;
    }
    // 对于 Safari，直接获取第一个选区
    if (isSafari()) {
      range = selection.getRangeAt(0);
    }
    else {
      // 对于其他浏览器，检查 rangeCount 是否大于 0
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      }
    }
  }
  else {
    return null;
  }
  return {
    range,
    selection,
  };
}

// 重新设置光标的位置
export function resetRange(range: Range) {
  if (range) {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

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

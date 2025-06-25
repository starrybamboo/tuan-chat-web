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

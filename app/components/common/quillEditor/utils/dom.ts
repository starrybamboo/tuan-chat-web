/* DOM helpers used by Quill editor hooks */

export type Point = { top: number; left: number };

/**
 * Compute caret position relative to wrapper using native Selection/Range.
 * Fallback used when Quill getBounds returns stale values.
 */
export function computeNativeCaretPos(
  wrapper: HTMLElement | null,
  root: HTMLElement | null,
): Point | null {
  try {
    if (!wrapper || !root) {
      return null;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      return null;
    }
    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
      return null;
    }

    let marker: HTMLSpanElement | null = null;
    if (
      range.startContainer.nodeType === Node.ELEMENT_NODE
      && (range.startContainer as Element).childNodes.length === 0
    ) {
      marker = document.createElement("span");
      marker.textContent = "\u200B"; // ZERO WIDTH SPACE
      range.insertNode(marker);
      range.setStartAfter(marker);
      range.collapse(true);
    }

    const rect = range.getBoundingClientRect();
    if (marker && marker.parentNode) {
      try {
        marker.parentNode.removeChild(marker);
      }
      catch {
        // ignore
      }
    }
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return null;
    }

    const wrapRect = wrapper.getBoundingClientRect();
    const top = rect.top - wrapRect.top;
    const left = rect.left - wrapRect.left;
    if (Number.isNaN(top) || Number.isNaN(left)) {
      return null;
    }
    return { top, left: Math.max(0, left) };
  }
  catch {
    return null;
  }
}

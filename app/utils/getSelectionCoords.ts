// function isSafari() {
//   const userAgent = navigator.userAgent.toLowerCase();
//   return userAgent.includes("applewebkit") && !userAgent.includes("chrome");
// }

/**
 * 鑾峰彇褰撳墠鍏夋爣閫夊尯鐨勪俊鎭€?
 * @param {HTMLElement | null} [contextElement] - 鍙€夈€傚鏋滄彁渚涳紝鍑芥暟灏嗗彧杩斿洖瀹屽叏鍖呭惈鍦ㄦ涓婁笅鏂囧厓绱犲唴閮ㄧ殑閫夊尯銆?
 * @returns {{range: Range, selection: Selection} | null} 鍖呭惈鍏夋爣閫夊尯鍜岄€夋嫨瀵硅薄鐨勫璞★紝濡傛灉娌℃湁鏈夋晥閫夊尯锛屽垯杩斿洖 null銆?
 */
export function getEditorRange(contextElement?: HTMLElement | null): { range: Range; selection: Selection } | null {
  let range: Range | null = null;
  let selection: Selection | null = null;

  // 妫€鏌ユ祻瑙堝櫒鏄惁鏀寔 getSelection
  if (typeof window.getSelection !== "function") {
    return null; // 涓嶆敮鎸?
  }

  selection = window.getSelection();
  if (!selection) {
    return null; // 鏃犳硶鑾峰彇閫夊尯瀵硅薄
  }

  // 妫€鏌ユ槸鍚︽湁閫夊尯鑼冨洿 (杩欐槸鎵€鏈夌幇浠ｆ祻瑙堝櫒鐨勬爣鍑嗘鏌ユ柟寮?
  if (selection.rangeCount === 0) {
    return null; // 褰撳墠娌℃湁閫夊尯
  }

  // 鑾峰彇绗竴涓€夊尯鑼冨洿
  range = selection.getRangeAt(0);
  if (!range) {
    return null; // 鏃犳硶鑾峰彇鑼冨洿瀵硅薄
  }

  // 濡傛灉鎻愪緵浜嗕笂涓嬫枃鍏冪礌锛堜緥濡傛垜浠殑鑱婂ぉ杈撳叆妗?div锛夛紝
  // 鍒欓獙璇佹暣涓€夊尯鏄惁鍦ㄨ鍏冪礌鍐呴儴銆?
  if (contextElement) {
    // range.commonAncestorContainer 鏄寘鍚€夊尯寮€濮嬪拰缁撴潫鐐圭殑鏈€娣卞眰鐨勫叡鍚岀埗鑺傜偣銆?
    // 鎴戜滑闇€瑕佹鏌ユ鑺傜偣鏄惁鏄?contextElement 鏈韩锛屾垨鑰呮槸瀹冪殑鍚庝唬鑺傜偣銆?
    const container = range.commonAncestorContainer;

    // Node.contains() 鏂规硶妫€鏌ヤ竴涓妭鐐规槸鍚︽槸鍙︿竴涓妭鐐圭殑鍚庝唬锛?
    // 鎴栬€呮槸鍚︽槸璇ヨ妭鐐规湰韬€?
    if (!contextElement.contains(container)) {
      // 濡傛灉鍏卞悓鐖惰妭鐐逛笉鍦?contextElement 鍐呴儴锛?
      // 杩欐剰鍛崇潃閫夊尯锛堟垨鍏惰嚦灏戜竴閮ㄥ垎锛夊湪鎴戜滑鐨勭洰鏍囩紪杈戝櫒涔嬪锛屽簲灏嗗叾瑙嗕负鏃犳晥銆?
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
      // 鍏夋爣鍦ㄨ棣栨椂锛宺ect涓簎ndefined
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

const BLOCKED_MODIFIER_KEYS = new Set([
  "0",
  "-",
  "=",
  "+",
  "_",
  "d",
  "f",
  "g",
  "h",
  "j",
  "l",
  "n",
  "o",
  "p",
  "r",
  "s",
  "t",
  "u",
  "w",
  "tab",
]);
const BLOCKED_FUNCTION_KEYS = new Set(["f1", "f3", "f5", "f6"]);
const WHEEL_DELTA_LINE = 1;
const WHEEL_DELTA_PAGE = 2;
const WHEEL_LINE_HEIGHT = 16;
const WHEEL_PIXEL_HEIGHT = 1;
const CHAT_FRAME_SCROLLER_SELECTOR = "[data-testid=\"virtuoso-scroller\"], [data-virtuoso-scroller=\"true\"]";

type BrowserShortcutEventLike = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;
type BrowserWheelEventLike = Pick<WheelEvent, "deltaMode" | "deltaX" | "deltaY">;
type ScrollableElementLike = {
  clientHeight: number;
  clientWidth: number;
  dataset?: DOMStringMap;
  parentElement: ScrollableElementLike | null;
  querySelector?: <T extends ScrollableElementLike>(selector: string) => T | null;
  scrollBy: (options: ScrollToOptions) => void;
  scrollHeight: number;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
};
type BrowserScrollDocumentLike = Pick<Document, "querySelector" | "scrollingElement">;

function isScrollableElementLike(value: unknown): value is ScrollableElementLike {
  return typeof value === "object"
    && value !== null
    && "parentElement" in value
    && "scrollBy" in value
    && "scrollTop" in value
    && "scrollLeft" in value
    && "clientHeight" in value
    && "clientWidth" in value
    && "scrollHeight" in value
    && "scrollWidth" in value;
}

export function shouldBlockBrowserShortcut(event: BrowserShortcutEventLike) {
  const key = String(event.key || "").toLowerCase();
  if (BLOCKED_FUNCTION_KEYS.has(key)) {
    return true;
  }
  if (event.altKey && (key === "arrowleft" || key === "arrowright")) {
    return true;
  }
  if (!event.ctrlKey && !event.metaKey) {
    return false;
  }
  return BLOCKED_MODIFIER_KEYS.has(key);
}

export function resolveWheelScrollDelta(event: BrowserWheelEventLike, pageHeight: number) {
  const scale = event.deltaMode === WHEEL_DELTA_LINE
    ? WHEEL_LINE_HEIGHT
    : event.deltaMode === WHEEL_DELTA_PAGE
      ? pageHeight
      : WHEEL_PIXEL_HEIGHT;
  return {
    left: Number.isFinite(event.deltaX) ? event.deltaX * scale : 0,
    top: Number.isFinite(event.deltaY) ? event.deltaY * scale : 0,
  };
}

function canScrollElementLike(element: ScrollableElementLike, left: number, top: number) {
  if (top < 0 && element.scrollTop > 0) {
    return true;
  }
  if (top > 0 && element.scrollTop + element.clientHeight < element.scrollHeight) {
    return true;
  }
  if (left < 0 && element.scrollLeft > 0) {
    return true;
  }
  if (left > 0 && element.scrollLeft + element.clientWidth < element.scrollWidth) {
    return true;
  }
  return false;
}

export function findScrollableElement(target: EventTarget | null, left: number, top: number, documentRef: BrowserScrollDocumentLike) {
  let element: ScrollableElementLike | null = isScrollableElementLike(target) ? target : null;
  while (element) {
    if (canScrollElementLike(element, left, top)) {
      return element;
    }
    if (element.dataset?.chatFrameRoot === "true") {
      const rootScroller = element.querySelector?.<ScrollableElementLike>(CHAT_FRAME_SCROLLER_SELECTOR);
      if (rootScroller && canScrollElementLike(rootScroller, left, top)) {
        return rootScroller;
      }
    }
    element = element.parentElement;
  }

  const chatFrameScroller = documentRef.querySelector(CHAT_FRAME_SCROLLER_SELECTOR);
  if (isScrollableElementLike(chatFrameScroller) && canScrollElementLike(chatFrameScroller, left, top)) {
    return chatFrameScroller;
  }

  const scrollingElement = documentRef.scrollingElement;
  return isScrollableElementLike(scrollingElement) && canScrollElementLike(scrollingElement, left, top)
    ? scrollingElement
    : null;
}

export function installBrowserShortcutGuard(targetWindow: Window = window) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!shouldBlockBrowserShortcut(event)) {
      return;
    }
    event.preventDefault();
  };

  const handleWheel = (event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const { left, top } = resolveWheelScrollDelta(event, targetWindow.innerHeight);
    const scrollTarget = findScrollableElement(event.target, left, top, targetWindow.document);
    scrollTarget?.scrollBy({ behavior: "auto", left, top });
  };

  targetWindow.addEventListener("keydown", handleKeyDown, true);
  targetWindow.addEventListener("wheel", handleWheel, { capture: true, passive: false });

  return () => {
    targetWindow.removeEventListener("keydown", handleKeyDown, true);
    targetWindow.removeEventListener("wheel", handleWheel, { capture: true });
  };
}

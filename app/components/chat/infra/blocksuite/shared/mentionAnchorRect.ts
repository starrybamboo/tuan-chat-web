import type { BlocksuiteFrameAnchorRect } from "./frameProtocol";

type RectLike = Pick<BlocksuiteFrameAnchorRect, "left" | "top" | "right" | "bottom" | "width" | "height">;

type RectSource = {
  getBoundingClientRect: () => RectLike;
};

function isRectSource(value: unknown): value is RectSource {
  return Boolean(value) && typeof (value as RectSource).getBoundingClientRect === "function";
}

function toAnchorRect(rect: RectLike): BlocksuiteFrameAnchorRect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function buildBlocksuiteMentionAnchorRect(params: {
  target: unknown;
  frameElement?: unknown;
}): BlocksuiteFrameAnchorRect | null {
  const { target, frameElement } = params;
  if (!isRectSource(target))
    return null;

  const mentionRect = target.getBoundingClientRect();
  // 不要用 instanceof HTMLElement 判断 frameElement。
  // iframe 场景下它可能来自父 window 的 realm，instanceof 在子 frame 里会失效。
  const frameRect = isRectSource(frameElement) ? frameElement.getBoundingClientRect() : null;

  if (!frameRect) {
    return toAnchorRect(mentionRect);
  }

  return {
    left: frameRect.left + mentionRect.left,
    top: frameRect.top + mentionRect.top,
    right: frameRect.left + mentionRect.right,
    bottom: frameRect.top + mentionRect.bottom,
    width: mentionRect.width,
    height: mentionRect.height,
  };
}

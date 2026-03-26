export type BlocksuiteMentionAnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type BlocksuiteMentionProfilePopoverState = {
  userId: string;
  anchorRect: BlocksuiteMentionAnchorRect;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function buildBlocksuiteMentionPopoverPosition(
  anchorRect: BlocksuiteMentionAnchorRect,
  desiredWidth: number,
  desiredHeight: number,
) {
  const margin = 10;
  const gap = 8;
  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;

  const width = clamp(desiredWidth, 280, vw - margin * 2);
  const height = clamp(desiredHeight, 240, vh - margin * 2);

  const centerX = anchorRect.left + Math.max(0, anchorRect.width) / 2;
  const left = clamp(Math.round(centerX - width / 2), margin, Math.max(margin, vw - width - margin));

  const belowTop = Math.round(anchorRect.bottom + gap);
  const aboveTop = Math.round(anchorRect.top - height - gap);
  const canPlaceBelow = belowTop + height + margin <= vh;
  const canPlaceAbove = aboveTop >= margin;
  const top = canPlaceBelow ? belowTop : (canPlaceAbove ? aboveTop : clamp(belowTop, margin, vh - height - margin));

  return { top, left, width, height };
}

export function getBlocksuiteMentionProfileHref(userId: string) {
  return `/profile/${encodeURIComponent(userId)}`;
}

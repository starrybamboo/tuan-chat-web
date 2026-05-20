export const MESSAGE_LIST_BOTTOM_THRESHOLD = 50;

export function isWithinBottomThreshold(offsetY: number, threshold = MESSAGE_LIST_BOTTOM_THRESHOLD): boolean {
  return Number.isFinite(offsetY) && offsetY < threshold;
}

export function resolveBottomThresholdTransition(
  previousIsAtBottom: boolean,
  offsetY: number,
  threshold = MESSAGE_LIST_BOTTOM_THRESHOLD,
): { changed: boolean; isAtBottom: boolean } {
  const isAtBottom = isWithinBottomThreshold(offsetY, threshold);
  return {
    changed: previousIsAtBottom !== isAtBottom,
    isAtBottom,
  };
}

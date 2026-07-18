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

export function resolveVisibleMessageAppendAction(params: {
  isAtBottom: boolean;
  nextLength: number;
  previousLength: number;
  shouldForceScrollToBottom?: boolean;
}): { addedCount: number; shouldCountNewMessages: boolean; shouldScrollToBottom: boolean } {
  const addedCount = Math.max(0, params.nextLength - params.previousLength);
  if (addedCount === 0) {
    return {
      addedCount: 0,
      shouldCountNewMessages: false,
      shouldScrollToBottom: false,
    };
  }
  const shouldForceScrollToBottom = params.shouldForceScrollToBottom === true;
  return {
    addedCount,
    shouldCountNewMessages: !params.isAtBottom && !shouldForceScrollToBottom,
    shouldScrollToBottom: params.isAtBottom || shouldForceScrollToBottom,
  };
}

export function shouldAutoScrollOnContentSizeChange(params: {
  hasPendingScrollToBottom: boolean;
  isAtBottom: boolean;
}): boolean {
  return params.hasPendingScrollToBottom;
}

export function resolveMessageScrollFallbackOffset(index: number, averageItemLength: number): number {
  if (!Number.isFinite(index) || !Number.isFinite(averageItemLength) || index <= 0 || averageItemLength <= 0) {
    return 0;
  }
  return Math.max(0, Math.floor(index * averageItemLength));
}

export function shouldAnimateMessageJump(
  targetIndex: number,
  currentOffset: number,
  averageItemLength = 72,
  maximumAnimatedDistance = 900,
): boolean {
  const estimatedTargetOffset = Math.max(0, targetIndex) * Math.max(1, averageItemLength);
  return Math.abs(estimatedTargetOffset - Math.max(0, currentOffset)) <= maximumAnimatedDistance;
}

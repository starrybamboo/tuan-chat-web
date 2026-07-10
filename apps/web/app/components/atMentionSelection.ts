export type AtMentionSelectionDirection = -1 | 1;

export function resolveNextAtMentionSelectionIndex({
  currentIndex,
  direction,
  itemCount,
}: {
  currentIndex: number;
  direction: AtMentionSelectionDirection;
  itemCount: number;
}): number {
  if (itemCount <= 0) {
    return 0;
  }

  const normalizedIndex = ((currentIndex % itemCount) + itemCount) % itemCount;
  return (normalizedIndex + direction + itemCount) % itemCount;
}

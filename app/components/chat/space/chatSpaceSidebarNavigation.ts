type ShouldSelectSpaceFromSidebarParams = {
  activeSpaceId: number | null;
  targetSpaceId?: number | null;
  isDiscoverMode?: boolean;
  isDragging: boolean;
};

export function shouldSelectSpaceFromSidebar({
  activeSpaceId,
  targetSpaceId,
  isDiscoverMode = false,
  isDragging,
}: ShouldSelectSpaceFromSidebarParams): boolean {
  if (isDragging) {
    return false;
  }
  if (typeof targetSpaceId !== "number" || !Number.isFinite(targetSpaceId) || targetSpaceId <= 0) {
    return false;
  }
  if (isDiscoverMode) {
    return true;
  }
  return activeSpaceId !== targetSpaceId;
}

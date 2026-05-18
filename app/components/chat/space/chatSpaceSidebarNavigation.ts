type ShouldSelectSpaceFromSidebarParams = {
  activeSpaceId: number | null;
  targetSpaceId?: number | null;
  isDiscoverMode?: boolean;
  isDragging: boolean;
};

type ShouldShowSpaceAsActiveParams = {
  activeSpaceId: number | null;
  spaceId?: number | null;
  isDiscoverMode?: boolean;
  isPrivateChatMode?: boolean;
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

export function shouldShowSpaceAsActive({
  activeSpaceId,
  spaceId,
  isDiscoverMode = false,
  isPrivateChatMode = false,
}: ShouldShowSpaceAsActiveParams): boolean {
  if (isDiscoverMode || isPrivateChatMode) {
    return false;
  }
  return activeSpaceId != null && spaceId != null && activeSpaceId === spaceId;
}

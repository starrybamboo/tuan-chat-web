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

export type ChatSidebarActiveCursorTarget =
  | { type: "private" }
  | { type: "discover" }
  | { type: "space"; spaceId: number };

type GetChatSidebarActiveCursorTargetParams = {
  activeSpaceId: number | null;
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

export function getChatSidebarActiveCursorTarget({
  activeSpaceId,
  isDiscoverMode = false,
  isPrivateChatMode = false,
}: GetChatSidebarActiveCursorTargetParams): ChatSidebarActiveCursorTarget | null {
  if (isPrivateChatMode) {
    return { type: "private" };
  }
  if (isDiscoverMode) {
    return { type: "discover" };
  }
  if (activeSpaceId == null || activeSpaceId <= 0) {
    return null;
  }
  return { type: "space", spaceId: activeSpaceId };
}

export function isChatSidebarSpaceCursorTarget(
  target: ChatSidebarActiveCursorTarget | null,
  spaceId?: number | null,
): boolean {
  return target?.type === "space" && spaceId != null && target.spaceId === spaceId;
}

export function shouldShowSpaceAsActive({
  activeSpaceId,
  spaceId,
  isDiscoverMode = false,
  isPrivateChatMode = false,
}: ShouldShowSpaceAsActiveParams): boolean {
  return isChatSidebarSpaceCursorTarget(getChatSidebarActiveCursorTarget({
    activeSpaceId,
    isDiscoverMode,
    isPrivateChatMode,
  }), spaceId);
}

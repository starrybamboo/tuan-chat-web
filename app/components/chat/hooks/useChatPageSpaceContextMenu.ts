import { useMemo } from "react";

type SpaceSummary = {
  spaceId?: number | null;
  userId?: number | null;
  status?: number | null;
};

type SpaceContextMenuState = {
  spaceId: number;
} | null;

type UseChatPageSpaceContextMenuParams = {
  currentUserId?: number | null;
  spaceContextMenu: SpaceContextMenuState;
  spaces: SpaceSummary[];
};

type UseChatPageSpaceContextMenuResult = {
  isSpaceContextArchived: boolean;
  isSpaceContextOwner: boolean;
};

export default function useChatPageSpaceContextMenu({
  currentUserId,
  spaceContextMenu,
  spaces,
}: UseChatPageSpaceContextMenuParams): UseChatPageSpaceContextMenuResult {
  const targetSpace = useMemo(() => {
    if (!spaceContextMenu)
      return null;
    const targetId = spaceContextMenu.spaceId;
    return spaces.find(space => space.spaceId === targetId) ?? null;
  }, [spaceContextMenu, spaces]);

  return {
    isSpaceContextArchived: Boolean(targetSpace && targetSpace.status === 2),
    isSpaceContextOwner: Boolean(targetSpace && targetSpace.userId === currentUserId),
  };
}

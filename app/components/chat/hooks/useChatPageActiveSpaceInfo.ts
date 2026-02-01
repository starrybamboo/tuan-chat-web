import { useMemo } from "react";

type SpaceSummary = {
  spaceId?: number | null;
  status?: number | null;
  name?: string | null;
  avatar?: string | null;
};

type SpaceHeaderOverride = {
  title?: string | null;
};

type UseChatPageActiveSpaceInfoParams = {
  activeSpaceHeaderOverride?: SpaceHeaderOverride | null;
  activeSpaceId?: number | null;
  activeSpaceInfo?: SpaceSummary | null;
  spaces: SpaceSummary[];
};

type UseChatPageActiveSpaceInfoResult = {
  activeSpace: SpaceSummary | null;
  activeSpaceAvatar?: string | null;
  activeSpaceIsArchived: boolean;
  activeSpaceNameForUi?: string | null;
};

export default function useChatPageActiveSpaceInfo({
  activeSpaceHeaderOverride,
  activeSpaceId,
  activeSpaceInfo,
  spaces,
}: UseChatPageActiveSpaceInfoParams): UseChatPageActiveSpaceInfoResult {
  const activeSpace = useMemo(() => {
    return activeSpaceInfo ?? spaces.find(space => space.spaceId === activeSpaceId) ?? null;
  }, [activeSpaceId, activeSpaceInfo, spaces]);

  return {
    activeSpace,
    activeSpaceAvatar: activeSpace?.avatar,
    activeSpaceIsArchived: activeSpace?.status === 2,
    activeSpaceNameForUi: activeSpaceHeaderOverride?.title ?? activeSpace?.name,
  };
}

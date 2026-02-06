import { useMemo } from "react";

import type { Space } from "../../../../api";

type SpaceHeaderOverride = {
  title?: string | null;
};

type UseChatPageActiveSpaceInfoParams = {
  activeSpaceHeaderOverride?: SpaceHeaderOverride | null;
  activeSpaceId?: number | null;
  activeSpaceInfo?: Space | null;
  spaces: Space[];
};

type UseChatPageActiveSpaceInfoResult = {
  activeSpace: Space | null;
  activeSpaceAvatar?: string;
  activeSpaceIsArchived: boolean;
  activeSpaceNameForUi?: string;
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

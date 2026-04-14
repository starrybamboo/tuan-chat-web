import type { SpaceDetailTab } from "@/components/chat/chatPage.types";

import { hasHostPrivileges } from "@/components/chat/utils/memberPermissions";

const HOST_ONLY_SPACE_DETAIL_TABS = new Set<SpaceDetailTab>(["roles", "trpg", "webgal", "material"]);

export function canViewSpaceDetailTab(tab: SpaceDetailTab, memberType?: number | null): boolean {
  if (!HOST_ONLY_SPACE_DETAIL_TABS.has(tab)) {
    return true;
  }
  return hasHostPrivileges(memberType);
}

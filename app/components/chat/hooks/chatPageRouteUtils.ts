import type { SpaceDetailTab } from "@/components/chat/chatPage.types";

import { SPACE_DETAIL_TABS } from "@/components/chat/chatPage.types";
import { buildSpaceDocId, parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";

export type DocRouteInfo = {
  decodedDocId: string | null;
  activeDocId: string | null;
  isInvalidSpaceDocId: boolean;
};

export function getDocRouteInfo(params: { isDocRoute: boolean; urlMessageId?: string }): DocRouteInfo {
  if (!params.isDocRoute || typeof params.urlMessageId !== "string") {
    return {
      decodedDocId: null,
      activeDocId: null,
      isInvalidSpaceDocId: false,
    };
  }

  const decoded = decodeURIComponent(params.urlMessageId);

  if (/^\d+$/.test(decoded)) {
    const id = Number(decoded);
    if (Number.isFinite(id) && id > 0) {
      return {
        decodedDocId: decoded,
        activeDocId: buildSpaceDocId({ kind: "independent", docId: id }),
        isInvalidSpaceDocId: false,
      };
    }
  }

  const parsed = parseSpaceDocId(decoded);
  if (parsed?.kind === "independent") {
    return {
      decodedDocId: decoded,
      activeDocId: null,
      isInvalidSpaceDocId: true,
    };
  }

  return {
    decodedDocId: decoded,
    activeDocId: decoded,
    isInvalidSpaceDocId: false,
  };
}

export function parsePositiveNumber(value?: string): number | null {
  if (!value)
    return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0)
    return null;
  return numeric;
}

export function getSpaceDetailRouteTab(params: {
  isPrivateChatMode: boolean;
  urlMessageId?: string;
  urlRoomId?: string;
}): SpaceDetailTab | null {
  if (params.isPrivateChatMode || params.urlMessageId)
    return null;
  if (!params.urlRoomId)
    return null;
  const maybeTab = params.urlRoomId as SpaceDetailTab;
  return SPACE_DETAIL_TABS.has(maybeTab) ? maybeTab : null;
}

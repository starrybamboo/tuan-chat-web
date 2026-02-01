import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router";

import type { SpaceDetailTab } from "@/components/chat/chatPage.types";

import { SPACE_DETAIL_TABS } from "@/components/chat/chatPage.types";
import { buildSpaceDocId, parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";

type ChatPageRouteState = {
  urlSpaceId?: string;
  urlRoomId?: string;
  urlMessageId?: string;
  activeSpaceId: number | null;
  isPrivateChatMode: boolean;
  isDocRoute: boolean;
  activeDocId: string | null;
  activeRoomId: number | null;
  targetMessageId: number | null;
  isRoomSettingRoute: boolean;
  spaceDetailRouteTab: SpaceDetailTab | null;
  isSpaceDetailRoute: boolean;
  navigate: ReturnType<typeof useNavigate>;
};

type DocRouteInfo = {
  decodedDocId: string | null;
  activeDocId: string | null;
  isInvalidSpaceDocId: boolean;
};

function getDocRouteInfo(params: { isDocRoute: boolean; urlMessageId?: string }): DocRouteInfo {
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

function parsePositiveNumber(value?: string): number | null {
  if (!value)
    return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0)
    return null;
  return numeric;
}

function getSpaceDetailRouteTab(params: {
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

export default function useChatPageRoute(): ChatPageRouteState {
  const { spaceId: urlSpaceId, roomId: urlRoomId, messageId: urlMessageId } = useParams();
  const navigate = useNavigate();

  const activeSpaceId = parsePositiveNumber(urlSpaceId);
  const isPrivateChatMode = urlSpaceId === "private";

  const isDocRoute = !isPrivateChatMode && urlRoomId === "doc" && typeof urlMessageId === "string" && urlMessageId.length > 0;

  const docRouteInfo = useMemo<DocRouteInfo>(() => {
    return getDocRouteInfo({ isDocRoute, urlMessageId });
  }, [isDocRoute, urlMessageId]);

  const activeDocId = docRouteInfo.activeDocId;

  useEffect(() => {
    if (!isDocRoute)
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    if (!docRouteInfo.isInvalidSpaceDocId)
      return;

    toast.error("文档链接无效，已返回空间主页");
    navigate(`/chat/${activeSpaceId}`);
  }, [activeSpaceId, docRouteInfo.isInvalidSpaceDocId, isDocRoute, navigate]);

  const activeRoomId = isDocRoute ? null : parsePositiveNumber(urlRoomId);
  const targetMessageId = isDocRoute ? null : parsePositiveNumber(urlMessageId);

  const isRoomSettingRoute = !isDocRoute && urlMessageId === "setting";
  const spaceDetailRouteTab: SpaceDetailTab | null = useMemo(() => {
    return getSpaceDetailRouteTab({ isPrivateChatMode, urlMessageId, urlRoomId });
  }, [isPrivateChatMode, urlMessageId, urlRoomId]);
  const isSpaceDetailRoute = spaceDetailRouteTab != null;

  return {
    urlSpaceId,
    urlRoomId,
    urlMessageId,
    activeSpaceId,
    isPrivateChatMode,
    isDocRoute,
    activeDocId,
    activeRoomId,
    targetMessageId,
    isRoomSettingRoute,
    spaceDetailRouteTab,
    isSpaceDetailRoute,
    navigate,
  };
}

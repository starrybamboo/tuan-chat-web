import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router";

import type { SpaceDetailTab } from "@/components/chat/chatPage.types";

import { getDocRouteInfo, getSpaceDetailRouteTab, parsePositiveNumber } from "@/components/chat/hooks/chatPageRouteUtils";

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

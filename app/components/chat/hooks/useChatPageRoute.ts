import { useMatchRoute, useParams, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";
import toast from "react-hot-toast";

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
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void;
};

export default function useChatPageRoute(): ChatPageRouteState {
  const {
    spaceId: urlSpaceId,
    roomId: urlRoomId,
    messageId: urlMessageId,
    docId: urlDocId,
  } = useParams({ strict: false });
  const router = useRouter();
  const matchRoute = useMatchRoute();
  const navigate = useCallback((to: string, options?: { replace?: boolean; state?: unknown }) => {
    if (options?.replace) {
      router.history.replace(to, options.state);
      return;
    }
    router.history.push(to, options?.state);
  }, [router]);

  const activeSpaceId = parsePositiveNumber(urlSpaceId);
  const isPrivateChatMode = urlSpaceId === "private";

  const docParam = typeof urlDocId === "string" && urlDocId.length > 0
    ? urlDocId
    : (urlRoomId === "doc" ? urlMessageId : undefined);
  const isDocRoute = !isPrivateChatMode
    && typeof docParam === "string"
    && docParam.length > 0
    && (urlRoomId === "doc" || typeof urlDocId === "string");

  const docRouteInfo = useMemo(() => {
    return getDocRouteInfo({ isDocRoute, rawDocId: docParam });
  }, [docParam, isDocRoute]);

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

  const roomSettingMatch = matchRoute({ to: "/chat/$spaceId/$roomId/setting", fuzzy: false });
  const isRoomSettingRoute = !isDocRoute && (urlMessageId === "setting" || Boolean(roomSettingMatch));
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

import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router";

import type { SpaceDetailTab } from "@/components/chat/chatPage.types";

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

export default function useChatPageRoute(): ChatPageRouteState {
  const { spaceId: urlSpaceId, roomId: urlRoomId, messageId: urlMessageId } = useParams();
  const navigate = useNavigate();

  const activeSpaceId = Number(urlSpaceId) || null;
  const isPrivateChatMode = urlSpaceId === "private";

  const isDocRoute = !isPrivateChatMode && urlRoomId === "doc" && typeof urlMessageId === "string" && urlMessageId.length > 0;

  const activeDocId = useMemo(() => {
    if (!isDocRoute)
      return null;

    const decoded = decodeURIComponent(urlMessageId as string);

    if (/^\d+$/.test(decoded)) {
      const id = Number(decoded);
      if (Number.isFinite(id) && id > 0) {
        return buildSpaceDocId({ kind: "independent", docId: id });
      }
    }

    const parsed = parseSpaceDocId(decoded);
    if (parsed?.kind === "independent") {
      return null;
    }

    return decoded;
  }, [isDocRoute, urlMessageId]);

  useEffect(() => {
    if (!isDocRoute)
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;

    try {
      const decoded = decodeURIComponent(urlMessageId as string);
      const parsed = parseSpaceDocId(decoded);
      if (parsed?.kind === "independent") {
        toast.error("文档链接无效，已返回空间主页");
        navigate(`/chat/${activeSpaceId}`);
      }
    }
    catch {
      // ignore
    }
  }, [activeSpaceId, isDocRoute, navigate, urlMessageId]);

  const activeRoomId = isDocRoute ? null : (Number(urlRoomId) || null);
  const targetMessageId = isDocRoute ? null : (Number(urlMessageId) || null);

  const isRoomSettingRoute = !isDocRoute && urlMessageId === "setting";
  const spaceDetailRouteTab: SpaceDetailTab | null = (!isPrivateChatMode && !urlMessageId && (urlRoomId === "members" || urlRoomId === "workflow" || urlRoomId === "setting" || urlRoomId === "trpg"))
    ? urlRoomId
    : null;
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

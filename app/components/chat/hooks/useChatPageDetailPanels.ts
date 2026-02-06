import { useCallback, useMemo } from "react";

import type { RoomSettingState, RoomSettingTab, SpaceDetailTab } from "@/components/chat/chatPage.types";

type StoredChatIds = {
  spaceId?: number | null;
  roomId?: number | null;
};

type UseChatPageDetailPanelsParams = {
  activeSpaceId?: number | null;
  activeRoomId?: number | null;
  isPrivateChatMode: boolean;
  isRoomSettingRoute: boolean;
  spaceDetailRouteTab?: SpaceDetailTab | null;
  navigate: (to: string) => void;
  searchParam: URLSearchParams;
  storedIds: StoredChatIds;
};

type UseChatPageDetailPanelsResult = {
  roomSettingState: RoomSettingState;
  spaceDetailTab: SpaceDetailTab;
  openRoomSettingPage: (roomId: number | null, tab?: RoomSettingTab) => void;
  closeRoomSettingPage: () => void;
  openSpaceDetailPanel: (tab: SpaceDetailTab) => void;
  closeSpaceDetailPanel: () => void;
};

export default function useChatPageDetailPanels({
  activeSpaceId,
  activeRoomId,
  isPrivateChatMode,
  isRoomSettingRoute,
  spaceDetailRouteTab,
  navigate,
  searchParam,
  storedIds,
}: UseChatPageDetailPanelsParams): UseChatPageDetailPanelsResult {
  const queryWithoutTab = useCallback(() => {
    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    return qs ? `?${qs}` : "";
  }, [searchParam]);
  const queryWithTab = useCallback((tab?: RoomSettingTab) => {
    const nextSearchParams = new URLSearchParams(searchParam);
    if (tab) {
      nextSearchParams.set("tab", tab);
    }
    else {
      nextSearchParams.delete("tab");
    }
    const qs = nextSearchParams.toString();
    return qs ? `?${qs}` : "";
  }, [searchParam]);
  const blurActiveElement = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, []);

  const openRoomSettingPage = useCallback((roomId: number | null, tab?: RoomSettingTab) => {
    if (roomId == null)
      return;

    if (activeSpaceId == null)
      return;

    navigate(`/chat/${activeSpaceId}/${roomId}/setting${queryWithTab(tab)}`);
    blurActiveElement();
  }, [activeSpaceId, blurActiveElement, navigate, queryWithTab]);

  const closeRoomSettingPage = useCallback(() => {
    if (activeSpaceId == null || activeRoomId == null)
      return;

    navigate(`/chat/${activeSpaceId}/${activeRoomId}${queryWithoutTab()}`);
  }, [activeRoomId, activeSpaceId, navigate, queryWithoutTab]);

  const openSpaceDetailPanel = useCallback((tab: SpaceDetailTab) => {
    if (activeSpaceId == null || isPrivateChatMode)
      return;

    navigate(`/chat/${activeSpaceId}/${tab}${queryWithoutTab()}`);

    blurActiveElement();
  }, [activeSpaceId, blurActiveElement, isPrivateChatMode, navigate, queryWithoutTab]);

  const closeSpaceDetailPanel = useCallback(() => {
    if (activeSpaceId == null || isPrivateChatMode)
      return;

    const fallbackRoomId = storedIds.spaceId === activeSpaceId ? storedIds.roomId : null;
    const nextRoomId = (typeof fallbackRoomId === "number" && Number.isFinite(fallbackRoomId)) ? fallbackRoomId : "";
    navigate(`/chat/${activeSpaceId}/${nextRoomId}${queryWithoutTab()}`);
  }, [activeSpaceId, isPrivateChatMode, navigate, queryWithoutTab, storedIds.roomId, storedIds.spaceId]);

  const spaceDetailTab = useMemo<SpaceDetailTab>(() => {
    return spaceDetailRouteTab ?? "members";
  }, [spaceDetailRouteTab]);

  const roomSettingState = useMemo<RoomSettingState>(() => {
    if (isPrivateChatMode || !isRoomSettingRoute)
      return null;
    if (activeSpaceId == null || activeRoomId == null)
      return null;

    const urlTab = searchParam.get("tab");
    const nextTab: RoomSettingTab = urlTab === "role" || urlTab === "setting" ? urlTab : "setting";
    return { roomId: activeRoomId, tab: nextTab };
  }, [activeRoomId, activeSpaceId, isPrivateChatMode, isRoomSettingRoute, searchParam]);

  return {
    roomSettingState,
    spaceDetailTab,
    openRoomSettingPage,
    closeRoomSettingPage,
    openSpaceDetailPanel,
    closeSpaceDetailPanel,
  };
}

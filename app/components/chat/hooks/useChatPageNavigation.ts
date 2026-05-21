import type { Dispatch, SetStateAction } from "react";

import { useCallback } from "react";

import type { SelectRoomOptions } from "@/components/chat/chatPage.types";

import { buildPrivateChatRoomPath } from "@/components/chat/hooks/chatPageRouteUtils";

type StoredChatIds = {
  spaceId?: number | null;
  roomId?: number | null;
};

type UseChatPageNavigationParams = {
  activeSpaceId?: number | null;
  isOpenLeftDrawer: boolean;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  screenSize: "sm" | "md" | "lg";
  searchParam: URLSearchParams;
  setStoredChatIds: Dispatch<SetStateAction<StoredChatIds>>;
};

type UseChatPageNavigationResult = {
  handleOpenPrivate: () => void;
  setActiveRoomId: (roomId: number | null, options?: SelectRoomOptions) => void;
  setActiveSpaceId: (spaceId: number | null) => void;
};

export default function useChatPageNavigation({
  activeSpaceId,
  isOpenLeftDrawer,
  navigate,
  screenSize,
  searchParam,
  setStoredChatIds,
}: UseChatPageNavigationParams): UseChatPageNavigationResult {
  const setActiveSpaceId = useCallback((spaceId: number | null) => {
    setStoredChatIds({ spaceId, roomId: null });
    const newSearchParams = new URLSearchParams(searchParam);
    if (screenSize === "sm") {
      newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    }
    navigate(`/chat/${spaceId ?? "private"}/${""}?${newSearchParams.toString()}`);
  }, [isOpenLeftDrawer, navigate, screenSize, searchParam, setStoredChatIds]);

  const setActiveRoomId = useCallback((roomId: number | null, options?: SelectRoomOptions) => {
    setStoredChatIds({ spaceId: activeSpaceId, roomId });
    const newSearchParams = new URLSearchParams(searchParam);
    if (screenSize === "sm") {
      newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    }
    let nextPath: string;
    if (activeSpaceId == null && roomId != null) {
      nextPath = buildPrivateChatRoomPath(roomId, newSearchParams, options?.targetMessageId);
    }
    else {
      const nextRoomId = roomId ?? "";
      const messagePath = roomId && options?.targetMessageId ? `/${options.targetMessageId}` : "";
      const query = newSearchParams.toString();
      nextPath = `/chat/${activeSpaceId ?? "private"}/${nextRoomId}${messagePath}${query ? `?${query}` : ""}`;
    }
    navigate(nextPath, { replace: options?.replace });
  }, [activeSpaceId, isOpenLeftDrawer, navigate, screenSize, searchParam, setStoredChatIds]);

  const handleOpenPrivate = useCallback(() => {
    setStoredChatIds({ spaceId: null, roomId: null });
    const newSearchParams = new URLSearchParams(searchParam);
    if (screenSize === "sm") {
      newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    }
    const query = newSearchParams.toString();
    navigate(query ? `/chat/private?${query}` : "/chat/private");
  }, [isOpenLeftDrawer, navigate, screenSize, searchParam, setStoredChatIds]);

  return {
    handleOpenPrivate,
    setActiveRoomId,
    setActiveSpaceId,
  };
}

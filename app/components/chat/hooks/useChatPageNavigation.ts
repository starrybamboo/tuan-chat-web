import type { Dispatch, SetStateAction } from "react";

import { useCallback } from "react";

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
  setActiveRoomId: (roomId: number | null, options?: { replace?: boolean }) => void;
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
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    navigate(`/chat/${spaceId ?? "private"}/${""}?${newSearchParams.toString()}`);
  }, [isOpenLeftDrawer, navigate, screenSize, searchParam, setStoredChatIds]);

  const setActiveRoomId = useCallback((roomId: number | null, options?: { replace?: boolean }) => {
    setStoredChatIds({ spaceId: activeSpaceId, roomId });
    const newSearchParams = new URLSearchParams(searchParam);
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    const nextRoomId = roomId ?? "";
    navigate(`/chat/${activeSpaceId ?? "private"}/${nextRoomId}?${newSearchParams.toString()}`, { replace: options?.replace });
  }, [activeSpaceId, isOpenLeftDrawer, navigate, screenSize, searchParam, setStoredChatIds]);

  const handleOpenPrivate = useCallback(() => {
    setActiveSpaceId(null);
    setActiveRoomId(null);
    navigate("/chat/private");
  }, [navigate, setActiveRoomId, setActiveSpaceId]);

  return {
    handleOpenPrivate,
    setActiveRoomId,
    setActiveSpaceId,
  };
}

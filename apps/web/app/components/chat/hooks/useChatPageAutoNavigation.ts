import { useEffect, useLayoutEffect, useRef } from "react";

type RoomSummary = {
  roomId?: number | null;
};

type StoredChatIds = {
  spaceId?: number | null;
  roomId?: number | null;
};

type UseChatPageAutoNavigationParams = {
  activeSpaceId?: number | null;
  isDocRoute: boolean;
  isPrivateChatMode: boolean;
  isSidebarTreeReady: boolean;
  isUserSpacesFetched: boolean;
  spaces: Array<{ spaceId?: number | null }>;
  sidebarTreeFirstRoomId?: number | null;
  orderedRooms: RoomSummary[];
  rooms: RoomSummary[];
  setActiveRoomId: (roomId: number | null, options?: { replace?: boolean }) => void;
  setActiveSpaceId: (spaceId: number | null) => void;
  storedIds: StoredChatIds;
  urlRoomId?: string | null;
};

export function shouldAutoSelectFirstRoom(params: {
  activeSpaceId?: number | null;
  isDocRoute: boolean;
  isPrivateChatMode: boolean;
  urlRoomId?: string | null;
}): boolean {
  if (params.isPrivateChatMode)
    return false;
  if (params.isDocRoute)
    return false;
  if (params.activeSpaceId == null)
    return false;
  return !params.urlRoomId || params.urlRoomId === "null";
}

export default function useChatPageAutoNavigation({
  activeSpaceId,
  isDocRoute,
  isPrivateChatMode,
  isSidebarTreeReady,
  isUserSpacesFetched,
  spaces,
  sidebarTreeFirstRoomId,
  orderedRooms,
  rooms,
  setActiveRoomId,
  setActiveSpaceId,
  storedIds,
  urlRoomId,
}: UseChatPageAutoNavigationParams) {
  const hasInitPrivateChatRef = useRef(false);
  useEffect(() => {
    if (hasInitPrivateChatRef.current)
      return;
    if (!isPrivateChatMode)
      return;
    // 等空间列表拿到后再恢复“上次位置”，避免新账号误用旧账号缓存。
    if (!isUserSpacesFetched)
      return;

    const availableSpaceIds = new Set<number>(
      spaces
        .map(space => space.spaceId)
        .filter((spaceId): spaceId is number => typeof spaceId === "number" && Number.isFinite(spaceId)),
    );

    const storedSpaceId = storedIds.spaceId;
    const targetSpaceId = typeof storedSpaceId === "number" && availableSpaceIds.has(storedSpaceId)
      ? storedSpaceId
      : null;

    if (targetSpaceId != null) {
      hasInitPrivateChatRef.current = true;
      setActiveSpaceId(targetSpaceId);
      return;
    }

    const availableRoomIds = new Set<number>(
      rooms
        .map(room => room.roomId)
        .filter((roomId): roomId is number => typeof roomId === "number" && Number.isFinite(roomId)),
    );
    const storedRoomId = storedIds.roomId;
    const validStoredRoomId = typeof storedRoomId === "number" && availableRoomIds.has(storedRoomId)
      ? storedRoomId
      : null;
    const fallbackRoomId = typeof rooms[0]?.roomId === "number" ? rooms[0].roomId : null;
    const targetRoomId = validStoredRoomId ?? fallbackRoomId;

    hasInitPrivateChatRef.current = true;
    if (targetRoomId != null) {
      setActiveRoomId(targetRoomId);
    }
  }, [isPrivateChatMode, isUserSpacesFetched, rooms, setActiveRoomId, setActiveSpaceId, spaces, storedIds.roomId, storedIds.spaceId]);

  useLayoutEffect(() => {
    const shouldAutoSelect = shouldAutoSelectFirstRoom({
      activeSpaceId,
      isDocRoute,
      isPrivateChatMode,
      urlRoomId,
    });
    if (!shouldAutoSelect)
      return;
    if (!isSidebarTreeReady)
      return;

    const firstRoomId = sidebarTreeFirstRoomId ?? orderedRooms[0]?.roomId;
    if (typeof firstRoomId !== "number" || !Number.isFinite(firstRoomId))
      return;

    setActiveRoomId(firstRoomId, { replace: true });
  }, [activeSpaceId, isDocRoute, isPrivateChatMode, isSidebarTreeReady, orderedRooms, setActiveRoomId, sidebarTreeFirstRoomId, urlRoomId]);
}

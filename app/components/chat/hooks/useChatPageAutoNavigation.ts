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
  isPrivateChatMode: boolean;
  orderedRooms: RoomSummary[];
  rooms: RoomSummary[];
  setActiveRoomId: (roomId: number | null, options?: { replace?: boolean }) => void;
  setActiveSpaceId: (spaceId: number | null) => void;
  storedIds: StoredChatIds;
  urlRoomId?: string | null;
};

export default function useChatPageAutoNavigation({
  activeSpaceId,
  isPrivateChatMode,
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
    hasInitPrivateChatRef.current = true;

    const targetRoomId = storedIds.roomId ?? rooms[0]?.roomId;
    if (targetRoomId) {
      setActiveRoomId(targetRoomId);
    }
    const targetSpaceId = storedIds.spaceId;
    if (targetSpaceId) {
      setActiveSpaceId(targetSpaceId);
    }
  }, [isPrivateChatMode, rooms, setActiveRoomId, setActiveSpaceId, storedIds.roomId, storedIds.spaceId]);

  useLayoutEffect(() => {
    if (isPrivateChatMode)
      return;
    if (activeSpaceId == null)
      return;

    const isRoomIdMissingInUrl = !urlRoomId || urlRoomId === "null";
    if (!isRoomIdMissingInUrl)
      return;

    const firstRoomId = orderedRooms[0]?.roomId;
    if (typeof firstRoomId !== "number" || !Number.isFinite(firstRoomId))
      return;

    setActiveRoomId(firstRoomId, { replace: true });
  }, [activeSpaceId, isPrivateChatMode, orderedRooms, setActiveRoomId, urlRoomId]);
}

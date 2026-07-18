import { useMemo } from "react";

import { useGlobalUserId, useGlobalWebSocket } from "@/components/globalContextProvider";

import { useGetUserRoomsQuery } from "../../../../api/hooks/chatQueryHooks";
import { partitionClueFolderRooms } from "./clueRooms";

type ClueUnreadRoom = {
  extra?: unknown;
  roomId?: number | null;
  spaceId?: number | null;
}

function toUnreadCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function getFiniteRoomId(room: ClueUnreadRoom): number | null {
  return typeof room.roomId === "number" && Number.isFinite(room.roomId)
    ? room.roomId
    : null;
}

export function formatUnreadBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(Math.max(0, count));
}

export function getVisibleClueFolderUnreadCount({
  currentUserId,
  rooms,
  spaceId,
  unreadMessagesNumber,
}: {
  currentUserId?: number | null;
  rooms: readonly ClueUnreadRoom[];
  spaceId?: number | null;
  unreadMessagesNumber: Record<number, number | undefined>;
}): number {
  const roomsInSpace = typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0
    ? rooms.filter(room => room.spaceId === spaceId)
    : rooms;
  const { clueRooms } = partitionClueFolderRooms(roomsInSpace, currentUserId);

  return clueRooms.reduce((sum, room) => {
    const roomId = getFiniteRoomId(room);
    return roomId == null ? sum : sum + toUnreadCount(unreadMessagesNumber[roomId]);
  }, 0);
}

export function useVisibleClueFolderUnreadCount(spaceId?: number | null): number {
  const currentUserId = useGlobalUserId();
  const webSocketUtils = useGlobalWebSocket();
  const resolvedSpaceId = typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0
    ? spaceId
    : -1;
  const roomsQuery = useGetUserRoomsQuery(resolvedSpaceId);
  const rooms = roomsQuery.data?.data?.rooms;
  const unreadMessagesNumber = webSocketUtils.unreadMessagesNumber as Record<number, number | undefined>;

  return useMemo(() => getVisibleClueFolderUnreadCount({
    currentUserId,
    rooms: rooms ?? [],
    spaceId: resolvedSpaceId,
    unreadMessagesNumber,
  }), [currentUserId, resolvedSpaceId, rooms, unreadMessagesNumber]);
}

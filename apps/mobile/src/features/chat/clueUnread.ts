import { partitionClueFolderRooms } from "@tuanchat/domain/clue-folder";

type ClueUnreadRoom = {
  extra?: unknown;
  roomId?: number | null;
  spaceId?: number | null;
};

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

export function formatClueUnreadAccessibilityLabel(count: number): string {
  if (count <= 0) {
    return "线索，暂无未读";
  }
  if (count > 99) {
    return "线索，99 条以上未读";
  }
  return `线索，${count} 条未读`;
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

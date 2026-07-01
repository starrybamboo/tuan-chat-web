import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { SidebarTree } from "@tuanchat/domain/sidebar-tree";

import { normalizeSidebarTree } from "@tuanchat/domain/sidebar-tree";

export type RoomListItem
  = | { key: string; type: "state"; message: string; tone: "danger" | "muted"; retry?: boolean }
    | { key: string; type: "section"; categoryId: string; label: string; collapsed: boolean }
    | { key: string; type: "room"; room: Room }
    | { key: string; type: "create-room" };

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

function normalizeRoomTargetId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function buildRoomListItems(options: {
  collapsedSections: Record<string, boolean>;
  currentSpaceId: number | null;
  onCreateRoom?: () => void;
  rooms: Room[];
  roomsError?: unknown;
  roomsIsError: boolean;
  roomsIsPending: boolean;
  sidebarTree?: SidebarTree | null;
}): RoomListItem[] {
  const {
    collapsedSections,
    currentSpaceId,
    onCreateRoom,
    rooms,
    roomsError,
    roomsIsError,
    roomsIsPending,
    sidebarTree,
  } = options;
  const items: RoomListItem[] = [];

  if (roomsIsPending) {
    items.push({ key: "state:pending", type: "state", tone: "muted", message: "加载房间…" });
  }
  else if (roomsIsError) {
    items.push({
      key: "state:error",
      type: "state",
      tone: "danger",
      retry: true,
      message: getErrorMessage(roomsError, "加载房间失败"),
    });
  }
  else if (rooms.length === 0) {
    items.push({ key: "state:empty", type: "state", tone: "muted", message: "暂无房间" });
  }
  else {
    const roomById = new Map<number, Room>();
    for (const room of rooms) {
      if (typeof room.roomId === "number" && Number.isFinite(room.roomId)) {
        roomById.set(room.roomId, room);
      }
    }

    const tree = normalizeSidebarTree({
      tree: sidebarTree ?? null,
      roomsInSpace: rooms,
      docMetas: [],
      includeDocs: false,
    });

    for (const category of tree.categories) {
      const roomNodes = category.items.filter(node => node.type === "room");
      if (roomNodes.length === 0) {
        continue;
      }

      const collapsed = collapsedSections[category.categoryId] ?? Boolean(category.collapsed);
      items.push({
        key: `section:${category.categoryId}`,
        type: "section",
        categoryId: category.categoryId,
        label: category.name || "未命名",
        collapsed,
      });

      if (collapsed) {
        continue;
      }

      for (const node of roomNodes) {
        const roomId = normalizeRoomTargetId(node.targetId);
        const room = roomId == null ? null : roomById.get(roomId);
        if (!room) {
          continue;
        }
        items.push({
          key: node.nodeId || `room:${roomId}`,
          type: "room",
          room,
        });
      }
    }
  }

  if (onCreateRoom && currentSpaceId) {
    items.push({ key: "create-room", type: "create-room" });
  }

  return items;
}

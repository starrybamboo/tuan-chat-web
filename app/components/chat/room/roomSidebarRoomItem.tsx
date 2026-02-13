import type { DragEvent, MouseEvent } from "react";
import type { Room } from "../../../../api";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import RoomButton from "@/components/chat/shared/components/roomButton";
import { setSubWindowDragPayload } from "@/components/chat/utils/subWindowDragPayload";

const ROOM_DRAG_MIME = "application/x-tuanchat-room-id";
const SUB_WINDOW_DND_DEBUG = true;

function logRoomDragDebug(event: DragEvent<HTMLDivElement>, roomId: number, canEdit: boolean) {
  if (!SUB_WINDOW_DND_DEBUG) {
    return;
  }
  const types = Array.from(event.dataTransfer?.types ?? []);
  const roomMimeValue = event.dataTransfer?.getData(ROOM_DRAG_MIME) ?? "";
  const plainText = event.dataTransfer?.getData("text/plain") ?? "";
  console.warn("[SubWindowDnd][RoomDragStart]", {
    roomId,
    canEdit,
    types,
    roomMimeValue,
    plainText,
  });
}

interface RoomSidebarRoomItemProps {
  room: Room;
  roomId: number;
  nodeId: string;
  categoryId: string;
  index: number;
  canEdit: boolean;
  dragging: DraggingItem | null;
  resetDropHandled: () => void;
  setDragging: (next: DraggingItem | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  handleDrop: () => void;
  onContextMenu: (e: MouseEvent) => void;
  unreadMessageNumber?: number;
  activeRoomId: number | null;
  onSelectRoom: (roomId: number) => void;
  onCloseLeftDrawer: () => void;
}

export default function RoomSidebarRoomItem({
  room,
  roomId,
  nodeId,
  categoryId,
  index,
  canEdit,
  dragging,
  resetDropHandled,
  setDragging,
  setDropTarget,
  handleDrop,
  onContextMenu,
  unreadMessageNumber,
  activeRoomId,
  onSelectRoom,
  onCloseLeftDrawer,
}: RoomSidebarRoomItemProps) {
  const handleItemDragStart = (e: DragEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement | null;
    if (el && (el.closest("input") || el.closest("select") || el.closest("textarea"))) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = canEdit ? "move" : "copy";
    e.dataTransfer.setData(ROOM_DRAG_MIME, String(roomId));
    e.dataTransfer.setData("text/plain", `room:${roomId}`);
    setSubWindowDragPayload({ tab: "room", roomId });
    if (!canEdit) {
      logRoomDragDebug(e, roomId, canEdit);
      return;
    }
    resetDropHandled();
    logRoomDragDebug(e, roomId, canEdit);
    setDragging({
      kind: "node",
      nodeId,
      type: "room",
      fromCategoryId: categoryId,
      fromIndex: index,
    });
    setDropTarget(null);
  };

  const handleItemDragEnd = () => {
    setSubWindowDragPayload(null);
    setDragging(null);
    setDropTarget(null);
  };

  return (
    <div
      className={`flex items-center gap-1 group w-full ${canEdit ? "" : ""}`}
      data-room-id={roomId}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e);
      }}
      onDragOver={(e) => {
        if (!canEdit)
          return;
        if (!dragging || dragging.kind !== "node")
          return;
        e.preventDefault();
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const isBefore = (e.clientY - rect.top) < rect.height / 2;
        setDropTarget({ kind: "node", toCategoryId: categoryId, insertIndex: isBefore ? index : index + 1 });
      }}
      onDrop={(e) => {
        if (!canEdit)
          return;
        e.preventDefault();
        e.stopPropagation();
        handleDrop();
      }}
    >
      <RoomButton
        room={room}
        unreadMessageNumber={unreadMessageNumber}
        onclick={() => {
          onSelectRoom(roomId);
          onCloseLeftDrawer();
        }}
        isActive={activeRoomId === roomId}
        draggable
        onDragStart={handleItemDragStart}
        onDragEnd={handleItemDragEnd}
      >
      </RoomButton>
    </div>
  );
}

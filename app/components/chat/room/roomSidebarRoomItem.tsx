import type { MouseEvent } from "react";
import type { Room } from "../../../../api";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import RoomButton from "@/components/chat/shared/components/roomButton";

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
  return (
    <div
      className={`flex items-center gap-1 group w-full ${canEdit ? "" : ""}`}
      data-room-id={roomId}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e);
      }}
      draggable={canEdit}
      onDragStart={(e) => {
        if (!canEdit)
          return;
        const el = e.target as HTMLElement | null;
        if (el && (el.closest("input") || el.closest("select") || el.closest("textarea"))) {
          e.preventDefault();
          return;
        }
        resetDropHandled();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", nodeId);
        setDragging({
          kind: "node",
          nodeId,
          type: "room",
          fromCategoryId: categoryId,
          fromIndex: index,
        });
        setDropTarget(null);
      }}
      onDragEnd={() => {
        setDragging(null);
        setDropTarget(null);
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
      >
      </RoomButton>
    </div>
  );
}

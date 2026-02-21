import type { DragEvent, MouseEvent } from "react";
import type { Room } from "../../../../api";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import RoomButton from "@/components/chat/shared/components/roomButton";
import { setRoomRefDragData } from "@/components/chat/utils/roomRef";
import { setSubWindowDragPayload } from "@/components/chat/utils/subWindowDragPayload";

const ROOM_DRAG_MIME = "application/x-tuanchat-room-id";

interface RoomSidebarRoomItemProps {
  room: Room;
  roomId: number;
  activeSpaceId: number | null;
  nodeId: string;
  categoryId: string;
  categoryName: string;
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
  activeSpaceId,
  nodeId,
  categoryId,
  categoryName,
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
    // 允许“同列表内 move 排序 + 拖到聊天区 copy 发送跳转消息”。
    e.dataTransfer.effectAllowed = canEdit ? "copyMove" : "copy";
    e.dataTransfer.setData(ROOM_DRAG_MIME, String(roomId));
    e.dataTransfer.setData("text/plain", `room:${roomId}`);
    setRoomRefDragData(e.dataTransfer, {
      roomId,
      ...(activeSpaceId && activeSpaceId > 0 ? { spaceId: activeSpaceId } : {}),
      ...(room.name ? { roomName: room.name } : {}),
      ...(categoryName ? { categoryName } : {}),
    });
    setSubWindowDragPayload({ tab: "room", roomId });
    if (!canEdit) {
      return;
    }
    resetDropHandled();
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

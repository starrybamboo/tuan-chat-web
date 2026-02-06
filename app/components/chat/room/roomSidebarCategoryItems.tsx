import type { MouseEvent } from "react";
import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarLeafNode } from "./sidebarTree";
import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import RoomSidebarDocItem from "@/components/chat/room/roomSidebarDocItem";
import RoomSidebarInsertLine from "@/components/chat/room/roomSidebarInsertLine";
import RoomSidebarRoomItem from "@/components/chat/room/roomSidebarRoomItem";

interface RoomSidebarCategoryItemsProps {
  categoryId: string;
  canEdit: boolean;
  isSpaceOwner: boolean;
  items: SidebarLeafNode[];
  dragging: DraggingItem | null;
  dropTarget: DropTarget | null;
  resetDropHandled: () => void;
  setDragging: (next: DraggingItem | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  handleDrop: () => void;
  setContextMenu: (next: SidebarTreeContextMenuState) => void;
  onContextMenu: (e: MouseEvent) => void;
  docHeaderOverrides: Record<string, { title?: string; imageUrl?: string }>;
  docMetaMap: Map<string, MinimalDocMeta>;
  roomById: Map<number, Room>;
  activeSpaceId: number | null;
  activeRoomId: number | null;
  activeDocId?: string | null;
  unreadMessagesNumber: Record<number, number>;
  onSelectRoom: (roomId: number) => void;
  onSelectDoc?: (docId: string) => void;
  onCloseLeftDrawer: () => void;
}

export default function RoomSidebarCategoryItems({
  categoryId,
  canEdit,
  isSpaceOwner,
  items,
  dragging,
  dropTarget,
  resetDropHandled,
  setDragging,
  setDropTarget,
  handleDrop,
  setContextMenu,
  onContextMenu,
  docHeaderOverrides,
  docMetaMap,
  roomById,
  activeSpaceId,
  activeRoomId,
  activeDocId,
  unreadMessagesNumber,
  onSelectRoom,
  onSelectDoc,
  onCloseLeftDrawer,
}: RoomSidebarCategoryItemsProps) {
  return (
    <>
      {canEdit && dragging?.kind === "node" && dropTarget?.kind === "node" && dropTarget.toCategoryId === categoryId && dropTarget.insertIndex === 0 && (
        <RoomSidebarInsertLine className="top-0 -translate-y-1/2" />
      )}

      {items
        .filter((node) => {
          if (!isSpaceOwner && node.type === "doc")
            return false;
          return true;
        })
        .map((node, index) => {
          const nodeId = String((node as any).nodeId);

          const showInsertBefore = canEdit
            && dragging?.kind === "node"
            && dropTarget?.kind === "node"
            && dropTarget.toCategoryId === categoryId
            && dropTarget.insertIndex === index;

          if (node.type === "room") {
            const roomId = Number((node as any).targetId);
            const room = roomById.get(roomId);
            if (!room)
              return null;

            return (
              <div key={nodeId} className="relative">
                {showInsertBefore && (
                  <RoomSidebarInsertLine className="top-0 -translate-y-1/2" />
                )}

                <RoomSidebarRoomItem
                  room={room}
                  roomId={roomId}
                  nodeId={nodeId}
                  categoryId={categoryId}
                  index={index}
                  canEdit={canEdit}
                  dragging={dragging}
                  resetDropHandled={resetDropHandled}
                  setDragging={setDragging}
                  setDropTarget={setDropTarget}
                  handleDrop={handleDrop}
                  onContextMenu={onContextMenu}
                  unreadMessageNumber={unreadMessagesNumber[roomId]}
                  activeRoomId={activeRoomId}
                  onSelectRoom={onSelectRoom}
                  onCloseLeftDrawer={onCloseLeftDrawer}
                />
              </div>
            );
          }

          return (
            <div key={nodeId} className="relative">
              {showInsertBefore && (
                <RoomSidebarInsertLine className="top-0 -translate-y-1/2" />
              )}

              <RoomSidebarDocItem
                node={node}
                nodeId={nodeId}
                categoryId={categoryId}
                index={index}
                canEdit={canEdit}
                dragging={dragging}
                resetDropHandled={resetDropHandled}
                setDragging={setDragging}
                setDropTarget={setDropTarget}
                handleDrop={handleDrop}
                setContextMenu={setContextMenu}
                docHeaderOverrides={docHeaderOverrides}
                docMetaMap={docMetaMap}
                activeSpaceId={activeSpaceId}
                activeDocId={activeDocId}
                onSelectDoc={onSelectDoc}
                onCloseLeftDrawer={onCloseLeftDrawer}
              />
            </div>
          );
        })}

      {canEdit && dragging?.kind === "node" && dropTarget?.kind === "node" && dropTarget.toCategoryId === categoryId && dropTarget.insertIndex === items.length && (
        <RoomSidebarInsertLine className="bottom-0 translate-y-1/2" />
      )}
    </>
  );
}

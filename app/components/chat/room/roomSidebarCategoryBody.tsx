import type { MouseEvent } from "react";
import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarLeafNode } from "./sidebarTree";
import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import RoomSidebarAddPanel from "@/components/chat/room/roomSidebarAddPanel";
import RoomSidebarDocItem from "@/components/chat/room/roomSidebarDocItem";
import RoomSidebarRoomItem from "@/components/chat/room/roomSidebarRoomItem";

interface RoomSidebarCategoryBodyProps {
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
  isAddPanelOpen: boolean;
  pendingAddRoomId: number | null;
  setPendingAddRoomId: (next: number | null) => void;
  pendingAddDocId: string;
  setPendingAddDocId: (next: string) => void;
  addNode: (categoryId: string, node: SidebarLeafNode) => void;
  fallbackTextRooms: Room[];
  existingRoomIdsInTree: Set<number>;
  visibleDocMetas: MinimalDocMeta[];
  existingDocIdsInTree: Set<string>;
  setAddPanelCategoryId: (next: string | null) => void;
}

export default function RoomSidebarCategoryBody({
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
  isAddPanelOpen,
  pendingAddRoomId,
  setPendingAddRoomId,
  pendingAddDocId,
  setPendingAddDocId,
  addNode,
  fallbackTextRooms,
  existingRoomIdsInTree,
  visibleDocMetas,
  existingDocIdsInTree,
  setAddPanelCategoryId,
}: RoomSidebarCategoryBodyProps) {
  return (
    <div
      className={`rounded-lg border ${canEdit ? "border-base-300" : "border-transparent"} px-1 py-1 relative`}
      onDragOver={(e) => {
        if (!canEdit)
          return;
        if (!dragging)
          return;
        if (dragging.kind !== "node")
          return;
        e.preventDefault();
        e.stopPropagation();
        setDropTarget({ kind: "node", toCategoryId: categoryId, insertIndex: items.length });
      }}
      onDrop={(e) => {
        if (!canEdit)
          return;
        e.preventDefault();
        e.stopPropagation();
        handleDrop();
      }}
    >
      {canEdit && dragging?.kind === "node" && dropTarget?.kind === "node" && dropTarget.toCategoryId === categoryId && dropTarget.insertIndex === 0 && (
        <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
      )}

      {items
        .filter((node) => {
          // 闈?KP锛氶殣钘?doc 鑺傜偣锛堢洰鍓?doc 璺敱涔熶細 gate锛?
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
                  <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
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
                <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
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
        <div className="pointer-events-none absolute left-3 right-3 bottom-0 translate-y-1/2 h-0.5 bg-primary/60 rounded" />
      )}

      {isAddPanelOpen && (
        <RoomSidebarAddPanel
          categoryId={categoryId}
          isSpaceOwner={isSpaceOwner}
          pendingAddRoomId={pendingAddRoomId}
          setPendingAddRoomId={setPendingAddRoomId}
          pendingAddDocId={pendingAddDocId}
          setPendingAddDocId={setPendingAddDocId}
          addNode={addNode}
          fallbackTextRooms={fallbackTextRooms}
          existingRoomIdsInTree={existingRoomIdsInTree}
          visibleDocMetas={visibleDocMetas}
          existingDocIdsInTree={existingDocIdsInTree}
          setAddPanelCategoryId={setAddPanelCategoryId}
        />
      )}

    </div>
  );
}

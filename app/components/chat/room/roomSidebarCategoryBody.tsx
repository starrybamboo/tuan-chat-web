import type { MouseEvent } from "react";
import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarLeafNode } from "./sidebarTree";
import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import RoomSidebarAddPanel from "@/components/chat/room/roomSidebarAddPanel";
import RoomSidebarCategoryItems from "@/components/chat/room/roomSidebarCategoryItems";

interface RoomSidebarCategoryBodyProps {
  categoryId: string;
  categoryName: string;
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
  categoryName,
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
      <RoomSidebarCategoryItems
        categoryId={categoryId}
        categoryName={categoryName}
        canEdit={canEdit}
        isSpaceOwner={isSpaceOwner}
        items={items}
        dragging={dragging}
        dropTarget={dropTarget}
        resetDropHandled={resetDropHandled}
        setDragging={setDragging}
        setDropTarget={setDropTarget}
        handleDrop={handleDrop}
        setContextMenu={setContextMenu}
        onContextMenu={onContextMenu}
        docHeaderOverrides={docHeaderOverrides}
        docMetaMap={docMetaMap}
        roomById={roomById}
        activeSpaceId={activeSpaceId}
        activeRoomId={activeRoomId}
        activeDocId={activeDocId}
        unreadMessagesNumber={unreadMessagesNumber}
        onSelectRoom={onSelectRoom}
        onSelectDoc={onSelectDoc}
        onCloseLeftDrawer={onCloseLeftDrawer}
      />

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

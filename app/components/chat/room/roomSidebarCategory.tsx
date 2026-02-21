import type { DragEvent, MouseEvent } from "react";
import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarCategoryNode, SidebarLeafNode } from "./sidebarTree";
import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import RoomSidebarCategoryBody from "@/components/chat/room/roomSidebarCategoryBody";
import RoomSidebarCategoryContainer from "@/components/chat/room/roomSidebarCategoryContainer";
import RoomSidebarCategoryHeader from "@/components/chat/room/roomSidebarCategoryHeader";

interface RoomSidebarCategoryProps {
  category: SidebarCategoryNode;
  categoryIndex: number;
  canEdit: boolean;
  isSpaceOwner: boolean;
  expandedByCategoryId: Record<string, boolean> | null;
  addPanelCategoryId: string | null;
  setAddPanelCategoryId: (next: string | null) => void;
  docCopyDropCategoryId: string | null;
  handleDocCopyCategoryDragOver: (e: DragEvent, categoryId: string) => void;
  handleDocCopyCategoryDragLeave: (categoryId: string) => void;
  handleDocCopyCategoryDrop: (e: DragEvent, categoryId: string) => void;
  dragging: DraggingItem | null;
  dropTarget: DropTarget | null;
  resetDropHandled: () => void;
  setDragging: (next: DraggingItem | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  handleDrop: () => void;
  toggleCategoryExpanded: (categoryId: string) => void;
  onOpenCreateInCategory: (categoryId: string) => void;
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
  existingRoomIdsInTree: Set<number>;
  existingDocIdsInTree: Set<string>;
  pendingAddRoomId: number | null;
  setPendingAddRoomId: (next: number | null) => void;
  pendingAddDocId: string;
  setPendingAddDocId: (next: string) => void;
  addNode: (categoryId: string, node: SidebarLeafNode) => void;
  fallbackTextRooms: Room[];
  visibleDocMetas: MinimalDocMeta[];
}

export default function RoomSidebarCategory({
  category: cat,
  categoryIndex,
  canEdit,
  isSpaceOwner,
  expandedByCategoryId,
  addPanelCategoryId,
  setAddPanelCategoryId,
  docCopyDropCategoryId,
  handleDocCopyCategoryDragOver,
  handleDocCopyCategoryDragLeave,
  handleDocCopyCategoryDrop,
  dragging,
  dropTarget,
  resetDropHandled,
  setDragging,
  setDropTarget,
  handleDrop,
  toggleCategoryExpanded,
  onOpenCreateInCategory,
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
  existingRoomIdsInTree,
  existingDocIdsInTree,
  pendingAddRoomId,
  setPendingAddRoomId,
  pendingAddDocId,
  setPendingAddDocId,
  addNode,
  fallbackTextRooms,
  visibleDocMetas,
}: RoomSidebarCategoryProps) {
  const items = Array.isArray(cat.items) ? cat.items : [];
  // 默认折叠：如果本地还没加载完，则先折叠；展开状以 IndexedDB 为准?
  const isExpanded = Boolean(expandedByCategoryId?.[cat.categoryId]);
  const isCollapsed = !isExpanded;
  const isAddPanelOpen = canEdit && addPanelCategoryId === cat.categoryId;

  const showCategoryInsertLine = canEdit
    && dragging?.kind === "category"
    && dropTarget?.kind === "category"
    && dropTarget.insertIndex === categoryIndex;

  return (
    <RoomSidebarCategoryContainer
      categoryId={cat.categoryId}
      isSpaceOwner={isSpaceOwner}
      docCopyDropCategoryId={docCopyDropCategoryId}
      showCategoryInsertLine={showCategoryInsertLine}
      handleDocCopyCategoryDragOver={handleDocCopyCategoryDragOver}
      handleDocCopyCategoryDragLeave={handleDocCopyCategoryDragLeave}
      handleDocCopyCategoryDrop={handleDocCopyCategoryDrop}
    >
      <RoomSidebarCategoryHeader
        categoryId={cat.categoryId}
        categoryName={cat.name}
        categoryIndex={categoryIndex}
        canEdit={canEdit}
        isCollapsed={isCollapsed}
        itemsLength={items.length}
        dragging={dragging}
        resetDropHandled={resetDropHandled}
        setDragging={setDragging}
        setDropTarget={setDropTarget}
        handleDrop={handleDrop}
        toggleCategoryExpanded={toggleCategoryExpanded}
        onOpenCreateInCategory={onOpenCreateInCategory}
        setContextMenu={setContextMenu}
        toggleTitle={isCollapsed ? "展开" : "折叠"}
        addTitle="创建"
      />

      {!isCollapsed && (
        <RoomSidebarCategoryBody
          categoryId={cat.categoryId}
          categoryName={cat.name}
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
          isAddPanelOpen={isAddPanelOpen}
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
    </RoomSidebarCategoryContainer>
  );
}

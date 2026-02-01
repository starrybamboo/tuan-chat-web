import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";
import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { SpaceDetailTab } from "@/components/chat/space/spaceHeaderBar";

import React, { useMemo, useState } from "react";
import RoomSidebarCategory from "@/components/chat/room/roomSidebarCategory";
import useRoomSidebarAddPanelState from "@/components/chat/room/useRoomSidebarAddPanelState";
import useRoomSidebarCategoryEditor from "@/components/chat/room/useRoomSidebarCategoryEditor";
import useRoomSidebarDeleteHandlers from "@/components/chat/room/useRoomSidebarDeleteHandlers";
import useRoomSidebarDocCopy from "@/components/chat/room/useRoomSidebarDocCopy";
import useRoomSidebarDocMetas from "@/components/chat/room/useRoomSidebarDocMetas";
import useRoomSidebarDragState from "@/components/chat/room/useRoomSidebarDragState";
import useRoomSidebarDropHandler from "@/components/chat/room/useRoomSidebarDropHandler";
import useRoomSidebarNormalizer from "@/components/chat/room/useRoomSidebarNormalizer";
import useRoomSidebarTreeActions from "@/components/chat/room/useRoomSidebarTreeActions";
import useRoomSidebarTreeState from "@/components/chat/room/useRoomSidebarTreeState";
import SpaceHeaderBar from "@/components/chat/space/spaceHeaderBar";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import LeftChatList from "@/components/privateChat/LeftChatList";
import { collectExistingDocIds, collectExistingRoomIds } from "./sidebarTree";
import SidebarTreeOverlays from "./sidebarTreeOverlays";

interface ChatRoomListPanelProps {
  isPrivateChatMode: boolean;

  currentUserId?: number | null;

  activeSpaceId: number | null;
  activeSpaceName?: string;
  activeSpaceIsArchived?: boolean;
  isSpaceOwner: boolean;

  rooms: Room[];
  roomOrderIds?: number[];
  onReorderRoomIds?: (nextRoomIds: number[]) => void;

  onOpenRoomSetting?: (roomId: number, tab?: "role" | "setting") => void;

  sidebarTree?: SidebarTree | null;
  docMetas?: MinimalDocMeta[];
  onSelectDoc?: (docId: string) => void;
  onSaveSidebarTree?: (tree: SidebarTree) => void;
  onResetSidebarTreeToDefault?: () => void;
  activeRoomId: number | null;
  activeDocId?: string | null;
  unreadMessagesNumber: Record<number, number>;

  onContextMenu: (e: React.MouseEvent) => void;
  onInviteMember: () => void;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab) => void;

  onSelectRoom: (roomId: number) => void;
  onCloseLeftDrawer: () => void;
  onToggleLeftDrawer?: () => void;
  isLeftDrawerOpen?: boolean;

  setIsOpenLeftDrawer: (isOpen: boolean) => void;

  onOpenCreateInCategory: (categoryId: string) => void;
  isKPInSpace: boolean;
}

export default function ChatRoomListPanel({
  isPrivateChatMode,
  currentUserId,
  activeSpaceId,
  activeSpaceName,
  activeSpaceIsArchived,
  isSpaceOwner,
  rooms,
  roomOrderIds,
  sidebarTree,
  docMetas,
  onSelectDoc,
  onSaveSidebarTree,
  onResetSidebarTreeToDefault,
  activeRoomId,
  activeDocId,
  unreadMessagesNumber,
  onContextMenu,
  onInviteMember,
  onOpenSpaceDetailPanel,
  onSelectRoom,
  onCloseLeftDrawer,
  onToggleLeftDrawer,
  isLeftDrawerOpen,
  setIsOpenLeftDrawer,
  onOpenCreateInCategory,
}: ChatRoomListPanelProps) {
  const roomsInSpace = useMemo(() => {
    return rooms.filter(room => room.spaceId === activeSpaceId);
  }, [activeSpaceId, rooms]);

  const { visibleDocMetas, docMetaMap, appendExtraDocMeta } = useRoomSidebarDocMetas({
    activeSpaceId,
    isSpaceOwner,
    docMetas,
  });
  const docHeaderOverrides = useDocHeaderOverrideStore(state => state.headers);

  const roomById = useMemo(() => {
    const map = new Map<number, Room>();
    for (const r of roomsInSpace) {
      if (typeof r.roomId === "number") {
        map.set(r.roomId, r);
      }
    }
    return map;
  }, [roomsInSpace]);

  const orderedRoomIdsFallback = useMemo(() => {
    if (Array.isArray(roomOrderIds) && roomOrderIds.length > 0) {
      return roomOrderIds;
    }
    return roomsInSpace
      .map(r => r.roomId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [roomOrderIds, roomsInSpace]);

  const fallbackTextRooms = useMemo(() => {
    const ids = orderedRoomIdsFallback;
    if (!ids.length)
      return roomsInSpace;

    const ordered: Room[] = [];
    for (const id of ids) {
      const found = roomById.get(id);
      if (found)
        ordered.push(found);
    }
    for (const r of roomsInSpace) {
      const id = r.roomId;
      if (typeof id === "number" && !ids.includes(id)) {
        ordered.push(r);
      }
    }
    return ordered;
  }, [orderedRoomIdsFallback, roomById, roomsInSpace]);

  const canEdit = Boolean(activeSpaceId && isSpaceOwner);
  const {
    dragging,
    dropTarget,
    setDragging,
    setDropTarget,
    dropHandledRef,
    resetDropHandled,
  } = useRoomSidebarDragState();

  const {
    treeToRender,
    setLocalTree,
    expandedByCategoryId,
    toggleCategoryExpanded,
  } = useRoomSidebarTreeState({
    activeSpaceId,
    currentUserId,
    canEdit,
    isDragging: Boolean(dragging),
    sidebarTree,
    fallbackTextRooms,
    visibleDocMetas,
    isSpaceOwner,
  });

  const {
    addPanelCategoryId,
    pendingAddRoomId,
    pendingAddDocId,
    setAddPanelCategoryId,
    setPendingAddRoomId,
    setPendingAddDocId,
    toggleAddPanel,
  } = useRoomSidebarAddPanelState();

  const [contextMenu, setContextMenu] = useState<SidebarTreeContextMenuState>(null);

  const normalizeAndSet = useRoomSidebarNormalizer({
    fallbackTextRooms,
    visibleDocMetas,
    isSpaceOwner,
    docHeaderOverrides,
    docMetaMap,
    setLocalTree,
    onSaveSidebarTree,
  });

  const {
    docCopyDropCategoryId,
    handleDocCopyCategoryDragLeave,
    handleDocCopyCategoryDragOver,
    handleDocCopyCategoryDrop,
    handleDocCopyDragOverCapture,
    handleDocCopyDropCapture,
  } = useRoomSidebarDocCopy({
    activeSpaceId,
    isSpaceOwner,
    treeToRender,
    visibleDocMetas,
    appendExtraDocMeta,
    normalizeAndSet,
    isDragging: Boolean(dragging),
  });

  const { moveNode, moveCategory, removeNode, addNode } = useRoomSidebarTreeActions({
    treeToRender,
    normalizeAndSet,
  });

  const handleDrop = useRoomSidebarDropHandler({
    dragging,
    dropTarget,
    dropHandledRef,
    setDragging,
    setDropTarget,
    moveCategory,
    moveNode,
  });
  const {
    categoryEditor,
    categoryEditorError,
    openAddCategory,
    openRenameCategory,
    submitCategoryEditor,
    closeCategoryEditor,
    updateCategoryEditorName,
  } = useRoomSidebarCategoryEditor({
    treeToRender,
    normalizeAndSet,
    toggleCategoryExpanded,
    defaultCategoryName: "新分类",
    emptyNameError: "鍚嶇О涓嶈兘涓虹┖",
  });

  const {
    deleteConfirmCategoryId,
    deleteConfirmDoc,
    openDeleteConfirmCategory,
    closeDeleteConfirmCategory,
    confirmDeleteCategory,
    openDeleteConfirmDoc,
    closeDeleteConfirmDoc,
    confirmDeleteDoc,
    getDocTitle,
  } = useRoomSidebarDeleteHandlers({
    treeToRender,
    normalizeAndSet,
    activeSpaceId,
    removeNode,
    docMetaMap,
  });

  const existingRoomIdsInTree = useMemo(() => {
    return collectExistingRoomIds(treeToRender);
  }, [treeToRender]);

  const existingDocIdsInTree = useMemo(() => {
    return collectExistingDocIds(treeToRender);
  }, [treeToRender]);

  return (
    <div
      className="flex flex-col gap-2 w-full h-full flex-1 bg-base-200 min-h-0 min-w-0 rounded-tl-xl border-l border-t border-gray-300 dark:border-gray-700"
    >
      {isPrivateChatMode
        ? (
            <LeftChatList
              setIsOpenLeftDrawer={setIsOpenLeftDrawer}
            />
          )
        : (
            <>
              {activeSpaceId && (
                <>
                  <SpaceHeaderBar
                    spaceName={activeSpaceName}
                    isArchived={activeSpaceIsArchived}
                    isSpaceOwner={isSpaceOwner}
                    onOpenSpaceDetailPanel={onOpenSpaceDetailPanel}
                    onInviteMember={onInviteMember}
                    onToggleLeftDrawer={onToggleLeftDrawer}
                    isLeftDrawerOpen={isLeftDrawerOpen}
                  />
                  {/* <div className="h-px bg-base-300"></div> */}
                </>
              )}

              <div
                className="flex flex-col gap-2 py-2 px-1 overflow-auto w-full "
                onDragOverCapture={handleDocCopyDragOverCapture}
                onDropCapture={handleDocCopyDropCapture}
              >
                {canEdit && (
                  <div className="flex items-center gap-2 px-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={openAddCategory}
                    >
                      鏂板鍒嗙被
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        onResetSidebarTreeToDefault?.();
                      }}
                    >
                      閲嶇疆榛樿
                    </button>
                  </div>
                )}

                {treeToRender.categories.map((cat, categoryIndex) => (
                  <RoomSidebarCategory
                    key={cat.categoryId}
                    category={cat}
                    categoryIndex={categoryIndex}
                    canEdit={canEdit}
                    isSpaceOwner={isSpaceOwner}
                    expandedByCategoryId={expandedByCategoryId}
                    addPanelCategoryId={addPanelCategoryId}
                    setAddPanelCategoryId={setAddPanelCategoryId}
                    docCopyDropCategoryId={docCopyDropCategoryId}
                    handleDocCopyCategoryDragOver={handleDocCopyCategoryDragOver}
                    handleDocCopyCategoryDragLeave={handleDocCopyCategoryDragLeave}
                    handleDocCopyCategoryDrop={handleDocCopyCategoryDrop}
                    dragging={dragging}
                    dropTarget={dropTarget}
                    resetDropHandled={resetDropHandled}
                    setDragging={setDragging}
                    setDropTarget={setDropTarget}
                    handleDrop={handleDrop}
                    toggleCategoryExpanded={toggleCategoryExpanded}
                    onOpenCreateInCategory={onOpenCreateInCategory}
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
                    existingRoomIdsInTree={existingRoomIdsInTree}
                    existingDocIdsInTree={existingDocIdsInTree}
                    pendingAddRoomId={pendingAddRoomId}
                    setPendingAddRoomId={setPendingAddRoomId}
                    pendingAddDocId={pendingAddDocId}
                    setPendingAddDocId={setPendingAddDocId}
                    addNode={addNode}
                    fallbackTextRooms={fallbackTextRooms}
                    visibleDocMetas={visibleDocMetas}
                  />
                ))}

              </div>

              <SidebarTreeOverlays
                canEdit={canEdit}
                categoryEditor={categoryEditor}
                categoryEditorError={categoryEditorError}
                onCategoryEditorNameChange={updateCategoryEditorName}
                onCloseCategoryEditor={closeCategoryEditor}
                onSubmitCategoryEditor={submitCategoryEditor}

                deleteConfirmCategoryId={deleteConfirmCategoryId}
                treeCategoryCount={treeToRender.categories.length}
                onCloseDeleteConfirmCategory={closeDeleteConfirmCategory}
                onRequestDeleteConfirmCategory={openDeleteConfirmCategory}
                onConfirmDeleteCategory={confirmDeleteCategory}

                contextMenu={contextMenu}
                onCloseContextMenu={() => setContextMenu(null)}
                onOpenRenameCategory={(categoryId) => {
                  openRenameCategory(categoryId);
                }}
                onOpenAddPanel={toggleAddPanel}
                onOpenDoc={(docId) => {
                  onSelectDoc?.(docId);
                  onCloseLeftDrawer();
                }}
                onRequestDeleteDoc={openDeleteConfirmDoc}

                deleteConfirmDoc={deleteConfirmDoc}
                onCloseDeleteConfirmDoc={closeDeleteConfirmDoc}
                onConfirmDeleteDoc={confirmDeleteDoc}
                getDocTitle={getDocTitle}
              />
            </>
          )}
    </div>
  );
}

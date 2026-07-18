import { LayoutGroup } from "motion/react";
import React, { useEffect, useMemo, useRef } from "react";

import type { OpenSpaceDetailPanelOptions, SelectRoomOptions, SpaceDetailTab } from "@/components/chat/chatPage.types";

import { partitionClueFolderRooms } from "@/components/chat/clues/clueRooms";
import RoomSidebarCategory from "@/components/chat/room/roomSidebarCategory";
import SidebarSection from "@/components/chat/room/sidebarSection";
import usePersistedSidebarExpandedState from "@/components/chat/room/usePersistedSidebarExpandedState";
import useRoomSidebarAddPanelState from "@/components/chat/room/useRoomSidebarAddPanelState";
import useRoomSidebarCategoryEditor from "@/components/chat/room/useRoomSidebarCategoryEditor";
import useRoomSidebarContextMenu from "@/components/chat/room/useRoomSidebarContextMenu";
import useRoomSidebarDeleteHandlers from "@/components/chat/room/useRoomSidebarDeleteHandlers";
import useRoomSidebarDocCopy from "@/components/chat/room/useRoomSidebarDocCopy";
import useRoomSidebarDocMetas from "@/components/chat/room/useRoomSidebarDocMetas";
import useRoomSidebarDragState from "@/components/chat/room/useRoomSidebarDragState";
import useRoomSidebarDropHandler from "@/components/chat/room/useRoomSidebarDropHandler";
import useRoomSidebarNormalizer from "@/components/chat/room/useRoomSidebarNormalizer";
import useRoomSidebarTreeActions from "@/components/chat/room/useRoomSidebarTreeActions";
import useRoomSidebarTreeState from "@/components/chat/room/useRoomSidebarTreeState";
import SpaceHeaderBar from "@/components/chat/space/spaceHeaderBar";
import { Skeleton } from "@/components/common/StatusPrimitives";
import LeftChatList from "@/components/privateChat/LeftChatList";

import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";

import { collectExistingDocIds, collectExistingRoomIds } from "./sidebarTree";
import SidebarTreeOverlays from "./sidebarTreeOverlays";

const ROOM_DOC_SECTION_KEY = "section:room-docs";
const ROOM_DOC_SECTION_KEYS = [ROOM_DOC_SECTION_KEY];

function RoomDocTreeLoadingSkeleton() {
  return (
    <div
      className="space-y-4 px-2 py-2 text-base-content/15"
      aria-busy="true"
      aria-label="正在加载频道与文档"
    >
      {[0, 1].map(sectionIndex => (
        <div key={`room-doc-tree-skeleton-section-${sectionIndex}`} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className={sectionIndex === 0 ? "h-3.5 w-28" : "h-3.5 w-20"} />
          </div>
          <div className="space-y-1">
            {["w-10/12", "w-7/12", "w-8/12"].map((width, itemIndex) => (
              <div
                key={`room-doc-tree-skeleton-item-${sectionIndex}-${itemIndex}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
              >
                <Skeleton className="size-8 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className={`h-3.5 ${width}`} />
                  {itemIndex === 0 && <Skeleton className="h-2.5 w-5/12" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type ChatRoomListPanelProps = {
  isPrivateChatMode: boolean;

  currentUserId?: number | null;

  activeSpaceId: number | null;
  activeSpaceName?: string;
  activeSpaceIsArchived?: boolean;
  isSpaceOwner: boolean;

  rooms: Room[];
  roomOrderIds?: number[];
  onReorderRoomIds?: (nextRoomIds: number[]) => void;

  onOpenRoomSetting?: (roomId: number, tab?: "member" | "role" | "setting") => void;

  sidebarTree?: SidebarTree | null;
  isSidebarTreeReady?: boolean;
  sidebarTreeRemoteUpdateKey?: string | null;
  docMetas?: MinimalDocMeta[];
  onSelectDoc?: (docId: string) => void;
  onDeleteDoc?: (docId: string) => void;
  onSaveSidebarTree?: (tree: SidebarTree) => void;
  onResetSidebarTreeToDefault?: () => void;
  activeRoomId: number | null;
  activeDocId?: string | null;
  unreadMessagesNumber: Record<number, number>;

  onContextMenu: (e: React.MouseEvent, roomId?: number | null) => void;
  onOpenRoomContextMenu: (roomId: number, position: { x: number; y: number }) => void;
  onInviteMember: () => void;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab, options?: OpenSpaceDetailPanelOptions) => void;

  onSelectRoom: (roomId: number, options?: SelectRoomOptions) => void;
  onCloseLeftDrawer: () => void;

  setIsOpenLeftDrawer: (isOpen: boolean) => void;

  onOpenCreateInCategory: (categoryId: string) => void;
  canViewDocs: boolean;
}

export default function ChatRoomListPanel(props: ChatRoomListPanelProps) {
  const {
    isPrivateChatMode,
    currentUserId,
    activeSpaceId,
    activeSpaceName,
    activeSpaceIsArchived,
    isSpaceOwner,
    rooms,
    roomOrderIds,
    sidebarTree,
    isSidebarTreeReady = true,
    sidebarTreeRemoteUpdateKey,
    docMetas,
    onSelectDoc,
    onDeleteDoc,
    onSaveSidebarTree,
    onResetSidebarTreeToDefault,
    activeRoomId,
    activeDocId,
    unreadMessagesNumber,
    onContextMenu,
    onOpenRoomContextMenu,
    onInviteMember,
    onOpenSpaceDetailPanel,
    onSelectRoom,
    onCloseLeftDrawer,
    setIsOpenLeftDrawer,
    onOpenCreateInCategory,
    canViewDocs,
  } = props;

  const roomsInSpace = useMemo(() => {
    return rooms.filter(room => room.spaceId === activeSpaceId);
  }, [activeSpaceId, rooms]);
  const mainRoomsInSpace = useMemo(() => {
    return partitionClueFolderRooms(roomsInSpace, currentUserId).mainRooms;
  }, [currentUserId, roomsInSpace]);

  const { visibleDocMetas, docMetaMap, upsertDocMeta } = useRoomSidebarDocMetas({
    activeSpaceId,
    canViewDocs,
    docMetas,
  });

  const roomById = useMemo(() => {
    const map = new Map<number, Room>();
    for (const r of mainRoomsInSpace) {
      if (typeof r.roomId === "number") {
        map.set(r.roomId, r);
      }
    }
    return map;
  }, [mainRoomsInSpace]);

  const orderedRoomIdsFallback = useMemo(() => {
    if (Array.isArray(roomOrderIds) && roomOrderIds.length > 0) {
      return roomOrderIds;
    }
    return mainRoomsInSpace
      .map(r => r.roomId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [mainRoomsInSpace, roomOrderIds]);

  const fallbackTextRooms = useMemo(() => {
    const ids = orderedRoomIdsFallback;
    if (!ids.length)
      return mainRoomsInSpace;

    const ordered: Room[] = [];
    for (const id of ids) {
      const found = roomById.get(id);
      if (found)
        ordered.push(found);
    }
    for (const r of mainRoomsInSpace) {
      const id = r.roomId;
      if (typeof id === "number" && !ids.includes(id)) {
        ordered.push(r);
      }
    }
    return ordered;
  }, [mainRoomsInSpace, orderedRoomIdsFallback, roomById]);

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
    activeRoomId,
    activeDocId,
    fallbackTextRooms,
    visibleDocMetas,
    includeDocs: canViewDocs,
    autoExpandTriggerKey: sidebarTreeRemoteUpdateKey,
  });
  const {
    expandedByKey: expandedSidebarSections,
    setExpanded: setSidebarSectionExpanded,
    toggleExpanded: toggleSidebarSection,
  } = usePersistedSidebarExpandedState({
    activeSpaceId,
    currentUserId,
    storageScope: "sidebar-sections",
    validKeys: ROOM_DOC_SECTION_KEYS,
    initialExpandedKeys: ROOM_DOC_SECTION_KEYS,
  });
  const isRoomDocSectionExpanded = Boolean(expandedSidebarSections?.[ROOM_DOC_SECTION_KEY]);
  const activeRoomDocSectionTargetKey = activeDocId
    ? `doc:${activeDocId}`
    : (typeof activeRoomId === "number" && Number.isFinite(activeRoomId) ? `room:${activeRoomId}` : null);
  const lastAutoExpandedRoomDocSectionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sidebarTreeRemoteUpdateKey || !activeRoomDocSectionTargetKey) {
      lastAutoExpandedRoomDocSectionRef.current = null;
      return;
    }
    if (!expandedSidebarSections) {
      return;
    }
    const autoExpandIdentity = `${sidebarTreeRemoteUpdateKey}:${activeRoomDocSectionTargetKey}`;
    if (lastAutoExpandedRoomDocSectionRef.current === autoExpandIdentity) {
      return;
    }
    lastAutoExpandedRoomDocSectionRef.current = autoExpandIdentity;
    if (isRoomDocSectionExpanded) {
      return;
    }
    setSidebarSectionExpanded(ROOM_DOC_SECTION_KEY, true);
  }, [
    activeRoomDocSectionTargetKey,
    activeSpaceId,
    expandedSidebarSections,
    isRoomDocSectionExpanded,
    setSidebarSectionExpanded,
    sidebarTreeRemoteUpdateKey,
  ]);
  const {
    addPanelCategoryId,
    pendingAddRoomId,
    pendingAddDocId,
    setAddPanelCategoryId,
    setPendingAddRoomId,
    setPendingAddDocId,
    toggleAddPanel,
  } = useRoomSidebarAddPanelState();
  const { contextMenu, setContextMenu, closeContextMenu } = useRoomSidebarContextMenu();

  const normalizeAndSet = useRoomSidebarNormalizer({
    fallbackTextRooms,
    visibleDocMetas,
    isSpaceOwner,
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
    upsertDocMeta,
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
    emptyNameError: "名称不能为空",
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
    onDeleteDoc,
  });

  const existingRoomIdsInTree = useMemo(() => {
    return collectExistingRoomIds(treeToRender);
  }, [treeToRender]);

  const existingDocIdsInTree = useMemo(() => {
    return collectExistingDocIds(treeToRender);
  }, [treeToRender]);
  const shouldShowRoomDocTreeLoading = Boolean(activeSpaceId && !isSidebarTreeReady);
  const roomDocSectionContent = shouldShowRoomDocTreeLoading ? (
    <RoomDocTreeLoadingSkeleton />
  ) : (
    <div
      className="space-y-1"
      onDragOverCapture={handleDocCopyDragOverCapture}
      onDropCapture={handleDocCopyDropCapture}
    >
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
          onTriggerCategoryAdd={onOpenCreateInCategory}
          addTitle="添加"
          setContextMenu={setContextMenu}
          onContextMenu={onContextMenu}
          onOpenRoomContextMenu={onOpenRoomContextMenu}
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
  );
  const fillSectionClassName = "flex min-h-0 flex-1 flex-col";
  const roomDocSectionContentClassName = "mt-0.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden";

  return (
    <div
      className="
        flex flex-col gap-2 size-full flex-1 bg-base-200 min-h-0 min-w-0
        rounded-tl-xl border-l border-t border-base-300
        dark:border-base-300
      "
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
                      onCloseLeftDrawer={onCloseLeftDrawer}
                      onAddCategory={canEdit ? openAddCategory : undefined}
                      onResetSidebarTreeToDefault={canEdit ? onResetSidebarTreeToDefault : undefined}
                      onInviteMember={onInviteMember}
                    />
                    {/* <div className="h-px bg-base-300"></div> */}
                  </>
                )}

                <div className="flex min-h-0 flex-1 flex-col py-1.5">
                  <div className="
                    flex w-full min-h-0 flex-1 flex-col overflow-hidden px-1
                  ">
                    <LayoutGroup id="chat-room-sidebar-active-cursor">
                      <SidebarSection
                        title="频道与文档"
                        isExpanded={isRoomDocSectionExpanded}
                        onToggleExpanded={() => toggleSidebarSection(ROOM_DOC_SECTION_KEY)}
                        actionTitle={canEdit ? "新增分类" : undefined}
                        onAction={canEdit ? openAddCategory : undefined}
                        className={fillSectionClassName}
                        contentClassName={roomDocSectionContentClassName}
                        fillContent
                      >
                        {roomDocSectionContent}
                      </SidebarSection>
                    </LayoutGroup>
                  </div>
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
                  onCloseContextMenu={closeContextMenu}
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

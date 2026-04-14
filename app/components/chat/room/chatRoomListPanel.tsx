import type { Room } from "../../../../api";
import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";
import type { ActiveMaterialSelection, OpenSpaceDetailPanelOptions, SpaceDetailTab } from "@/components/chat/chatPage.types";

import { PackageIcon } from "@phosphor-icons/react";
import React, { useMemo, useState } from "react";
import RoomSidebarCategory from "@/components/chat/room/roomSidebarCategory";
import RoomSidebarMaterialPackageItem from "@/components/chat/room/roomSidebarMaterialPackageItem";
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
import useRoomSidebarSplitLayout, { ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT } from "@/components/chat/room/useRoomSidebarSplitLayout";
import useRoomSidebarTreeActions from "@/components/chat/room/useRoomSidebarTreeActions";
import useRoomSidebarTreeState from "@/components/chat/room/useRoomSidebarTreeState";
import SpaceHeaderBar from "@/components/chat/space/spaceHeaderBar";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import MaterialPackageImportModal from "@/components/material/components/materialPackageImportModal";
import { useMaterialEditorActionStore } from "@/components/material/stores/materialEditorActionStore";
import LeftChatList from "@/components/privateChat/LeftChatList";
import { buildMaterialSidebarTree, collectMaterialExpandableKeys } from "./materialSidebarTree";
import { collectExistingDocIds, collectExistingRoomIds } from "./sidebarTree";
import SidebarTreeOverlays from "./sidebarTreeOverlays";

const ROOM_DOC_SECTION_KEY = "section:room-docs";
const MATERIAL_SECTION_KEY = "section:materials";

export function shouldShowRoomSidebarSplitLayout(params: {
  canViewMaterialSection: boolean;
  hasMaterialPackages: boolean;
  isRoomDocSectionExpanded: boolean;
  isMaterialSectionExpanded: boolean;
}) {
  return params.canViewMaterialSection
    && params.hasMaterialPackages
    && params.isRoomDocSectionExpanded
    && params.isMaterialSectionExpanded;
}

export function shouldStretchRoomSidebarMaterialSection(params: {
  hasMaterialPackages: boolean;
  isMaterialSectionExpanded: boolean;
}) {
  return params.hasMaterialPackages && params.isMaterialSectionExpanded;
}

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
  materialPackages?: SpaceMaterialPackageResponse[];
  onSelectDoc?: (docId: string) => void;
  onDeleteDoc?: (docId: string) => void;
  onSaveSidebarTree?: (tree: SidebarTree) => void;
  onResetSidebarTreeToDefault?: () => void;
  activeRoomId: number | null;
  activeDocId?: string | null;
  activeMaterialSelection?: ActiveMaterialSelection;
  unreadMessagesNumber: Record<number, number>;

  onContextMenu: (e: React.MouseEvent, roomId?: number | null) => void;
  onInviteMember: () => void;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab, options?: OpenSpaceDetailPanelOptions) => void;

  onSelectRoom: (roomId: number) => void;
  onCloseLeftDrawer: () => void;
  onToggleLeftDrawer?: () => void;
  isLeftDrawerOpen?: boolean;

  setIsOpenLeftDrawer: (isOpen: boolean) => void;

  onOpenCreateInCategory: (categoryId: string) => void;
  isKPInSpace: boolean;
  canViewDocs: boolean;
}

export default function ChatRoomListPanel({
  isPrivateChatMode,
  currentUserId,
  activeSpaceId,
  activeSpaceName,
  activeSpaceIsArchived,
  isSpaceOwner,
  isKPInSpace,
  rooms,
  roomOrderIds,
  sidebarTree,
  docMetas,
  materialPackages,
  onSelectDoc,
  onDeleteDoc,
  onSaveSidebarTree,
  onResetSidebarTreeToDefault,
  activeRoomId,
  activeDocId,
  activeMaterialSelection,
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
  canViewDocs,
}: ChatRoomListPanelProps) {
  const roomsInSpace = useMemo(() => {
    return rooms.filter(room => room.spaceId === activeSpaceId);
  }, [activeSpaceId, rooms]);

  const { visibleDocMetas, docMetaMap, appendExtraDocMeta } = useRoomSidebarDocMetas({
    activeSpaceId,
    canViewDocs,
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

  const materialSidebarPackages = useMemo(() => {
    return (materialPackages ?? []).filter((item) => {
      return typeof item.spacePackageId === "number" && Number.isFinite(item.spacePackageId);
    });
  }, [materialPackages]);

  const materialTreeExpandableKeys = useMemo(() => {
    const keys: string[] = [];
    for (const item of materialSidebarPackages) {
      const spacePackageId = item.spacePackageId as number;
      keys.push(`material-package:${spacePackageId}`);
      keys.push(...collectMaterialExpandableKeys(buildMaterialSidebarTree({
        spacePackageId,
        nodes: item.content?.root,
      })));
    }
    return keys;
  }, [materialSidebarPackages]);

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
    includeDocs: canViewDocs,
  });
  const {
    expandedByKey: expandedSidebarSections,
    toggleExpanded: toggleSidebarSection,
  } = usePersistedSidebarExpandedState({
    activeSpaceId,
    currentUserId,
    storageScope: "sidebar-sections",
    validKeys: [ROOM_DOC_SECTION_KEY, MATERIAL_SECTION_KEY],
    initialExpandedKeys: [ROOM_DOC_SECTION_KEY, MATERIAL_SECTION_KEY],
  });
  const {
    expandedByKey: materialExpandedByKey,
    toggleExpanded: toggleMaterialExpanded,
  } = usePersistedSidebarExpandedState({
    activeSpaceId,
    currentUserId,
    storageScope: "material-tree",
    validKeys: materialTreeExpandableKeys,
  });
  const isRoomDocSectionExpanded = Boolean(expandedSidebarSections?.[ROOM_DOC_SECTION_KEY]);
  const canViewMaterialSection = isKPInSpace;
  const hasMaterialSidebarPackages = materialSidebarPackages.length > 0;
  const isMaterialSectionExpanded = canViewMaterialSection && Boolean(expandedSidebarSections?.[MATERIAL_SECTION_KEY]);
  const showSidebarSplitLayout = shouldShowRoomSidebarSplitLayout({
    canViewMaterialSection,
    hasMaterialPackages: hasMaterialSidebarPackages,
    isRoomDocSectionExpanded,
    isMaterialSectionExpanded,
  });
  const stretchMaterialSection = shouldStretchRoomSidebarMaterialSection({
    hasMaterialPackages: hasMaterialSidebarPackages,
    isMaterialSectionExpanded,
  });
  const activeMaterialController = useMaterialEditorActionStore((state) => {
    const scope = activeMaterialSelection?.scope;
    return scope ? state.controllers[scope] : undefined;
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
  const [isMaterialImportOpen, setIsMaterialImportOpen] = useState(false);

  const { contextMenu, setContextMenu, closeContextMenu } = useRoomSidebarContextMenu();

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
  const roomDocSectionContent = (
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
  );
  const materialSectionContent = (
    <div className="space-y-1 px-1">
      {materialSidebarPackages.length > 0
        ? materialSidebarPackages.map((item) => {
            const currentMaterialController = activeMaterialController?.packageId === item.spacePackageId
              ? activeMaterialController
              : null;

            return (
              <RoomSidebarMaterialPackageItem
                key={item.spacePackageId}
                materialPackageId={item.spacePackageId as number}
                materialPackage={item}
                isActivePackage={activeMaterialSelection?.spacePackageId === item.spacePackageId}
                activeNodePathKey={activeMaterialSelection?.spacePackageId === item.spacePackageId
                  ? activeMaterialSelection?.materialPathKey
                  : null}
                onCreateFolderAtRoot={currentMaterialController
                  ? () => currentMaterialController.addFolder()
                  : undefined}
                onCreateMaterialAtRoot={currentMaterialController
                  ? () => currentMaterialController.addMaterial()
                  : undefined}
                onCreateFolderAtNode={currentMaterialController
                  ? materialPathKey => currentMaterialController.addFolder(materialPathKey)
                  : undefined}
                onCreateMaterialAtNode={currentMaterialController
                  ? materialPathKey => currentMaterialController.addMaterial(materialPathKey)
                  : undefined}
                expandedState={materialExpandedByKey}
                onToggleExpanded={toggleMaterialExpanded}
                onOpenPackageDetail={() => {
                  onOpenSpaceDetailPanel("material", {
                    spacePackageId: item.spacePackageId as number,
                  });
                  onCloseLeftDrawer();
                }}
                onOpenNodeDetail={(materialPathKey) => {
                  onOpenSpaceDetailPanel("material", {
                    spacePackageId: item.spacePackageId as number,
                    materialPathKey,
                  });
                  onCloseLeftDrawer();
                }}
              />
            );
          })
        : (
            <div className="px-3 py-2 text-xs text-base-content/45">
              当前空间还没有导入素材包
            </div>
          )}
    </div>
  );
  const {
    containerRef: splitContainerRef,
    isDragging: isDraggingSplitHandle,
    topPaneStyle,
    handlePointerDown: handleSplitPointerDown,
    handleKeyDown: handleSplitKeyDown,
    resetSplitRatio,
  } = useRoomSidebarSplitLayout({
    activeSpaceId,
    currentUserId,
    enabled: showSidebarSplitLayout,
  });
  const fillSectionClassName = "flex min-h-0 flex-1 flex-col";
  const fillSectionContentClassName = "min-h-0 flex-1 overflow-y-auto overflow-x-hidden";
  const handleOpenMaterialDetail = () => {
    onOpenSpaceDetailPanel("material");
    onCloseLeftDrawer();
  };

  return (
    <>
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
                      onCloseLeftDrawer={onCloseLeftDrawer}
                      onAddCategory={canEdit ? openAddCategory : undefined}
                      onResetSidebarTreeToDefault={canEdit ? onResetSidebarTreeToDefault : undefined}
                      onInviteMember={onInviteMember}
                      onToggleLeftDrawer={onToggleLeftDrawer}
                      isLeftDrawerOpen={isLeftDrawerOpen}
                    />
                    {/* <div className="h-px bg-base-300"></div> */}
                  </>
                )}

                <div
                  className="flex min-h-0 flex-1 flex-col py-1.5"
                >
                  {showSidebarSplitLayout
                    ? (
                        <div ref={splitContainerRef} className="flex min-h-0 flex-1 flex-col px-1">
                          <div className="min-h-0 shrink-0" style={topPaneStyle}>
                            <SidebarSection
                              title="频道与文档"
                              isExpanded={isRoomDocSectionExpanded}
                              onToggleExpanded={() => toggleSidebarSection(ROOM_DOC_SECTION_KEY)}
                              className="flex h-full min-h-0 flex-col"
                              contentClassName="mt-0.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
                            >
                              {roomDocSectionContent}
                            </SidebarSection>
                          </div>

                          <button
                            type="button"
                            className={`group mx-2 my-0.5 flex items-center justify-center rounded-md cursor-row-resize touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isDraggingSplitHandle ? "bg-base-300/80" : "hover:bg-base-300/55"}`}
                            style={{ height: ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT }}
                            aria-label="调整侧边栏分栏高度"
                            title="拖拽调整“频道与文档”和“素材包”的高度分配"
                            onPointerDown={handleSplitPointerDown}
                            onKeyDown={handleSplitKeyDown}
                            onDoubleClick={resetSplitRatio}
                          >
                            <div className={`h-px w-full transition-colors ${isDraggingSplitHandle ? "bg-primary/45" : "bg-base-300/80 group-hover:bg-base-content/28"}`}></div>
                          </button>

                          {canViewMaterialSection && (
                            <div className="min-h-0 flex-1">
                              <SidebarSection
                                title="素材包"
                                isExpanded={isMaterialSectionExpanded}
                                onToggleExpanded={() => toggleSidebarSection(MATERIAL_SECTION_KEY)}
                                actionTitle="局内素材包"
                                onAction={handleOpenMaterialDetail}
                                actionIcon={<PackageIcon className="size-4" weight="regular" />}
                                className="flex h-full min-h-0 flex-col"
                                contentClassName="mt-0.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
                              >
                                {materialSectionContent}
                              </SidebarSection>
                            </div>
                          )}
                        </div>
                      )
                    : (
                        <div className="flex w-full min-h-0 flex-1 flex-col gap-0.5 overflow-hidden px-1">
                          <SidebarSection
                            title="频道与文档"
                            isExpanded={isRoomDocSectionExpanded}
                            onToggleExpanded={() => toggleSidebarSection(ROOM_DOC_SECTION_KEY)}
                            className={isRoomDocSectionExpanded ? fillSectionClassName : undefined}
                            contentClassName={isRoomDocSectionExpanded ? fillSectionContentClassName : undefined}
                          >
                            {roomDocSectionContent}
                          </SidebarSection>

                          {canViewMaterialSection && (
                            <SidebarSection
                              title="素材包"
                              isExpanded={isMaterialSectionExpanded}
                              onToggleExpanded={() => toggleSidebarSection(MATERIAL_SECTION_KEY)}
                              withDivider
                              actionTitle="局内素材包"
                              onAction={handleOpenMaterialDetail}
                              actionIcon={<PackageIcon className="size-4" weight="regular" />}
                              className={stretchMaterialSection ? fillSectionClassName : (isMaterialSectionExpanded ? undefined : "mt-auto")}
                              contentClassName={stretchMaterialSection ? fillSectionContentClassName : undefined}
                            >
                              {materialSectionContent}
                            </SidebarSection>
                          )}
                        </div>
                      )}
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

      {activeSpaceId && activeSpaceId > 0 && (
        <MaterialPackageImportModal
          isOpen={isMaterialImportOpen}
          spaceId={activeSpaceId}
          onClose={() => setIsMaterialImportOpen(false)}
        />
      )}
    </>
  );
}

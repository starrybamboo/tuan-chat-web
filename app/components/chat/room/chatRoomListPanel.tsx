import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";
import type { CategoryEditorState, DeleteConfirmDocState, SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { SpaceDetailTab } from "@/components/chat/space/spaceHeaderBar";

import { FileTextIcon } from "@phosphor-icons/react";
import React, { useCallback, useMemo, useState } from "react";
import { deleteSpaceDoc } from "@/components/chat/infra/blocksuite/deleteSpaceDoc";
import useRoomSidebarDocCopy from "@/components/chat/room/useRoomSidebarDocCopy";
import useRoomSidebarDocMetas from "@/components/chat/room/useRoomSidebarDocMetas";
import useRoomSidebarDragState from "@/components/chat/room/useRoomSidebarDragState";
import useRoomSidebarDropHandler from "@/components/chat/room/useRoomSidebarDropHandler";
import useRoomSidebarTreeActions from "@/components/chat/room/useRoomSidebarTreeActions";
import useRoomSidebarTreeState from "@/components/chat/room/useRoomSidebarTreeState";
import RoomButton from "@/components/chat/shared/components/roomButton";
import SpaceHeaderBar from "@/components/chat/space/spaceHeaderBar";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { setDocRefDragData } from "@/components/chat/utils/docRef";
import LeftChatList from "@/components/privateChat/LeftChatList";
import { AddIcon, ChevronDown } from "@/icons";
import { normalizeSidebarTree } from "./sidebarTree";
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

  const [addPanelCategoryId, setAddPanelCategoryId] = useState<string | null>(null);
  const [pendingAddRoomId, setPendingAddRoomId] = useState<number | null>(null);
  const [pendingAddDocId, setPendingAddDocId] = useState<string>("");

  const [categoryEditor, setCategoryEditor] = useState<CategoryEditorState | null>(null);
  const [categoryEditorError, setCategoryEditorError] = useState<string>("");
  const [deleteConfirmCategoryId, setDeleteConfirmCategoryId] = useState<string | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DeleteConfirmDocState | null>(null);

  const [contextMenu, setContextMenu] = useState<SidebarTreeContextMenuState>(null);

  const normalizeAndSet = useCallback((next: SidebarTree, save: boolean, options?: { docMetasOverride?: MinimalDocMeta[] }) => {
    const normalized = normalizeSidebarTree({
      tree: next,
      roomsInSpace: fallbackTextRooms,
      docMetas: options?.docMetasOverride ?? visibleDocMetas,
      includeDocs: isSpaceOwner,
    });

    // 鏂囨。缂撳瓨锛氭妸 title/cover 鍐欏叆 sidebarTree 鑺傜偣锛堟寔涔呭寲鍒板悗绔級锛岃棣栧睆浼樺厛灞曠ず缂撳瓨锛岃€屼笉鏄瓑寰?meta/缃戠粶鍔犺浇銆?
    const normalizedWithCache = (() => {
      const base = JSON.parse(JSON.stringify(normalized)) as SidebarTree;
      for (const cat of base.categories ?? []) {
        for (const node of cat.items ?? []) {
          if (node?.type !== "doc")
            continue;

          const docId = typeof node.targetId === "string" ? node.targetId : "";
          if (!docId)
            continue;

          const meta = docMetaMap.get(docId);
          const override = docHeaderOverrides[docId];

          const overrideTitle = typeof override?.title === "string" ? override.title.trim() : "";
          const overrideImageUrl = typeof override?.imageUrl === "string" ? override.imageUrl.trim() : "";

          const metaTitle = typeof meta?.title === "string" ? meta.title.trim() : "";
          const metaImageUrl = typeof meta?.imageUrl === "string" ? meta.imageUrl.trim() : "";

          const currentFallbackTitle = typeof (node as any)?.fallbackTitle === "string" ? String((node as any).fallbackTitle).trim() : "";
          const currentFallbackImageUrl = typeof (node as any)?.fallbackImageUrl === "string" ? String((node as any).fallbackImageUrl).trim() : "";

          const nextTitle = overrideTitle || metaTitle || currentFallbackTitle || docId;
          const nextImageUrl = overrideImageUrl || metaImageUrl || currentFallbackImageUrl;

          (node as any).fallbackTitle = nextTitle;
          if (nextImageUrl) {
            (node as any).fallbackImageUrl = nextImageUrl;
          }
          else {
            delete (node as any).fallbackImageUrl;
          }
        }
      }
      return base;
    })();

    setLocalTree(normalizedWithCache);
    if (save) {
      onSaveSidebarTree?.(normalizedWithCache);
    }
  }, [docHeaderOverrides, docMetaMap, fallbackTextRooms, isSpaceOwner, onSaveSidebarTree, visibleDocMetas, setLocalTree]);

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

  const openAddCategory = useCallback(() => {
    setCategoryEditor({ mode: "add", name: "新分类" });
    setCategoryEditorError("");
  }, []);

  const openRenameCategory = useCallback((categoryId: string) => {
    const current = treeToRender.categories.find(c => c.categoryId === categoryId);
    if (!current)
      return;
    setCategoryEditor({ mode: "rename", categoryId, name: current.name ?? "" });
    setCategoryEditorError("");
  }, [treeToRender.categories]);

  const submitCategoryEditor = useCallback(() => {
    if (!categoryEditor)
      return;
    const name = categoryEditor.name.trim();
    if (!name) {
      setCategoryEditorError("鍚嶇О涓嶈兘涓虹┖");
      return;
    }
    const base = treeToRender;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    let newCategoryId: string | null = null;
    if (categoryEditor.mode === "add") {
      next.categories.push({
        categoryId: (newCategoryId = `cat:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`),
        name,
        items: [],
      });
    }
    else {
      const cat = next.categories.find(c => c.categoryId === categoryEditor.categoryId);
      if (!cat)
        return;
      cat.name = name;
    }
    normalizeAndSet(next, true);
    setCategoryEditor(null);
    setCategoryEditorError("");

    // 鏂板鍒嗙被榛樿灞曞紑锛岄伩鍏嶁€滅偣涓€涓嬪睍寮€鍙堟敹鍥炩€濈殑浣撻獙銆?
    if (newCategoryId) {
      toggleCategoryExpanded(newCategoryId);
    }
  }, [categoryEditor, normalizeAndSet, toggleCategoryExpanded, treeToRender]);

  const deleteCategoryCore = useCallback((categoryId: string) => {
    const base = treeToRender;
    const idx = base.categories.findIndex(c => c.categoryId === categoryId);
    if (idx === -1)
      return;
    if (base.categories.length <= 1)
      return;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const [removed] = next.categories.splice(idx, 1);
    if (!removed)
      return;
    const targetIdx = Math.max(0, Math.min(idx - 1, next.categories.length - 1));
    const target = next.categories[targetIdx];
    if (target) {
      target.items.push(...(removed.items ?? []));
    }
    normalizeAndSet(next, true);
  }, [normalizeAndSet, treeToRender]);

  const existingRoomIdsInTree = useMemo(() => {
    const ids = new Set<number>();
    for (const cat of treeToRender.categories) {
      for (const item of cat.items ?? []) {
        if (item.type === "room" && typeof (item as any).targetId === "number") {
          ids.add((item as any).targetId);
        }
      }
    }
    return ids;
  }, [treeToRender.categories]);

  const existingDocIdsInTree = useMemo(() => {
    const ids = new Set<string>();
    for (const cat of treeToRender.categories) {
      for (const item of cat.items ?? []) {
        if (item.type === "doc" && typeof (item as any).targetId === "string") {
          ids.add((item as any).targetId);
        }
      }
    }
    return ids;
  }, [treeToRender.categories]);

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

                {treeToRender.categories.map((cat, categoryIndex) => {
                  const items = Array.isArray(cat.items) ? cat.items : [];
                  // 榛樿鎶樺彔锛氬鏋滄湰鍦拌繕娌″姞杞藉畬锛屽垯鍏堟姌鍙狅紱灞曞紑鐘舵€佷互 IndexedDB 涓哄噯銆?
                  const isExpanded = Boolean(expandedByCategoryId?.[cat.categoryId]);
                  const isCollapsed = !isExpanded;
                  const isAddPanelOpen = canEdit && addPanelCategoryId === cat.categoryId;

                  const showCategoryInsertLine = canEdit
                    && dragging?.kind === "category"
                    && dropTarget?.kind === "category"
                    && dropTarget.insertIndex === categoryIndex;

                  return (
                    <div
                      key={cat.categoryId}
                      data-tc-sidebar-category={cat.categoryId}
                      className={`px-1 relative ${docCopyDropCategoryId === cat.categoryId ? "outline outline-2 outline-primary/50 rounded-lg" : ""}`}
                      onDragOver={e => handleDocCopyCategoryDragOver(e, cat.categoryId)}
                      onDragLeave={() => handleDocCopyCategoryDragLeave(cat.categoryId)}
                      onDrop={e => handleDocCopyCategoryDrop(e, cat.categoryId)}
                    >
                      {showCategoryInsertLine && (
                        <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
                      )}

                      {docCopyDropCategoryId === cat.categoryId && (
                        <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-primary/60 bg-primary/5 flex items-center justify-center">
                          <div className="px-3 py-2 rounded bg-base-100/80 border border-primary/20 text-xs font-medium text-primary shadow-sm">
                            {isSpaceOwner ? "松开复制到侧边栏" : "仅KP可复制到侧边栏"}
                          </div>
                        </div>
                      )}

                      <div
                        className="flex items-center gap-2 px-2 py-1 text-xs font-medium opacity-80 select-none rounded-lg hover:bg-base-300/40"
                        draggable={canEdit}
                        onDragStart={(e) => {
                          if (!canEdit)
                            return;
                          // 閬垮厤浠庤緭鍏ユ帶浠惰Е鍙戞嫋鎷?
                          const el = e.target as HTMLElement | null;
                          if (el && (el.closest("input") || el.closest("select") || el.closest("textarea") || el.closest("button"))) {
                            e.preventDefault();
                            return;
                          }
                          resetDropHandled();
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", `category:${cat.categoryId}`);
                          setDragging({ kind: "category", fromIndex: categoryIndex, categoryId: cat.categoryId });
                          setDropTarget(null);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setDropTarget(null);
                        }}
                        onContextMenu={(e) => {
                          // 鍒嗙被鎿嶄綔锛氱敤鍙抽敭鏇夸唬鍘熸潵鐨勪笅鎷夎彍鍗?
                          if (!canEdit)
                            return;
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            kind: "category",
                            x: e.clientX,
                            y: e.clientY,
                            categoryId: cat.categoryId,
                          });
                        }}
                        onDragOver={(e) => {
                          if (!canEdit)
                            return;
                          if (!dragging)
                            return;
                          e.preventDefault();
                          e.stopPropagation();

                          if (dragging.kind === "category") {
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const isBefore = (e.clientY - rect.top) < rect.height / 2;
                            const insertIndex = isBefore ? categoryIndex : categoryIndex + 1;
                            setDropTarget({ kind: "category", insertIndex });
                            return;
                          }

                          // node: drop 鍒板垎绫诲ご閮?-> 杩藉姞鍒版湯灏?
                          setDropTarget({ kind: "node", toCategoryId: cat.categoryId, insertIndex: items.length });
                        }}
                        onDrop={(e) => {
                          if (!canEdit)
                            return;
                          e.preventDefault();
                          e.stopPropagation();
                          handleDrop();
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            toggleCategoryExpanded(cat.categoryId);
                          }}
                          title={isCollapsed ? "灞曞紑" : "鎶樺彔"}
                        >
                          <ChevronDown className={`size-4 opacity-80 ${isCollapsed ? "-rotate-90" : ""}`} />
                        </button>

                        <span className="flex-1 truncate">{cat.name}</span>

                        {canEdit && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            title="创建…"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenCreateInCategory(cat.categoryId);
                            }}
                          >
                            <AddIcon />
                          </button>
                        )}

                        {/* 鍒嗙被鐨勫脊鍑烘搷浣滆彍鍗曞凡鏀逛负鍙抽敭瑙﹀彂 */}
                      </div>

                      {!isCollapsed && (
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
                            setDropTarget({ kind: "node", toCategoryId: cat.categoryId, insertIndex: items.length });
                          }}
                          onDrop={(e) => {
                            if (!canEdit)
                              return;
                            e.preventDefault();
                            e.stopPropagation();
                            handleDrop();
                          }}
                        >
                          {canEdit && dragging?.kind === "node" && dropTarget?.kind === "node" && dropTarget.toCategoryId === cat.categoryId && dropTarget.insertIndex === 0 && (
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
                              const isRoom = node.type === "room";
                              const docId = isRoom ? "" : String((node as any).targetId);
                              const docOverride = !isRoom ? docHeaderOverrides[docId] : undefined;
                              const docOverrideTitle = typeof docOverride?.title === "string" ? docOverride.title.trim() : "";
                              const docOverrideImageUrl = typeof docOverride?.imageUrl === "string" ? docOverride.imageUrl.trim() : "";
                              const docFallbackImageUrl = !isRoom && typeof (node as any)?.fallbackImageUrl === "string"
                                ? String((node as any).fallbackImageUrl).trim()
                                : "";

                              const title = isRoom
                                ? (roomById.get(Number((node as any).targetId))?.name ?? (node as any)?.fallbackTitle ?? String((node as any).targetId))
                                : (docOverrideTitle || (docMetaMap.get(docId)?.title ?? (node as any)?.fallbackTitle ?? docId));

                              const coverUrl = !isRoom ? (docOverrideImageUrl || docFallbackImageUrl) : "";

                              const showInsertBefore = canEdit
                                && dragging?.kind === "node"
                                && dropTarget?.kind === "node"
                                && dropTarget.toCategoryId === cat.categoryId
                                && dropTarget.insertIndex === index;

                              return (
                                <div key={(node as any).nodeId} className="relative">
                                  {showInsertBefore && (
                                    <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
                                  )}

                                  {node.type === "room"
                                    ? (() => {
                                        const rid = Number((node as any).targetId);
                                        const room = roomById.get(rid);
                                        if (!room)
                                          return null;

                                        return (
                                          <div
                                            className={`flex items-center gap-1 group w-full ${canEdit ? "" : ""}`}
                                            data-room-id={rid}
                                            onContextMenu={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              // 鎴块棿鍙抽敭鑿滃崟锛氱粺涓€浣跨敤 ChatPageContextMenu
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
                                              e.dataTransfer.setData("text/plain", String(node.nodeId));
                                              setDragging({
                                                kind: "node",
                                                nodeId: String(node.nodeId),
                                                type: "room",
                                                fromCategoryId: cat.categoryId,
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
                                              setDropTarget({ kind: "node", toCategoryId: cat.categoryId, insertIndex: isBefore ? index : index + 1 });
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
                                              unreadMessageNumber={unreadMessagesNumber[rid]}
                                              onclick={() => {
                                                onSelectRoom(rid);
                                                onCloseLeftDrawer();
                                              }}
                                              isActive={activeRoomId === rid}
                                            >
                                              {/* 鎴块棿鐨勫脊鍑烘搷浣滆彍鍗曞凡鏀逛负鍙抽敭瑙﹀彂 */}
                                            </RoomButton>
                                          </div>
                                        );
                                      })()
                                    : (
                                        <div
                                          className={`group relative font-bold text-sm rounded-lg p-1 pr-10 flex justify-start items-center gap-2 w-full min-w-0 ${activeDocId === String((node as any).targetId) ? "bg-info-content/10" : "hover:bg-base-300"}`}
                                          role="button"
                                          tabIndex={0}
                                          aria-pressed={activeDocId === String((node as any).targetId)}
                                          onContextMenu={(e) => {
                                            if (!canEdit)
                                              return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setContextMenu({ kind: "doc", x: e.clientX, y: e.clientY, categoryId: cat.categoryId, index, docId: String(node.targetId) });
                                          }}
                                          onClick={() => {
                                            const docId = String(node.targetId);
                                            onSelectDoc?.(docId);
                                            onCloseLeftDrawer();
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                              e.preventDefault();
                                              const docId = String(node.targetId);
                                              onSelectDoc?.(docId);
                                              onCloseLeftDrawer();
                                            }
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
                                            setDropTarget({ kind: "node", toCategoryId: cat.categoryId, insertIndex: isBefore ? index : index + 1 });
                                          }}
                                          onDrop={(e) => {
                                            if (!canEdit)
                                              return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDrop();
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
                                            e.dataTransfer.effectAllowed = "copyMove";
                                            e.dataTransfer.setData("text/plain", String(node.nodeId));
                                            setDocRefDragData(e.dataTransfer, {
                                              docId: String(node.targetId),
                                              ...(typeof activeSpaceId === "number" && activeSpaceId > 0 ? { spaceId: activeSpaceId } : {}),
                                              ...(title ? { title } : {}),
                                              ...(coverUrl ? { imageUrl: coverUrl } : {}),
                                            });
                                            setDragging({
                                              kind: "node",
                                              nodeId: String(node.nodeId),
                                              type: "doc",
                                              fromCategoryId: cat.categoryId,
                                              fromIndex: index,
                                            });
                                            setDropTarget(null);
                                          }}
                                          onDragEnd={() => {
                                            setDragging(null);
                                            setDropTarget(null);
                                          }}
                                        >
                                          <div className="mask mask-squircle size-8 bg-base-100 border border-base-300/60 flex items-center justify-center relative overflow-hidden">
                                            {coverUrl
                                              ? (
                                                  <>
                                                    <img
                                                      src={coverUrl}
                                                      alt={title || "doc"}
                                                      className="w-full h-full object-cover"
                                                    />
                                                    <span className="absolute bottom-0.5 right-0.5 size-4 rounded bg-base-100/80 flex items-center justify-center border border-base-300/60">
                                                      <FileTextIcon className="size-3 opacity-70" />
                                                    </span>
                                                  </>
                                                )
                                              : (
                                                  <FileTextIcon className="size-4 opacity-70" />
                                                )}
                                          </div>
                                          <span className="flex-1 min-w-0 truncate text-left">{title}</span>
                                        </div>
                                      )}
                                </div>
                              );
                            })}

                          {canEdit && dragging?.kind === "node" && dropTarget?.kind === "node" && dropTarget.toCategoryId === cat.categoryId && dropTarget.insertIndex === items.length && (
                            <div className="pointer-events-none absolute left-3 right-3 bottom-0 translate-y-1/2 h-0.5 bg-primary/60 rounded" />
                          )}

                          {isAddPanelOpen && (
                            <div className="mt-1 px-2 py-2 border-t border-base-300">
                              <div className="flex items-center gap-2">
                                <select
                                  className="select select-bordered select-xs flex-1"
                                  aria-label="娣诲姞鎴块棿"
                                  value={pendingAddRoomId ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setPendingAddRoomId(v ? Number(v) : null);
                                  }}
                                >
                                  <option value="">添加房间…</option>
                                  {fallbackTextRooms
                                    .filter(r => typeof r.roomId === "number" && Number.isFinite(r.roomId))
                                    .filter(r => !existingRoomIdsInTree.has(r.roomId as number))
                                    .map(r => (
                                      <option key={r.roomId} value={r.roomId}>
                                        {r.name ?? String(r.roomId)}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => {
                                    if (!pendingAddRoomId)
                                      return;
                                    addNode(cat.categoryId, { nodeId: `room:${pendingAddRoomId}`, type: "room", targetId: pendingAddRoomId });
                                    setPendingAddRoomId(null);
                                  }}
                                  disabled={!pendingAddRoomId}
                                >
                                  娣诲姞
                                </button>
                              </div>

                              {isSpaceOwner && (
                                <div className="flex items-center gap-2 mt-2">
                                  <select
                                    className="select select-bordered select-xs flex-1"
                                    aria-label="娣诲姞鏂囨。"
                                    value={pendingAddDocId}
                                    onChange={(e) => {
                                      setPendingAddDocId(e.target.value);
                                    }}
                                  >
                                    <option value="">添加文档…</option>
                                    {visibleDocMetas
                                      .filter(m => typeof m?.id === "string" && m.id.length > 0)
                                      .filter(m => !existingDocIdsInTree.has(m.id))
                                      .map(m => (
                                        <option key={m.id} value={m.id}>
                                          {m.title ?? m.id}
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => {
                                      if (!pendingAddDocId)
                                        return;
                                      addNode(cat.categoryId, { nodeId: `doc:${pendingAddDocId}`, type: "doc", targetId: pendingAddDocId });
                                      setPendingAddDocId("");
                                    }}
                                    disabled={!pendingAddDocId}
                                  >
                                    娣诲姞
                                  </button>
                                </div>
                              )}

                              <div className="flex justify-end mt-2">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => {
                                    setAddPanelCategoryId(null);
                                    setPendingAddRoomId(null);
                                    setPendingAddDocId("");
                                  }}
                                >
                                  鍏抽棴
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <SidebarTreeOverlays
                canEdit={canEdit}
                categoryEditor={categoryEditor}
                categoryEditorError={categoryEditorError}
                onCategoryEditorNameChange={(name) => {
                  setCategoryEditor(prev => prev ? { ...prev, name } : prev);
                  setCategoryEditorError("");
                }}
                onCloseCategoryEditor={() => {
                  setCategoryEditor(null);
                  setCategoryEditorError("");
                }}
                onSubmitCategoryEditor={submitCategoryEditor}

                deleteConfirmCategoryId={deleteConfirmCategoryId}
                treeCategoryCount={treeToRender.categories.length}
                onCloseDeleteConfirmCategory={() => setDeleteConfirmCategoryId(null)}
                onRequestDeleteConfirmCategory={categoryId => setDeleteConfirmCategoryId(categoryId)}
                onConfirmDeleteCategory={(categoryId) => {
                  deleteCategoryCore(categoryId);
                  setDeleteConfirmCategoryId(null);
                }}

                contextMenu={contextMenu}
                onCloseContextMenu={() => setContextMenu(null)}
                onOpenRenameCategory={(categoryId) => {
                  openRenameCategory(categoryId);
                }}
                onOpenAddPanel={(categoryId) => {
                  setAddPanelCategoryId(v => (v === categoryId ? null : categoryId));
                  setPendingAddRoomId(null);
                  setPendingAddDocId("");
                }}
                onOpenDoc={(docId) => {
                  onSelectDoc?.(docId);
                  onCloseLeftDrawer();
                }}
                onRequestDeleteDoc={(docId, title, categoryId, index) => {
                  setDeleteConfirmDoc({ docId, title, categoryId, index });
                }}

                deleteConfirmDoc={deleteConfirmDoc}
                onCloseDeleteConfirmDoc={() => setDeleteConfirmDoc(null)}
                onConfirmDeleteDoc={(payload) => {
                  try {
                    if (activeSpaceId) {
                      void deleteSpaceDoc({ spaceId: activeSpaceId, docId: payload.docId }).catch((err) => {
                        console.error("[SidebarTree] deleteSpaceDoc failed", err);
                      });
                    }
                  }
                  catch (err) {
                    console.error("[SidebarTree] deleteSpaceDoc failed", err);
                  }
                  removeNode(payload.categoryId, payload.index);
                  setDeleteConfirmDoc(null);
                }}
                getDocTitle={(docId) => {
                  return docMetaMap.get(docId)?.title ?? docId;
                }}
              />
            </>
          )}
    </div>
  );
}

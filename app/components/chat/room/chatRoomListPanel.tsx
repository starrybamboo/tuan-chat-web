import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarLeafNode, SidebarTree } from "./sidebarTree";
import type { CategoryEditorState, DeleteConfirmDocState, SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { SpaceDetailTab } from "@/components/chat/space/spaceHeaderBar";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteSpaceDoc } from "@/components/chat/infra/blocksuite/deleteSpaceDoc";
import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import { getSidebarTreeExpandedByCategoryId, setSidebarTreeExpandedByCategoryId } from "@/components/chat/infra/indexedDB/sidebarTreeUiDb";
import RoomButton from "@/components/chat/shared/components/roomButton";
import SpaceHeaderBar from "@/components/chat/space/spaceHeaderBar";
import LeftChatList from "@/components/privateChat/LeftChatList";
import { ChevronDown } from "@/icons";
import { normalizeSidebarTree } from "./sidebarTree";
import SidebarTreeOverlays from "./sidebarTreeOverlays";

export interface ChatRoomListPanelProps {
  isPrivateChatMode: boolean;

  currentUserId?: number | null;

  activeSpaceId: number | null;
  activeSpaceName?: string;
  activeSpaceIsArchived?: boolean;
  isSpaceOwner: boolean;

  rooms: Room[];
  roomOrderIds?: number[];
  onReorderRoomIds?: (nextRoomIds: number[]) => void;

  sidebarTree?: SidebarTree | null;
  docMetas?: MinimalDocMeta[];
  onSelectDoc?: (docId: string) => void;
  onSaveSidebarTree?: (tree: SidebarTree) => void;
  onResetSidebarTreeToDefault?: () => void;
  activeRoomId: number | null;
  unreadMessagesNumber: Record<number, number>;

  onContextMenu: (e: React.MouseEvent) => void;
  onInviteMember: () => void;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab) => void;

  onSelectRoom: (roomId: number) => void;
  onCloseLeftDrawer: () => void;

  setIsOpenLeftDrawer: (isOpen: boolean) => void;

  onCreateRoom: () => void;
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
  unreadMessagesNumber,
  onContextMenu,
  onInviteMember,
  onOpenSpaceDetailPanel,
  onSelectRoom,
  onCloseLeftDrawer,
  setIsOpenLeftDrawer,
  onCreateRoom,
}: ChatRoomListPanelProps) {
  type DraggingItem = {
    kind: "node";
    nodeId: string;
    type: "room" | "doc";
    fromCategoryId: string;
    fromIndex: number;
  } | {
    kind: "category";
    fromIndex: number;
    categoryId: string;
  };

  type DropTarget = { kind: "node"; toCategoryId: string; insertIndex: number } | { kind: "category"; insertIndex: number };

  const roomsInSpace = useMemo(() => {
    return rooms.filter(room => room.spaceId === activeSpaceId);
  }, [activeSpaceId, rooms]);

  // 侧边栏仅展示“空间内独立文档”，不展示 space/room/clue 绑定的 description 文档。
  // 独立文档的 docId 规范：`doc:<key>`（parseSpaceDocId.kind === 'independent'）
  const visibleDocMetas = useMemo(() => {
    if (!isSpaceOwner)
      return [] as MinimalDocMeta[];

    const list = docMetas ?? [];
    return list.filter((m) => {
      const id = m?.id;
      if (!id)
        return false;
      const parsed = parseSpaceDocId(id);
      return parsed?.kind === "independent";
    });
  }, [docMetas, isSpaceOwner]);

  const docMetaMap = useMemo(() => {
    const map = new Map<string, MinimalDocMeta>();
    for (const m of visibleDocMetas) {
      if (m?.id) {
        map.set(m.id, m);
      }
    }
    return map;
  }, [visibleDocMetas]);

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

  const displayTree = useMemo(() => {
    return normalizeSidebarTree({
      tree: sidebarTree ?? null,
      roomsInSpace: fallbackTextRooms,
      docMetas: visibleDocMetas,
      includeDocs: isSpaceOwner,
    });
  }, [fallbackTextRooms, isSpaceOwner, sidebarTree, visibleDocMetas]);

  // KP 直接拖拽/编辑：使用本地副本做乐观更新；drop/操作结束后再保存。
  const [localTree, setLocalTree] = useState<SidebarTree | null>(null);
  const [dragging, setDragging] = useState<DraggingItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  // 分类折叠：默认折叠；仅本地 IndexedDB 保存“展开状态”，不再同步到后端 sidebarTree。
  const [expandedByCategoryId, setExpandedByCategoryId] = useState<Record<string, boolean> | null>(null);
  const lastSpaceIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canEdit) {
      setLocalTree(null);
      return;
    }
    // 拖拽中不覆写本地树，避免抖动
    if (dragging)
      return;
    setLocalTree(displayTree);
  }, [canEdit, displayTree, dragging]);

  useEffect(() => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      setExpandedByCategoryId(null);
      lastSpaceIdRef.current = activeSpaceId;
      return;
    }

    // 切换空间：从 IndexedDB 读取上次展开状态；默认全部折叠（expanded=false）。
    if (activeSpaceId !== lastSpaceIdRef.current) {
      lastSpaceIdRef.current = activeSpaceId;
      setExpandedByCategoryId(null);
      getSidebarTreeExpandedByCategoryId({ userId: currentUserId, spaceId: activeSpaceId })
        .then((val) => {
          setExpandedByCategoryId(val ?? {});
        })
        .catch(() => {
          setExpandedByCategoryId({});
        });
    }
  }, [activeSpaceId, canEdit, currentUserId, displayTree]);

  useEffect(() => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0)
      return;
    if (!expandedByCategoryId)
      return;
    // categories 变化时：去掉不存在的 key，避免无限增长
    const next: Record<string, boolean> = {};
    for (const c of displayTree.categories) {
      if (expandedByCategoryId[c.categoryId]) {
        next[c.categoryId] = true;
      }
    }
    const prevKeys = Object.keys(expandedByCategoryId).length;
    const nextKeys = Object.keys(next).length;
    if (prevKeys !== nextKeys) {
      setExpandedByCategoryId(next);
      setSidebarTreeExpandedByCategoryId({ userId: currentUserId, spaceId: activeSpaceId, expandedByCategoryId: next }).catch(() => {
        // ignore
      });
    }
  }, [activeSpaceId, currentUserId, displayTree.categories, expandedByCategoryId]);

  const toggleCategoryExpanded = useCallback((categoryId: string) => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0)
      return;
    setExpandedByCategoryId((prev) => {
      const base = prev ?? {};
      const next = { ...base, [categoryId]: !base[categoryId] };
      setSidebarTreeExpandedByCategoryId({ userId: currentUserId, spaceId: activeSpaceId, expandedByCategoryId: next }).catch(() => {
        // ignore
      });
      return next;
    });
  }, [activeSpaceId, currentUserId]);

  const treeToRender = canEdit ? (localTree ?? displayTree) : displayTree;

  const dropHandledRef = useRef(false);

  const [addPanelCategoryId, setAddPanelCategoryId] = useState<string | null>(null);
  const [pendingAddRoomId, setPendingAddRoomId] = useState<number | null>(null);
  const [pendingAddDocId, setPendingAddDocId] = useState<string>("");

  const [categoryEditor, setCategoryEditor] = useState<CategoryEditorState | null>(null);
  const [categoryEditorError, setCategoryEditorError] = useState<string>("");
  const [deleteConfirmCategoryId, setDeleteConfirmCategoryId] = useState<string | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DeleteConfirmDocState | null>(null);

  const [contextMenu, setContextMenu] = useState<SidebarTreeContextMenuState>(null);

  const normalizeAndSet = useCallback((next: SidebarTree, save: boolean) => {
    const normalized = normalizeSidebarTree({
      tree: next,
      roomsInSpace: fallbackTextRooms,
      docMetas: visibleDocMetas,
      includeDocs: isSpaceOwner,
    });
    setLocalTree(normalized);
    if (save) {
      onSaveSidebarTree?.(normalized);
    }
  }, [fallbackTextRooms, isSpaceOwner, onSaveSidebarTree, visibleDocMetas]);

  const moveNode = useCallback((fromCategoryId: string, fromIndex: number, toCategoryId: string, insertIndex: number, save: boolean) => {
    const base = treeToRender;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const fromCat = next.categories.find(c => c.categoryId === fromCategoryId);
    const toCat = next.categories.find(c => c.categoryId === toCategoryId);
    if (!fromCat || !toCat)
      return;
    if (fromIndex < 0 || fromIndex >= fromCat.items.length)
      return;

    const clampedInsertIndex = Math.max(0, Math.min(insertIndex, toCat.items.length));
    const [node] = fromCat.items.splice(fromIndex, 1);
    if (!node)
      return;

    let finalInsertIndex = clampedInsertIndex;
    if (fromCategoryId === toCategoryId && finalInsertIndex > fromIndex) {
      finalInsertIndex -= 1;
    }

    toCat.items.splice(finalInsertIndex, 0, node);
    normalizeAndSet(next, save);
  }, [normalizeAndSet, treeToRender]);

  const moveCategory = useCallback((fromIndex: number, insertIndex: number) => {
    const base = treeToRender;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const categories = next.categories;
    if (fromIndex < 0 || fromIndex >= categories.length)
      return;

    const clampedInsertIndex = Math.max(0, Math.min(insertIndex, categories.length));
    const [cat] = categories.splice(fromIndex, 1);
    if (!cat)
      return;

    let finalInsertIndex = clampedInsertIndex;
    if (finalInsertIndex > fromIndex) {
      finalInsertIndex -= 1;
    }
    categories.splice(finalInsertIndex, 0, cat);
    normalizeAndSet(next, true);
  }, [normalizeAndSet, treeToRender]);

  const removeNode = useCallback((categoryId: string, index: number) => {
    const base = treeToRender;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const cat = next.categories.find(c => c.categoryId === categoryId);
    if (!cat)
      return;
    if (index < 0 || index >= cat.items.length)
      return;
    cat.items.splice(index, 1);
    normalizeAndSet(next, true);
  }, [normalizeAndSet, treeToRender]);

  const addNode = useCallback((categoryId: string, node: SidebarLeafNode) => {
    const base = treeToRender;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const cat = next.categories.find(c => c.categoryId === categoryId);
    if (!cat)
      return;
    cat.items.push(node);
    normalizeAndSet(next, true);
  }, [normalizeAndSet, treeToRender]);

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
      setCategoryEditorError("名称不能为空");
      return;
    }
    const base = treeToRender;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    if (categoryEditor.mode === "add") {
      next.categories.push({
        categoryId: `cat:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
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
  }, [categoryEditor, normalizeAndSet, treeToRender]);

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

  const handleDrop = useCallback(() => {
    if (dropHandledRef.current)
      return;
    if (!dragging || !dropTarget)
      return;

    dropHandledRef.current = true;

    if (dragging.kind === "category" && dropTarget.kind === "category") {
      moveCategory(dragging.fromIndex, dropTarget.insertIndex);
      setDragging(null);
      setDropTarget(null);
      return;
    }

    if (dragging.kind === "node" && dropTarget.kind === "node") {
      moveNode(dragging.fromCategoryId, dragging.fromIndex, dropTarget.toCategoryId, dropTarget.insertIndex, true);
      setDragging(null);
      setDropTarget(null);
    }
  }, [dragging, dropTarget, moveCategory, moveNode]);

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
                  />
                  {/* <div className="h-px bg-base-300"></div> */}
                </>
              )}

              <div className="flex flex-col gap-2 py-2 px-1 overflow-auto w-full ">
                {canEdit && (
                  <div className="flex items-center gap-2 px-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={openAddCategory}
                    >
                      新增分类
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        onResetSidebarTreeToDefault?.();
                      }}
                    >
                      重置默认
                    </button>
                  </div>
                )}

                {treeToRender.categories.map((cat, categoryIndex) => {
                  const items = Array.isArray(cat.items) ? cat.items : [];
                  // 默认折叠：如果本地还没加载完，则先折叠；展开状态以 IndexedDB 为准。
                  const isExpanded = Boolean(expandedByCategoryId?.[cat.categoryId]);
                  const isCollapsed = !isExpanded;
                  const isAddPanelOpen = canEdit && addPanelCategoryId === cat.categoryId;

                  const showCategoryInsertLine = canEdit
                    && dragging?.kind === "category"
                    && dropTarget?.kind === "category"
                    && dropTarget.insertIndex === categoryIndex;

                  return (
                    <div key={cat.categoryId} className="px-1 relative">
                      {showCategoryInsertLine && (
                        <div className="pointer-events-none absolute left-3 right-3 top-0 -translate-y-1/2 h-0.5 bg-primary/60 rounded" />
                      )}

                      <div
                        className="flex items-center gap-2 px-2 py-1 text-xs font-medium opacity-80 select-none rounded-lg hover:bg-base-300/40"
                        draggable={canEdit}
                        onDragStart={(e) => {
                          if (!canEdit)
                            return;
                          // 避免从输入控件触发拖拽
                          const el = e.target as HTMLElement | null;
                          if (el && (el.closest("input") || el.closest("select") || el.closest("textarea"))) {
                            e.preventDefault();
                            return;
                          }
                          dropHandledRef.current = false;
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
                          // 分类操作：用右键替代原来的下拉菜单
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

                          // node: drop 到分类头部 -> 追加到末尾
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
                          title={isCollapsed ? "展开" : "折叠"}
                        >
                          <ChevronDown className={`size-4 opacity-80 ${isCollapsed ? "-rotate-90" : ""}`} />
                        </button>

                        <span className="flex-1 truncate">{cat.name}</span>

                        {/* 分类的弹出操作菜单已改为右键触发 */}
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
                              // 非 KP：隐藏 doc 节点（目前 doc 路由也会 gate）
                              if (!isSpaceOwner && node.type === "doc")
                                return false;
                              return true;
                            })
                            .map((node, index) => {
                              const isRoom = node.type === "room";
                              const title = isRoom
                                ? (roomById.get(Number((node as any).targetId))?.name ?? (node as any)?.fallbackTitle ?? String((node as any).targetId))
                                : (docMetaMap.get(String((node as any).targetId))?.title ?? (node as any)?.fallbackTitle ?? String((node as any).targetId));

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
                                              // 房间右键菜单：统一使用 ChatPageContextMenu
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
                                              dropHandledRef.current = false;
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
                                              {/* 房间的弹出操作菜单已改为右键触发 */}
                                            </RoomButton>
                                          </div>
                                        );
                                      })()
                                    : (
                                        <div
                                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-base-300/60"
                                          onContextMenu={(e) => {
                                            if (!canEdit)
                                              return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setContextMenu({ kind: "doc", x: e.clientX, y: e.clientY, categoryId: cat.categoryId, index, docId: String(node.targetId) });
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
                                            dropHandledRef.current = false;
                                            e.dataTransfer.effectAllowed = "move";
                                            e.dataTransfer.setData("text/plain", String(node.nodeId));
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
                                          <button
                                            type="button"
                                            className="truncate flex-1 text-left"
                                            onClick={() => {
                                              const docId = String(node.targetId);
                                              onSelectDoc?.(docId);
                                              onCloseLeftDrawer();
                                            }}
                                          >
                                            {title}
                                          </button>

                                          {canEdit && (
                                            <span className="opacity-40 text-xs">右键操作</span>
                                          )}
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
                                  aria-label="添加房间"
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
                                  添加
                                </button>
                              </div>

                              {isSpaceOwner && (
                                <div className="flex items-center gap-2 mt-2">
                                  <select
                                    className="select select-bordered select-xs flex-1"
                                    aria-label="添加文档"
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
                                    添加
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
                                  关闭
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

              {activeSpaceId !== null && isSpaceOwner && (
                <button
                  className="btn btn-dash btn-info flex mx-2"
                  type="button"
                  onClick={onCreateRoom}
                >
                  创建房间
                </button>
              )}

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

import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarLeafNode, SidebarTree } from "./sidebarTree";
import type { CategoryEditorState, DeleteConfirmDocState, SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { SpaceDetailTab } from "@/components/chat/space/spaceHeaderBar";

import { FileTextIcon } from "@phosphor-icons/react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { deleteSpaceDoc } from "@/components/chat/infra/blocksuite/deleteSpaceDoc";
import useRoomSidebarDocMetas from "@/components/chat/room/useRoomSidebarDocMetas";
import useRoomSidebarTreeActions from "@/components/chat/room/useRoomSidebarTreeActions";
import useRoomSidebarTreeState from "@/components/chat/room/useRoomSidebarTreeState";
import RoomButton from "@/components/chat/shared/components/roomButton";
import SpaceHeaderBar from "@/components/chat/space/spaceHeaderBar";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { copyDocToSpaceDoc } from "@/components/chat/utils/docCopy";
import { getDocRefDragData, isDocRefDrag, setDocRefDragData } from "@/components/chat/utils/docRef";
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
  const [dragging, setDragging] = useState<DraggingItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

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

  const dropHandledRef = useRef(false);

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

    // 文档缓存：把 title/cover 写入 sidebarTree 节点（持久化到后端），让首屏优先展示缓存，而不是等待 meta/网络加载。
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

  const [docCopyDropCategoryId, setDocCopyDropCategoryId] = useState<string | null>(null);

  const handleDropDocRefToCategory = useCallback(async (params: {
    categoryId: string;
    docRef: { docId: string; spaceId?: number; title?: string; imageUrl?: string };
  }) => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      toast.error("未选择空间");
      return;
    }
    if (!isSpaceOwner) {
      toast.error("仅KP可复制到空间侧边栏");
      return;
    }
    if (params.docRef.spaceId && params.docRef.spaceId !== activeSpaceId) {
      toast.error("不允许跨空间复制文档");
      return;
    }

    const { parseDescriptionDocId } = await import("@/components/chat/infra/blocksuite/descriptionDocId");
    const key = parseDescriptionDocId(params.docRef.docId);
    if (!key) {
      toast.error("仅支持复制空间文档（描述文档/我的文档）");
      return;
    }

    const toastId = toast.loading("正在复制到空间侧边栏…");
    try {
      const res = await copyDocToSpaceDoc({
        spaceId: activeSpaceId,
        sourceDocId: params.docRef.docId,
        title: params.docRef.title,
        imageUrl: params.docRef.imageUrl,
      });

      const newMeta: MinimalDocMeta = {
        id: res.newDocId,
        title: res.title,
        ...(params.docRef.imageUrl ? { imageUrl: params.docRef.imageUrl } : {}),
      };
      appendExtraDocMeta(newMeta);

      const baseTree = treeToRender;
      const nextTree = JSON.parse(JSON.stringify(baseTree)) as SidebarTree;
      const cat = nextTree.categories.find(c => c.categoryId === params.categoryId) ?? nextTree.categories[0];
      if (!cat) {
        toast.error("侧边栏分类不存在", { id: toastId });
        return;
      }
      cat.items = Array.isArray(cat.items) ? cat.items : [];
      const nodeId = `doc:${res.newDocId}`;
      if (!cat.items.some(i => i?.nodeId === nodeId)) {
        cat.items.push({
          nodeId,
          type: "doc",
          targetId: res.newDocId,
          fallbackTitle: res.title,
          ...(params.docRef.imageUrl ? { fallbackImageUrl: params.docRef.imageUrl } : {}),
        });
      }

      const docMetasOverride = (() => {
        const map = new Map<string, MinimalDocMeta>();
        for (const m of [...visibleDocMetas, newMeta]) {
          const id = typeof m?.id === "string" ? m.id : "";
          if (!id)
            continue;
          if (!map.has(id)) {
            map.set(id, { ...m });
            continue;
          }
          const existing = map.get(id)!;
          if (!existing.title && m.title) {
            existing.title = m.title;
          }
          if (!existing.imageUrl && m.imageUrl) {
            existing.imageUrl = m.imageUrl;
          }
        }
        return [...map.values()];
      })();

      normalizeAndSet(nextTree, true, { docMetasOverride });
      toast.success("已复制到空间侧边栏", { id: toastId });
    }
    catch (err) {
      console.error("[DocCopy] drop copy failed", err);
      toast.error(err instanceof Error ? err.message : "复制失败", { id: toastId });
    }
  }, [activeSpaceId, isSpaceOwner, normalizeAndSet, treeToRender, visibleDocMetas, appendExtraDocMeta]);

  const { moveNode, moveCategory, removeNode, addNode } = useRoomSidebarTreeActions({
    treeToRender,
    normalizeAndSet,
  });

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
                    onToggleLeftDrawer={onToggleLeftDrawer}
                    isLeftDrawerOpen={isLeftDrawerOpen}
                  />
                  {/* <div className="h-px bg-base-300"></div> */}
                </>
              )}

              <div
                className="flex flex-col gap-2 py-2 px-1 overflow-auto w-full "
                onDragOverCapture={(e) => {
                  if (dragging)
                    return;
                  if (!activeSpaceId || activeSpaceId <= 0)
                    return;
                  if (!isDocRefDrag(e.dataTransfer))
                    return;

                  e.preventDefault();
                  e.dataTransfer.dropEffect = isSpaceOwner ? "copy" : "none";

                  const targetEl = e.target as HTMLElement | null;
                  const catEl = targetEl?.closest?.("[data-tc-sidebar-category]") as HTMLElement | null;
                  const cid = catEl?.getAttribute?.("data-tc-sidebar-category") || "";
                  if (cid && cid !== docCopyDropCategoryId) {
                    setDocCopyDropCategoryId(cid);
                  }
                }}
                onDropCapture={(e) => {
                  if (dragging)
                    return;
                  if (!activeSpaceId || activeSpaceId <= 0)
                    return;
                  if (!isDocRefDrag(e.dataTransfer))
                    return;

                  e.preventDefault();
                  e.stopPropagation();

                  const docRef = getDocRefDragData(e.dataTransfer);
                  if (!docRef) {
                    toast.error("未识别到文档拖拽数据，请从文档卡片空白处重新拖拽");
                    return;
                  }

                  const targetEl = e.target as HTMLElement | null;
                  const catEl = targetEl?.closest?.("[data-tc-sidebar-category]") as HTMLElement | null;
                  const cid = catEl?.getAttribute?.("data-tc-sidebar-category") || "";
                  const categoryId = cid || docCopyDropCategoryId || treeToRender.categories[0]?.categoryId || "cat:docs";
                  setDocCopyDropCategoryId(null);
                  void handleDropDocRefToCategory({ categoryId, docRef });
                }}
              >
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
                    <div
                      key={cat.categoryId}
                      data-tc-sidebar-category={cat.categoryId}
                      className={`px-1 relative ${docCopyDropCategoryId === cat.categoryId ? "outline outline-2 outline-primary/50 rounded-lg" : ""}`}
                      onDragOver={(e) => {
                        if (dragging)
                          return;
                        if (!activeSpaceId || activeSpaceId <= 0)
                          return;
                        // 始终 preventDefault，确保 drop 能触发（部分环境 dragover 阶段 types 不可靠）。
                        e.preventDefault();
                        if (!isDocRefDrag(e.dataTransfer)) {
                          if (docCopyDropCategoryId === cat.categoryId) {
                            setDocCopyDropCategoryId(null);
                          }
                          return;
                        }
                        setDocCopyDropCategoryId(cat.categoryId);
                        e.dataTransfer.dropEffect = isSpaceOwner ? "copy" : "none";
                      }}
                      onDragLeave={() => {
                        if (docCopyDropCategoryId === cat.categoryId) {
                          setDocCopyDropCategoryId(null);
                        }
                      }}
                      onDrop={(e) => {
                        if (dragging)
                          return;
                        if (!activeSpaceId || activeSpaceId <= 0)
                          return;
                        setDocCopyDropCategoryId(null);
                        e.preventDefault();
                        e.stopPropagation();
                        const docRef = getDocRefDragData(e.dataTransfer);
                        if (!docRef) {
                          if (isDocRefDrag(e.dataTransfer)) {
                            toast.error("未识别到文档拖拽数据，请从文档卡片空白处重新拖拽");
                          }
                          return;
                        }
                        void handleDropDocRefToCategory({ categoryId: cat.categoryId, docRef });
                      }}
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
                          // 避免从输入控件触发拖拽
                          const el = e.target as HTMLElement | null;
                          if (el && (el.closest("input") || el.closest("select") || el.closest("textarea") || el.closest("button"))) {
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
                                            dropHandledRef.current = false;
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

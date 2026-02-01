import type { DragEvent, MouseEvent } from "react";
import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarCategoryNode, SidebarLeafNode } from "./sidebarTree";
import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import RoomSidebarAddPanel from "@/components/chat/room/roomSidebarAddPanel";
import RoomSidebarDocItem from "@/components/chat/room/roomSidebarDocItem";
import RoomSidebarRoomItem from "@/components/chat/room/roomSidebarRoomItem";
import { AddIcon, ChevronDown } from "@/icons";

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
              const nodeId = String((node as any).nodeId);

              const showInsertBefore = canEdit
                && dragging?.kind === "node"
                && dropTarget?.kind === "node"
                && dropTarget.toCategoryId === cat.categoryId
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
                      categoryId={cat.categoryId}
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
                    categoryId={cat.categoryId}
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
          {canEdit && dragging?.kind === "node" && dropTarget?.kind === "node" && dropTarget.toCategoryId === cat.categoryId && dropTarget.insertIndex === items.length && (
            <div className="pointer-events-none absolute left-3 right-3 bottom-0 translate-y-1/2 h-0.5 bg-primary/60 rounded" />
          )}

          {isAddPanelOpen && (
            <RoomSidebarAddPanel
              categoryId={cat.categoryId}
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
      )}
    </div>
  );
}

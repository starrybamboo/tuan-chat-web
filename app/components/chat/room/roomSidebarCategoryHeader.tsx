import type { DragEvent, MouseEvent } from "react";
import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import { AddIcon, ChevronDown } from "@/icons";

interface RoomSidebarCategoryHeaderProps {
  categoryId: string;
  categoryName: string;
  categoryIndex: number;
  canEdit: boolean;
  isCollapsed: boolean;
  itemsLength: number;
  dragging: DraggingItem | null;
  resetDropHandled: () => void;
  setDragging: (next: DraggingItem | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  handleDrop: () => void;
  toggleCategoryExpanded: (categoryId: string) => void;
  onOpenCreateInCategory: (categoryId: string) => void;
  setContextMenu: (next: SidebarTreeContextMenuState) => void;
  toggleTitle: string;
  addTitle: string;
}

export default function RoomSidebarCategoryHeader({
  categoryId,
  categoryName,
  categoryIndex,
  canEdit,
  isCollapsed,
  itemsLength,
  dragging,
  resetDropHandled,
  setDragging,
  setDropTarget,
  handleDrop,
  toggleCategoryExpanded,
  onOpenCreateInCategory,
  setContextMenu,
  toggleTitle,
  addTitle,
}: RoomSidebarCategoryHeaderProps) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1 text-xs font-medium opacity-80 select-none rounded-lg hover:bg-base-300/40"
      draggable={canEdit}
      onDragStart={(e) => {
        if (!canEdit)
          return;
        const el = e.target as HTMLElement | null;
        if (el && (el.closest("input") || el.closest("select") || el.closest("textarea") || el.closest("button"))) {
          e.preventDefault();
          return;
        }
        resetDropHandled();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `category:${categoryId}`);
        setDragging({ kind: "category", fromIndex: categoryIndex, categoryId });
        setDropTarget(null);
      }}
      onDragEnd={() => {
        setDragging(null);
        setDropTarget(null);
      }}
      onContextMenu={(e: MouseEvent) => {
        if (!canEdit)
          return;
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
          kind: "category",
          x: e.clientX,
          y: e.clientY,
          categoryId,
        });
      }}
      onDragOver={(e: DragEvent) => {
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

        setDropTarget({ kind: "node", toCategoryId: categoryId, insertIndex: itemsLength });
      }}
      onDrop={(e: DragEvent) => {
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
          toggleCategoryExpanded(categoryId);
        }}
        title={toggleTitle}
      >
        <ChevronDown className={`size-4 opacity-80 ${isCollapsed ? "-rotate-90" : ""}`} />
      </button>

      <span className="flex-1 truncate">{categoryName}</span>

      {canEdit && (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          title={addTitle}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenCreateInCategory(categoryId);
          }}
        >
          <AddIcon />
        </button>
      )}
    </div>
  );
}

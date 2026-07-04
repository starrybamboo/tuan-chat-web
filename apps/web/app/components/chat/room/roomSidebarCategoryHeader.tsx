import type { DragEvent, MouseEvent } from "react";

import { ListPlusIcon } from "@phosphor-icons/react";

import { setDragPreview } from "@/components/chat/utils/dragPreview";
import { ChevronDown } from "@/icons";

import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

type RoomSidebarCategoryHeaderProps = {
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
  onTriggerCategoryAdd: (categoryId: string) => void;
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
  onTriggerCategoryAdd,
  setContextMenu,
  toggleTitle,
  addTitle,
}: RoomSidebarCategoryHeaderProps) {
  const handleToggleExpanded = () => {
    toggleCategoryExpanded(categoryId);
  };
  const toggleButtonClassName = "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-base-content/60 transition hover:bg-base-300/55 hover:text-base-content/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30";
  const actionButtonClassName = "ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md text-base-content/62 opacity-0 transition-[opacity,color,background-color] duration-150 hover:bg-base-300/55 hover:text-base-content/90 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30 group-hover:opacity-100";

  return (
    <div
      className="
        group flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium
        opacity-80 select-none
        hover:bg-base-300/40
        focus-within:bg-base-300/40
      "
      draggable={canEdit}
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest("button")) {
          return;
        }
        handleToggleExpanded();
      }}
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
        setDragPreview({
          dataTransfer: e.dataTransfer,
          sourceElement: e.currentTarget,
          title: "移动分类",
          subtitle: "拖到目标位置",
          variant: "category",
        });
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
        className={toggleButtonClassName}
        onClick={(e) => {
          e.stopPropagation();
          handleToggleExpanded();
        }}
        title={toggleTitle}
      >
        <ChevronDown className={`
          size-4 opacity-80
          ${isCollapsed ? "-rotate-90" : ""}
        `} />
      </button>

      <span className="flex-1 truncate cursor-pointer">{categoryName}</span>

      {canEdit && (
        <button
          type="button"
          className={actionButtonClassName}
          title={addTitle}
          aria-label={addTitle}
          aria-haspopup="dialog"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTriggerCategoryAdd(categoryId);
          }}
        >
          <span className="inline-flex size-5 items-center justify-center">
            <ListPlusIcon className="size-4" weight="regular" />
          </span>
        </button>
      )}
    </div>
  );
}

import type { DragEvent } from "react";
import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import { PackageIcon } from "@phosphor-icons/react";

interface RoomSidebarMaterialPackageItemProps {
  nodeId: string;
  categoryId: string;
  index: number;
  canEdit: boolean;
  dragging: DraggingItem | null;
  resetDropHandled: () => void;
  setDragging: (next: DraggingItem | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  handleDrop: () => void;
  activeMaterialPackageId: number | null;
  materialPackageId: number;
  materialPackage?: SpaceMaterialPackageResponse;
  fallbackTitle?: string;
  fallbackImageUrl?: string;
  onSelectMaterialPackage: (spacePackageId: number) => void;
  onCloseLeftDrawer: () => void;
}

export default function RoomSidebarMaterialPackageItem({
  nodeId,
  categoryId,
  index,
  canEdit,
  dragging,
  resetDropHandled,
  setDragging,
  setDropTarget,
  handleDrop,
  activeMaterialPackageId,
  materialPackageId,
  materialPackage,
  fallbackTitle,
  fallbackImageUrl,
  onSelectMaterialPackage,
  onCloseLeftDrawer,
}: RoomSidebarMaterialPackageItemProps) {
  const title = materialPackage?.name?.trim() || fallbackTitle || `素材包 #${materialPackageId}`;
  const coverUrl = materialPackage?.coverUrl?.trim() || fallbackImageUrl || "";
  const isActive = activeMaterialPackageId === materialPackageId;

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!canEdit) {
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `material-package:${materialPackageId}`);
    resetDropHandled();
    setDragging({
      kind: "node",
      nodeId,
      type: "material-package",
      fromCategoryId: categoryId,
      fromIndex: index,
    });
    setDropTarget(null);
  };

  return (
    <div
      className={`group relative flex w-full min-w-0 select-none items-center gap-2 rounded-lg p-1 pr-3 text-sm font-medium ${isActive ? "bg-info-content/10" : "hover:bg-base-300"}`}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={() => {
        onSelectMaterialPackage(materialPackageId);
        onCloseLeftDrawer();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectMaterialPackage(materialPackageId);
          onCloseLeftDrawer();
        }
      }}
      onDragOver={(event) => {
        if (!canEdit || !dragging || dragging.kind !== "node") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
        const isBefore = (event.clientY - rect.top) < rect.height / 2;
        setDropTarget({ kind: "node", toCategoryId: categoryId, insertIndex: isBefore ? index : index + 1 });
      }}
      onDrop={(event) => {
        if (!canEdit) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        handleDrop();
      }}
      draggable={canEdit}
      onDragStart={handleDragStart}
      onDragEnd={() => {
        if (!canEdit) {
          return;
        }
        setDragging(null);
        setDropTarget(null);
      }}
    >
      <div className="flex size-8 items-center justify-center overflow-hidden rounded-md border border-base-300/60 bg-base-100">
        {coverUrl
          ? (
              <img
                src={coverUrl}
                alt={title}
                draggable={false}
                className="h-full w-full object-cover"
              />
            )
          : (
              <PackageIcon className="size-4 opacity-70" weight="duotone" />
            )}
      </div>
      <span className="flex-1 truncate text-left">{title}</span>
    </div>
  );
}

import type { MinimalDocMeta, SidebarLeafNode } from "./sidebarTree";
import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import { FileTextIcon } from "@phosphor-icons/react";
import { setDocRefDragData } from "@/components/chat/utils/docRef";

interface RoomSidebarDocItemProps {
  node: SidebarLeafNode;
  nodeId: string;
  categoryId: string;
  index: number;
  canEdit: boolean;
  dragging: DraggingItem | null;
  resetDropHandled: () => void;
  setDragging: (next: DraggingItem | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  handleDrop: () => void;
  setContextMenu: (next: SidebarTreeContextMenuState) => void;
  docHeaderOverrides: Record<string, { title?: string; imageUrl?: string }>;
  docMetaMap: Map<string, MinimalDocMeta>;
  activeSpaceId: number | null;
  activeDocId?: string | null;
  onSelectDoc?: (docId: string) => void;
  onCloseLeftDrawer: () => void;
}

export default function RoomSidebarDocItem({
  node,
  nodeId,
  categoryId,
  index,
  canEdit,
  dragging,
  resetDropHandled,
  setDragging,
  setDropTarget,
  handleDrop,
  setContextMenu,
  docHeaderOverrides,
  docMetaMap,
  activeSpaceId,
  activeDocId,
  onSelectDoc,
  onCloseLeftDrawer,
}: RoomSidebarDocItemProps) {
  if (node.type !== "doc")
    return null;

  const docId = String(node.targetId);
  const docOverride = docHeaderOverrides[docId];
  const docOverrideTitle = typeof docOverride?.title === "string" ? docOverride.title.trim() : "";
  const docOverrideImageUrl = typeof docOverride?.imageUrl === "string" ? docOverride.imageUrl.trim() : "";
  const docFallbackImageUrl = typeof (node as any)?.fallbackImageUrl === "string"
    ? String((node as any).fallbackImageUrl).trim()
    : "";

  const title = docOverrideTitle || (docMetaMap.get(docId)?.title ?? (node as any)?.fallbackTitle ?? docId);
  const coverUrl = docOverrideImageUrl || docFallbackImageUrl;
  const isActive = activeDocId === docId;

  return (
    <div
      className={`group relative font-bold text-sm rounded-lg p-1 pr-10 flex justify-start items-center gap-2 w-full min-w-0 ${isActive ? "bg-info-content/10" : "hover:bg-base-300"}`}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onContextMenu={(e) => {
        if (!canEdit)
          return;
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ kind: "doc", x: e.clientX, y: e.clientY, categoryId, index, docId });
      }}
      onClick={() => {
        onSelectDoc?.(docId);
        onCloseLeftDrawer();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
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
        setDropTarget({ kind: "node", toCategoryId: categoryId, insertIndex: isBefore ? index : index + 1 });
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
        e.dataTransfer.effectAllowed = "all";
        e.dataTransfer.setData("text/plain", nodeId);
        setDocRefDragData(e.dataTransfer, {
          docId,
          ...(typeof activeSpaceId === "number" && activeSpaceId > 0 ? { spaceId: activeSpaceId } : {}),
          ...(title ? { title } : {}),
          ...(coverUrl ? { imageUrl: coverUrl } : {}),
        });
        setDragging({
          kind: "node",
          nodeId,
          type: "doc",
          fromCategoryId: categoryId,
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
  );
}

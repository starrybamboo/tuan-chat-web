import { useCallback } from "react";

import type { DraggingItem, DropTarget } from "@/components/chat/room/useRoomSidebarDragState";

type UseRoomSidebarDropHandlerParams = {
  dragging: DraggingItem | null;
  dropTarget: DropTarget | null;
  dropHandledRef: { current: boolean };
  setDragging: (next: DraggingItem | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  moveCategory: (fromIndex: number, insertIndex: number) => void;
  moveNode: (fromCategoryId: string, fromIndex: number, toCategoryId: string, insertIndex: number, save: boolean) => void;
};

export default function useRoomSidebarDropHandler({
  dragging,
  dropTarget,
  dropHandledRef,
  setDragging,
  setDropTarget,
  moveCategory,
  moveNode,
}: UseRoomSidebarDropHandlerParams) {
  return useCallback(() => {
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
  }, [dragging, dropTarget, dropHandledRef, moveCategory, moveNode, setDragging, setDropTarget]);
}

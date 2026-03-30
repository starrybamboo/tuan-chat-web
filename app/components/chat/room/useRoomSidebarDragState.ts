import { useCallback, useRef, useState } from "react";

export type DraggingItem = {
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

export type DropTarget = { kind: "node"; toCategoryId: string; insertIndex: number } | { kind: "category"; insertIndex: number };

export default function useRoomSidebarDragState() {
  const [dragging, setDragging] = useState<DraggingItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dropHandledRef = useRef(false);

  const resetDropHandled = useCallback(() => {
    dropHandledRef.current = false;
  }, []);

  return {
    dragging,
    dropTarget,
    setDragging,
    setDropTarget,
    dropHandledRef,
    resetDropHandled,
  };
}

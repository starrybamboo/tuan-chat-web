import type { ReactNode } from "react";
import type { MaterialItemDragPayload } from "@/components/chat/utils/materialItemDrag";

import { useCallback, useEffect, useRef, useState } from "react";
import DocRefDragOverlay from "@/components/chat/shared/components/docRefDragOverlay";
import { getMaterialItemDragData, isMaterialItemDrag } from "@/components/chat/utils/materialItemDrag";

interface MaterialEditorDropLayerProps {
  children: ReactNode;
  onEditMaterialItem: (payload: MaterialItemDragPayload) => void;
}

export default function MaterialEditorDropLayer({
  children,
  onEditMaterialItem,
}: MaterialEditorDropLayerProps) {
  const [dragOverlayLabel, setDragOverlayLabel] = useState<string | null>(null);
  const dragOverlayLabelRef = useRef<string | null>(null);

  const updateDragOverlayLabel = useCallback((next: string | null) => {
    if (dragOverlayLabelRef.current === next) {
      return;
    }
    dragOverlayLabelRef.current = next;
    setDragOverlayLabel(next);
  }, []);

  const handleDragOverCapture = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!isMaterialItemDrag(event.dataTransfer)) {
      updateDragOverlayLabel(null);
      return;
    }

    const payload = getMaterialItemDragData(event.dataTransfer);
    const label = payload?.itemKind === "asset" ? "松开编辑所属素材" : "松开编辑素材";
    updateDragOverlayLabel(label);
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, [updateDragOverlayLabel]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    updateDragOverlayLabel(null);
  }, [updateDragOverlayLabel]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    updateDragOverlayLabel(null);

    if (!isMaterialItemDrag(event.dataTransfer)) {
      return;
    }

    const payload = getMaterialItemDragData(event.dataTransfer);
    if (!payload) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onEditMaterialItem(payload);
  }, [onEditMaterialItem, updateDragOverlayLabel]);

  useEffect(() => {
    const clearOverlay = () => updateDragOverlayLabel(null);
    window.addEventListener("dragend", clearOverlay, true);
    window.addEventListener("drop", clearOverlay, true);
    return () => {
      window.removeEventListener("dragend", clearOverlay, true);
      window.removeEventListener("drop", clearOverlay, true);
    };
  }, [updateDragOverlayLabel]);

  return (
    <div
      className="relative h-full min-h-0 w-full"
      onDragOverCapture={handleDragOverCapture}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DocRefDragOverlay visible={Boolean(dragOverlayLabel)} label={dragOverlayLabel ?? undefined} />
      {children}
    </div>
  );
}

import type { DocRefDragPayload } from "@/components/chat/utils/docRef";

import React, { useCallback, useEffect, useRef, useState } from "react";

import DocRefDragOverlay from "@/components/chat/shared/components/docRefDragOverlay";
import { getFileDragOverlayText, isFileDrag } from "@/components/chat/utils/dndUpload";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";

interface RoomDocRefDropLayerProps {
  onSendDocCard: (payload: DocRefDragPayload) => Promise<void> | void;
  children: React.ReactNode;
}

export default function RoomDocRefDropLayer({ onSendDocCard, children }: RoomDocRefDropLayerProps) {
  const [dragOverlayLabel, setDragOverlayLabel] = useState<string | null>(null);
  const dragOverlayLabelRef = useRef<string | null>(null);
  const getDragOverTargetZone = useCallback((target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return el?.closest?.("[data-tc-doc-ref-drop-zone]") as HTMLElement | null;
  }, []);
  const isSubWindowDropZone = useCallback((target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return Boolean(el?.closest?.("[data-sub-window-drop-zone]"));
  }, []);
  const updateDragOverlayLabel = useCallback((next: string | null) => {
    if (dragOverlayLabelRef.current === next)
      return;
    dragOverlayLabelRef.current = next;
    setDragOverlayLabel(next);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const isDocRef = isDocRefDrag(event.dataTransfer);
    const isFile = isFileDrag(event.dataTransfer);
    const inSubWindowDropZone = isSubWindowDropZone(event.target);
    if (inSubWindowDropZone) {
      updateDragOverlayLabel(null);
      return;
    }
    const targetZone = getDragOverTargetZone(event.target);
    if (!targetZone) {
      updateDragOverlayLabel(null);
      return;
    }
    if (isDocRef) {
      updateDragOverlayLabel("松开发送文档卡片");
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      return;
    }
    if (isFile) {
      const label = getFileDragOverlayText(event.dataTransfer);
      updateDragOverlayLabel(label);
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      return;
    }
    updateDragOverlayLabel(null);
  }, [getDragOverTargetZone, isSubWindowDropZone, updateDragOverlayLabel]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget as Node | null;
    // Avoid flicker when moving between child nodes.
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    updateDragOverlayLabel(null);
  }, [updateDragOverlayLabel]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    updateDragOverlayLabel(null);
    const isDocRef = isDocRefDrag(event.dataTransfer);
    const isFile = isFileDrag(event.dataTransfer);
    const inSubWindowDropZone = isSubWindowDropZone(event.target);
    if (inSubWindowDropZone) {
      return;
    }
    if (!getDragOverTargetZone(event.target)) {
      if (isDocRef || isFile) {
        event.preventDefault();
      }
      return;
    }
    if (isFile) {
      // 文件拖拽交由子组件（ChatFrame/Composer）处理，这里仅负责遮罩状态。
      event.preventDefault();
      return;
    }
    const docRef = getDocRefDragData(event.dataTransfer);
    if (!docRef) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    void onSendDocCard(docRef);
  }, [getDragOverTargetZone, isSubWindowDropZone, onSendDocCard, updateDragOverlayLabel]);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      updateDragOverlayLabel(null);
    };
    const handleGlobalDrop = () => {
      updateDragOverlayLabel(null);
    };
    window.addEventListener("dragend", handleGlobalDragEnd, true);
    window.addEventListener("drop", handleGlobalDrop, true);
    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd, true);
      window.removeEventListener("drop", handleGlobalDrop, true);
    };
  }, [updateDragOverlayLabel]);

  return (
    <div
      className="relative h-full min-h-0 w-full"
      onDragOverCapture={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DocRefDragOverlay visible={Boolean(dragOverlayLabel)} label={dragOverlayLabel ?? undefined} />
      {children}
    </div>
  );
}

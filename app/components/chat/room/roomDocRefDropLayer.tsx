import type { DocRefDragPayload } from "@/components/chat/utils/docRef";

import React, { useCallback, useEffect, useRef, useState } from "react";

import DocRefDragOverlay from "@/components/chat/shared/components/docRefDragOverlay";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";

interface RoomDocRefDropLayerProps {
  onSendDocCard: (payload: DocRefDragPayload) => Promise<void> | void;
  children: React.ReactNode;
}

export default function RoomDocRefDropLayer({ onSendDocCard, children }: RoomDocRefDropLayerProps) {
  const [isDocRefDragOver, setIsDocRefDragOver] = useState(false);
  const isDocRefDragOverRef = useRef(false);
  const getDragOverTargetZone = useCallback((target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return el?.closest?.("[data-tc-doc-ref-drop-zone]") as HTMLElement | null;
  }, []);
  const updateDocRefDragOver = useCallback((next: boolean) => {
    if (isDocRefDragOverRef.current === next)
      return;
    isDocRefDragOverRef.current = next;
    setIsDocRefDragOver(next);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!isDocRefDrag(event.dataTransfer)) {
      updateDocRefDragOver(false);
      return;
    }
    const targetZone = getDragOverTargetZone(event.target);
    if (!targetZone) {
      updateDocRefDragOver(false);
      return;
    }
    updateDocRefDragOver(true);
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, [getDragOverTargetZone, updateDocRefDragOver]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget as Node | null;
    // Avoid flicker when moving between child nodes.
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    updateDocRefDragOver(false);
  }, [updateDocRefDragOver]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    updateDocRefDragOver(false);
    if (!getDragOverTargetZone(event.target)) {
      if (isDocRefDrag(event.dataTransfer)) {
        event.preventDefault();
      }
      return;
    }
    const docRef = getDocRefDragData(event.dataTransfer);
    if (!docRef) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    void onSendDocCard(docRef);
  }, [getDragOverTargetZone, onSendDocCard, updateDocRefDragOver]);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      updateDocRefDragOver(false);
    };
    const handleGlobalDrop = () => {
      updateDocRefDragOver(false);
    };
    window.addEventListener("dragend", handleGlobalDragEnd, true);
    window.addEventListener("drop", handleGlobalDrop, true);
    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd, true);
      window.removeEventListener("drop", handleGlobalDrop, true);
    };
  }, [updateDocRefDragOver]);

  return (
    <div
      className="relative h-full min-h-0 w-full"
      onDragOverCapture={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DocRefDragOverlay visible={isDocRefDragOver} />
      {children}
    </div>
  );
}

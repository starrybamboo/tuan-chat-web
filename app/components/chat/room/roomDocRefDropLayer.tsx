import type { DocRefDragPayload } from "@/components/chat/utils/docRef";

import React, { useCallback, useRef, useState } from "react";

import DocRefDragOverlay from "@/components/chat/shared/components/docRefDragOverlay";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";

interface RoomDocRefDropLayerProps {
  onSendDocCard: (payload: DocRefDragPayload) => Promise<void> | void;
  children: React.ReactNode;
}

export default function RoomDocRefDropLayer({ onSendDocCard, children }: RoomDocRefDropLayerProps) {
  const [isDocRefDragOver, setIsDocRefDragOver] = useState(false);
  const isDocRefDragOverRef = useRef(false);
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
    updateDocRefDragOver(true);
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, [updateDocRefDragOver]);

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
    const docRef = getDocRefDragData(event.dataTransfer);
    if (!docRef) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    void onSendDocCard(docRef);
  }, [onSendDocCard, updateDocRefDragOver]);

  return (
    <div
      className="relative h-full min-h-0 w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DocRefDragOverlay visible={isDocRefDragOver} />
      {children}
    </div>
  );
}

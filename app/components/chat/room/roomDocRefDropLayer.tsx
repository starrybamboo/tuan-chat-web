import type { ClueRefDragPayload } from "@/components/chat/utils/clueRef";
import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import type { MaterialItemDragPayload } from "@/components/chat/utils/materialItemDrag";
import type { RoomRefDragPayload } from "@/components/chat/utils/roomRef";

import React, { useCallback, useEffect, useRef, useState } from "react";

import DocRefDragOverlay from "@/components/chat/shared/components/docRefDragOverlay";
import { getClueRefDragData, isClueRefDrag } from "@/components/chat/utils/clueRef";
import { getFileDragOverlayText, isFileDrag } from "@/components/chat/utils/dndUpload";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";
import { getMaterialItemDragData, isMaterialItemDrag } from "@/components/chat/utils/materialItemDrag";
import { getRoomRefDragData, isRoomRefDrag } from "@/components/chat/utils/roomRef";

interface RoomDocRefDropLayerProps {
  onSendClueCard: (payload: ClueRefDragPayload) => Promise<void> | void;
  onSendDocCard: (payload: DocRefDragPayload) => Promise<void> | void;
  onSendMaterialItem: (payload: MaterialItemDragPayload) => Promise<void> | void;
  onSendRoomJump: (payload: RoomRefDragPayload) => Promise<void> | void;
  children: React.ReactNode;
}

export default function RoomDocRefDropLayer({
  onSendClueCard,
  onSendDocCard,
  onSendMaterialItem,
  onSendRoomJump,
  children,
}: RoomDocRefDropLayerProps) {
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
  const isCopilotContextDropZone = useCallback((target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return Boolean(el?.closest?.("[data-tc-copilot-context-drop-zone]"));
  }, []);
  const updateDragOverlayLabel = useCallback((next: string | null) => {
    if (dragOverlayLabelRef.current === next)
      return;
    dragOverlayLabelRef.current = next;
    setDragOverlayLabel(next);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const isDocRef = isDocRefDrag(event.dataTransfer);
    const isMaterialItem = isMaterialItemDrag(event.dataTransfer);
    const isRoomRef = isRoomRefDrag(event.dataTransfer);
    const isClueRef = isClueRefDrag(event.dataTransfer);
    const isFile = isFileDrag(event.dataTransfer);
    const inSubWindowDropZone = isSubWindowDropZone(event.target);
    const inCopilotContextDropZone = isCopilotContextDropZone(event.target);
    if (inSubWindowDropZone || inCopilotContextDropZone) {
      updateDragOverlayLabel(null);
      return;
    }
    const targetZone = getDragOverTargetZone(event.target);
    if (!targetZone) {
      updateDragOverlayLabel(null);
      return;
    }
    if (isRoomRef) {
      updateDragOverlayLabel("松开发送群聊跳转");
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      return;
    }
    if (isClueRef) {
      updateDragOverlayLabel("松开发送线索");
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      return;
    }
    if (isMaterialItem) {
      const materialItem = getMaterialItemDragData(event.dataTransfer);
      const messageCount = materialItem?.messageCount ?? 0;
      if (materialItem?.itemKind === "asset") {
        updateDragOverlayLabel("松开发送具体素材");
      }
      else {
        updateDragOverlayLabel(messageCount > 1 ? `松开发送素材条目（共 ${messageCount} 条）` : "松开发送素材条目");
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
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
  }, [getDragOverTargetZone, isCopilotContextDropZone, isSubWindowDropZone, updateDragOverlayLabel]);

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
    const isMaterialItem = isMaterialItemDrag(event.dataTransfer);
    const isRoomRef = isRoomRefDrag(event.dataTransfer);
    const isClueRef = isClueRefDrag(event.dataTransfer);
    const isFile = isFileDrag(event.dataTransfer);
    const inSubWindowDropZone = isSubWindowDropZone(event.target);
    const inCopilotContextDropZone = isCopilotContextDropZone(event.target);
    if (inSubWindowDropZone || inCopilotContextDropZone) {
      return;
    }
    if (!getDragOverTargetZone(event.target)) {
      if (isDocRef || isRoomRef || isFile) {
        event.preventDefault();
      }
      return;
    }
    if (isFile) {
      // 文件拖拽交由子组件（ChatFrame/Composer）处理，这里仅负责遮罩状态。
      event.preventDefault();
      return;
    }
    const clueRef = getClueRefDragData(event.dataTransfer);
    if (clueRef && isClueRef) {
      event.preventDefault();
      event.stopPropagation();
      void onSendClueCard(clueRef);
      return;
    }
    const roomRef = getRoomRefDragData(event.dataTransfer);
    if (roomRef && isRoomRef) {
      event.preventDefault();
      event.stopPropagation();
      void onSendRoomJump(roomRef);
      return;
    }
    const materialItem = getMaterialItemDragData(event.dataTransfer);
    if (materialItem && isMaterialItem) {
      event.preventDefault();
      event.stopPropagation();
      void onSendMaterialItem(materialItem);
      return;
    }
    const docRef = getDocRefDragData(event.dataTransfer);
    if (!docRef) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    void onSendDocCard(docRef);
  }, [getDragOverTargetZone, isCopilotContextDropZone, isSubWindowDropZone, onSendClueCard, onSendDocCard, onSendMaterialItem, onSendRoomJump, updateDragOverlayLabel]);

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
      className="relative size-full min-h-0"
      onDragOverCapture={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DocRefDragOverlay visible={Boolean(dragOverlayLabel)} label={dragOverlayLabel ?? undefined} />
      {children}
    </div>
  );
}

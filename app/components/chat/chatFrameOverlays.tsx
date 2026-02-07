import type { ChatMessageResponse } from "../../../api";
import React from "react";

import ExportImageWindow from "@/components/chat/window/exportImageWindow";
import ForwardWindow from "@/components/chat/window/forwardWindow";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

interface ChatFrameOverlaysProps {
  isForwardWindowOpen: boolean;
  setIsForwardWindowOpen: (open: boolean) => void;
  isExportImageWindowOpen: boolean;
  setIsExportImageWindowOpen: (open: boolean) => void;
  historyMessages: ChatMessageResponse[];
  selectedMessageIds: Set<number>;
  updateSelectedMessageIds: (next: Set<number>) => void;
  onForward: (roomId: number) => void;
  generateForwardMessage: () => Promise<number | null>;
}

export default function ChatFrameOverlays({
  isForwardWindowOpen,
  setIsForwardWindowOpen,
  isExportImageWindowOpen,
  setIsExportImageWindowOpen,
  historyMessages,
  selectedMessageIds,
  updateSelectedMessageIds,
  onForward,
  generateForwardMessage,
}: ChatFrameOverlaysProps) {
  const selectedMessages = Array.from(selectedMessageIds)
    .map(id => historyMessages.find(m => m.message.messageId === id))
    .filter((msg): msg is ChatMessageResponse => msg !== undefined);

  return (
    <>
      <ToastWindow isOpen={isForwardWindowOpen} onClose={() => setIsForwardWindowOpen(false)}>
        <ForwardWindow
          onClickRoom={roomId => onForward(roomId)}
          generateForwardMessage={generateForwardMessage}
        >
        </ForwardWindow>
      </ToastWindow>
      <ToastWindow isOpen={isExportImageWindowOpen} onClose={() => setIsExportImageWindowOpen(false)}>
        <ExportImageWindow
          selectedMessages={selectedMessages}
          onClose={() => {
            setIsExportImageWindowOpen(false);
            updateSelectedMessageIds(new Set());
          }}
        />
      </ToastWindow>
    </>
  );
}

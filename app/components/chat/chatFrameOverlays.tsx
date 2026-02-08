import type { ChatMessageResponse } from "../../../api";
import React from "react";

import ExportChatWindow from "@/components/chat/window/exportChatWindow";
import ExportImageWindow from "@/components/chat/window/exportImageWindow";
import ForwardWindow from "@/components/chat/window/forwardWindow";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import WebgalChooseModal, { type WebgalChooseOptionDraft } from "@/components/chat/shared/webgal/webgalChooseModal";

interface ChatFrameOverlaysProps {
  isForwardWindowOpen: boolean;
  setIsForwardWindowOpen: (open: boolean) => void;
  isExportFileWindowOpen: boolean;
  setIsExportFileWindowOpen: (open: boolean) => void;
  isExportImageWindowOpen: boolean;
  setIsExportImageWindowOpen: (open: boolean) => void;
  historyMessages: ChatMessageResponse[];
  selectedMessageIds: Set<number>;
  exitSelection: () => void;
  onForward: (roomId: number) => void;
  generateForwardMessage: () => Promise<number | null>;
  spaceName?: string;
  roomName?: string;
  webgalChooseEditor?: {
    isOpen: boolean;
    options: WebgalChooseOptionDraft[];
    error?: string | null;
    onChangeOption: (index: number, key: keyof WebgalChooseOptionDraft, value: string) => void;
    onAddOption: () => void;
    onRemoveOption: (index: number) => void;
    onClose: () => void;
    onSubmit: () => void;
  };
}

export default function ChatFrameOverlays({
  isForwardWindowOpen,
  setIsForwardWindowOpen,
  isExportFileWindowOpen,
  setIsExportFileWindowOpen,
  isExportImageWindowOpen,
  setIsExportImageWindowOpen,
  historyMessages,
  selectedMessageIds,
  exitSelection,
  onForward,
  generateForwardMessage,
  spaceName,
  roomName,
  webgalChooseEditor,
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
      <ToastWindow isOpen={isExportFileWindowOpen} onClose={() => setIsExportFileWindowOpen(false)}>
        <ExportChatWindow
          selectedMessages={selectedMessages}
          onClose={() => {
            setIsExportFileWindowOpen(false);
            exitSelection();
          }}
        />
      </ToastWindow>
      <ToastWindow isOpen={isExportImageWindowOpen} onClose={() => setIsExportImageWindowOpen(false)}>
        <ExportImageWindow
          selectedMessages={selectedMessages}
          spaceName={spaceName}
          roomName={roomName}
          onClose={() => {
            setIsExportImageWindowOpen(false);
            exitSelection();
          }}
        />
      </ToastWindow>
      {webgalChooseEditor && (
        <WebgalChooseModal
          isOpen={webgalChooseEditor.isOpen}
          title="编辑选择"
          description="编辑 WebGAL 选择项内容。"
          options={webgalChooseEditor.options}
          error={webgalChooseEditor.error}
          submitLabel="保存"
          onAddOption={webgalChooseEditor.onAddOption}
          onRemoveOption={webgalChooseEditor.onRemoveOption}
          onChangeOption={webgalChooseEditor.onChangeOption}
          onClose={webgalChooseEditor.onClose}
          onSubmit={webgalChooseEditor.onSubmit}
        />
      )}
    </>
  );
}

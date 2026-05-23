import type { ChatMessageResponse } from "../../../api";
import type { ForwardMode } from "@/components/chat/hooks/useChatFrameMessageActions";
import type { WebgalChooseOptionDraft } from "@/components/chat/shared/webgal/webgalChooseDraft";
import type { MessageDisplayFilterConfig } from "@/components/chat/utils/messageDisplayFilter";

import { AnimatePresence, motion } from "motion/react";
import { compareChatMessageResponsesByOrder } from "@/components/chat/shared/messageOrder";
import WebgalChooseModal from "@/components/chat/shared/webgal/webgalChooseModal";
import ExportChatWindow from "@/components/chat/window/exportChatWindow";
import ExportImageWindow from "@/components/chat/window/exportImageWindow";
import ForwardWindow from "@/components/chat/window/forwardWindow";
import RegexSelectWindow from "@/components/chat/window/regexSelectWindow";
import { floatingPanelMotionProps } from "@/components/common/motion/floatingPanelMotion";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

interface ChatFrameOverlaysProps {
  isForwardWindowOpen: boolean;
  setIsForwardWindowOpen: (open: boolean) => void;
  isExportFileWindowOpen: boolean;
  setIsExportFileWindowOpen: (open: boolean) => void;
  isExportImageWindowOpen: boolean;
  setIsExportImageWindowOpen: (open: boolean) => void;
  isRegexSelectWindowOpen: boolean;
  setIsRegexSelectWindowOpen: (open: boolean) => void;
  historyMessages: ChatMessageResponse[];
  filterSourceMessages: ChatMessageResponse[];
  currentMessageFilter: MessageDisplayFilterConfig | null;
  selectedMessageIds: Set<number>;
  exitSelection: () => void;
  onForward: (roomIds: number[], mode: ForwardMode) => Promise<boolean>;
  onChangeMessageFilter: (filter: MessageDisplayFilterConfig | null) => void;
  currentSpaceId: number;
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
  isRegexSelectWindowOpen,
  setIsRegexSelectWindowOpen,
  historyMessages,
  filterSourceMessages,
  currentMessageFilter,
  selectedMessageIds,
  exitSelection,
  onForward,
  onChangeMessageFilter,
  currentSpaceId,
  spaceName,
  roomName,
  webgalChooseEditor,
}: ChatFrameOverlaysProps) {
  const selectedMessages = Array.from(selectedMessageIds)
    .map(id => historyMessages.find(m => m.message.messageId === id))
    .filter((msg): msg is ChatMessageResponse => msg !== undefined)
    .sort(compareChatMessageResponsesByOrder);

  return (
    <>
      <ToastWindow isOpen={isForwardWindowOpen} onClose={() => setIsForwardWindowOpen(false)}>
        <ForwardWindow
          selectedMessages={selectedMessages}
          onForward={onForward}
          currentSpaceId={currentSpaceId}
          currentSpaceName={spaceName}
        >
        </ForwardWindow>
      </ToastWindow>
      <AnimatePresence>
        {isRegexSelectWindowOpen && (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-50 flex justify-center px-4">
            <motion.div className="pointer-events-auto" {...floatingPanelMotionProps}>
              <RegexSelectWindow
                sourceMessages={filterSourceMessages}
                currentFilter={currentMessageFilter}
                onChangeFilter={onChangeMessageFilter}
                onClose={() => setIsRegexSelectWindowOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

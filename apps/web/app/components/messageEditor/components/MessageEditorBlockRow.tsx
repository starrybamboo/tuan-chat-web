import type { KeyboardEvent, MouseEvent, ReactNode, RefObject } from "react";

import { memo, useCallback } from "react";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorBlockDriverKind } from "../runtime/messageEditorRegistry";

import { MessageEditorAtomicBlock } from "./MessageEditorAtomicBlock";
import { MessageEditorTextBlock } from "./MessageEditorTextBlock";

type MessageEditorBlockRowProps = {
  active: boolean;
  blockId: string;
  commandMenus: ReactNode;
  driverKind: MessageEditorBlockDriverKind;
  message: MessageEditorMessage;
  onAtomicMouseDown: (blockId: string, event: MouseEvent<HTMLDivElement>) => void;
  onDeleteAtomicBlock: (blockId: string) => void;
  onFocusAtomicBlock: (blockId: string) => void;
  onFocusTextBlock: (blockId: string) => void;
  onResizeAtomicBlock: (blockId: string, size: { height: number; width: number }) => void;
  onTextBlur: (blockId: string) => void;
  onTextInput: (blockId: string, nextContent: string) => void;
  onTextKeyDown: (blockId: string, event: KeyboardEvent<HTMLDivElement>) => void;
  onTextMouseDown: (blockId: string, event: MouseEvent<HTMLDivElement>) => void;
  onTextPasteFiles: (blockId: string, files: File[]) => void;
  onTextPasteText: (blockId: string, text: string, insertPlainText: () => void) => boolean | void;
  onUploadAtomicBlock: (blockId: string, file: File) => Promise<void>;
  placeholder: string;
  readOnly: boolean;
  registerBlockRef: (blockId: string, node: HTMLDivElement | null) => void;
  registerBlockShellRef: (blockId: string, node: HTMLDivElement | null) => void;
  renderSpeakerHandle: (blockId: string, message: MessageEditorMessage, topClassName: string) => ReactNode;
  selectionSegment: { end: number; showLineBreakAfter?: boolean; start: number } | null;
  shellClassName: string;
  showDropAfter: boolean;
  showDropBefore: boolean;
  textInputRef: RefObject<ChatInputAreaHandle | null>;
};

function MessageEditorDropIndicator({ position }: { position: "before" | "after" }) {
  const verticalPositionClass = position === "before" ? "top-0" : "bottom-0";

  return (
    <div className={`
      pointer-events-none absolute inset-x-10 ${verticalPositionClass} h-0.5
      rounded-full bg-info
    `} />
  );
}

/** 单个块的渲染边界；未变化的 message 和交互 props 会由 React.memo 直接跳过。 */
export const MessageEditorBlockRow = memo(function MessageEditorBlockRow({
  active,
  blockId,
  commandMenus,
  driverKind,
  message,
  onAtomicMouseDown,
  onDeleteAtomicBlock,
  onFocusAtomicBlock,
  onFocusTextBlock,
  onResizeAtomicBlock,
  onTextBlur,
  onTextInput,
  onTextKeyDown,
  onTextMouseDown,
  onTextPasteFiles,
  onTextPasteText,
  onUploadAtomicBlock,
  placeholder,
  readOnly,
  registerBlockRef,
  registerBlockShellRef,
  renderSpeakerHandle,
  selectionSegment,
  shellClassName,
  showDropAfter,
  showDropBefore,
  textInputRef,
}: MessageEditorBlockRowProps) {
  const setShellRef = useCallback((node: HTMLDivElement | null) => {
    registerBlockShellRef(blockId, node);
  }, [blockId, registerBlockShellRef]);

  const handleAtomicMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    onAtomicMouseDown(blockId, event);
  }, [blockId, onAtomicMouseDown]);

  const blockContent = driverKind === "text"
    ? (
      <div ref={setShellRef} className={shellClassName}>
        {showDropBefore && <MessageEditorDropIndicator position="before" />}
        {showDropAfter && <MessageEditorDropIndicator position="after" />}
        {renderSpeakerHandle(blockId, message, "top-0")}
        <MessageEditorTextBlock
          active={active}
          blockId={blockId}
          message={message}
          onMouseDown={onTextMouseDown}
          placeholder={placeholder}
          readOnly={readOnly}
          registerBlockRef={registerBlockRef}
          textInputRef={textInputRef}
          selectionSegment={selectionSegment}
          onFocus={onFocusTextBlock}
          onBlur={onTextBlur}
          onInput={onTextInput}
          onKeyDown={onTextKeyDown}
          onPasteFiles={onTextPasteFiles}
          onPasteText={onTextPasteText}
        />
        {commandMenus}
      </div>
      )
    : (
      <div ref={setShellRef} className={shellClassName}>
        {showDropBefore && <MessageEditorDropIndicator position="before" />}
        {showDropAfter && <MessageEditorDropIndicator position="after" />}
        {renderSpeakerHandle(blockId, message, "top-1")}
        <div
          data-me-block-id={blockId}
          className="
            select-none
            [&_[contenteditable='true']]:select-text
            [&_input]:select-text
            [&_select]:select-text
            [&_textarea]:select-text
          "
          onMouseDown={handleAtomicMouseDown}
        >
          <MessageEditorAtomicBlock
            active={active}
            blockId={blockId}
            message={message}
            readOnly={readOnly}
            onFocus={onFocusAtomicBlock}
            onDelete={onDeleteAtomicBlock}
            onUpload={onUploadAtomicBlock}
            onResize={onResizeAtomicBlock}
          />
        </div>
      </div>
      );

  return (
    <div
      data-me-block-row="true"
      data-me-block-hit={blockId}
      className="w-full"
    >
      {blockContent}
    </div>
  );
});

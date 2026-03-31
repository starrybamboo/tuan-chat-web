import type { RefObject } from "react";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { MessageDraft } from "@/types/messageDraft";
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import ChatInputArea from "@/components/chat/input/chatInputArea";
import ChatToolbar from "@/components/chat/input/chatToolbar";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import { isFileDrag } from "@/components/chat/utils/dndUpload";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import { normalizeAnnotations, toggleAnnotation } from "@/types/messageAnnotations";
import MaterialComposerAttachmentsPreview from "./materialComposerAttachmentsPreview";
import { useMaterialComposerContext } from "./materialComposerContext";
import {
  MATERIAL_COMPOSER_ROOM_ID,
} from "./materialComposerShared";
import useMaterialMessageComposerSubmit from "./useMaterialMessageComposerSubmit";

export interface MaterialMessageComposerHandle {
  focusInput: () => void;
}

interface MaterialMessageComposerProps {
  composerKey: string;
  onAppendMessages: (messages: MessageDraft[]) => void;
}

export default function MaterialMessageComposer({
  ref,
  composerKey,
  onAppendMessages,
}: MaterialMessageComposerProps & { ref?: RefObject<MaterialMessageComposerHandle | null> }) {
  const chatInputRef = useRef<ChatInputAreaHandle | null>(null);
  const isComposingRef = useRef(false);
  const [inputSnapshot, setInputSnapshot] = useState({
    plainText: "",
    textWithoutMentions: "",
  });
  const screenSize = useScreenSize();
  const [currentChatStatus, setCurrentChatStatus] = useState<"idle" | "input" | "wait" | "leave">("idle");
  const {
    roomId,
    imgFiles,
    emojiUrls,
    emojiMetaByUrl,
    fileAttachments,
    audioFile,
    annotations: composerAnnotations,
    tempAnnotations,
    updateEmojiUrls,
    updateImgFiles,
    updateFileAttachments,
    setEmojiMetaByUrl,
    setAudioFile,
    setAnnotations: setComposerAnnotations,
    applyMediaAnnotationPreference,
    queueFiles,
    reset,
  } = useMaterialComposerContext();

  const setInputText = useCallback((text: string) => {
    chatInputRef.current?.setContent(text);
    chatInputRef.current?.triggerSync();
  }, []);

  useImperativeHandle(ref, () => ({
    focusInput: () => {
      chatInputRef.current?.focus();
    },
  }), []);

  useEffect(() => {
    setCurrentChatStatus("idle");
    setInputSnapshot({
      plainText: "",
      textWithoutMentions: "",
    });
    setInputText("");
  }, [composerKey, setInputText]);

  const handleInputSync = useCallback((plainText: string, textWithoutMentions: string) => {
    setInputSnapshot({
      plainText,
      textWithoutMentions,
    });
  }, []);

  const handlePasteFiles = useCallback((files: File[]) => {
    queueFiles(files, { showSuccessToast: false, showEmptyToast: false });
  }, [queueFiles]);

  const { isSubmitting, handleSubmit } = useMaterialMessageComposerSubmit({
    inputText: inputSnapshot.plainText,
    imgFiles,
    emojiUrls,
    emojiMetaByUrl,
    fileAttachments,
    audioFile,
    composerAnnotations,
    tempAnnotations,
    resetComposer: reset,
    onAppendMessages,
    setInputText,
  });

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !isComposingRef.current) {
      event.preventDefault();
      void handleSubmit();
    }
  }, [handleSubmit]);

  const handleKeyUp = useCallback(() => {}, []);
  const handleMouseDown = useCallback(() => {}, []);
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);
  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  const placeholderText = "输入素材内容…（Shift+Enter 换行）";
  const toolbarLayout = screenSize === "sm" ? "stacked" : "inline";
  const handleToggleComposerAnnotation = useCallback((id: string) => {
    setComposerAnnotations(toggleAnnotation(composerAnnotations, id));
  }, [composerAnnotations, setComposerAnnotations]);

  const handleOpenComposerAnnotations = useCallback(() => {
    openMessageAnnotationPicker({
      initialSelected: composerAnnotations,
      onChange: (next) => {
        setComposerAnnotations(normalizeAnnotations(next));
      },
    });
  }, [composerAnnotations, setComposerAnnotations]);

  return (
    <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100/80">
      <div
        className="relative"
        onDragOver={(event) => {
          if (isFileDrag(event.dataTransfer)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(event) => {
          if (!isFileDrag(event.dataTransfer)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          queueFiles(Array.from(event.dataTransfer.files ?? []));
        }}
      >
        <MaterialComposerAttachmentsPreview roomId={MATERIAL_COMPOSER_ROOM_ID} />

        <div className="border-b border-base-300/70 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <MessageAnnotationsBar
              annotations={composerAnnotations}
              canEdit={true}
              onToggle={handleToggleComposerAnnotation}
              onOpenPicker={handleOpenComposerAnnotations}
              showWhenEmpty={true}
              alwaysShowAddButton={true}
              compact={screenSize === "sm"}
              className="mt-0"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 p-2">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <ChatInputArea
                ref={chatInputRef}
                inputScope="composer"
                onInputSync={handleInputSync}
                onPasteFiles={handlePasteFiles}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onMouseDown={handleMouseDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                disabled={false}
                placeholder={placeholderText}
                className={`min-h-10 min-w-0 flex-1 overflow-y-auto ${screenSize === "sm" ? "max-h-[30dvh]" : "max-h-[20dvh]"}`}
              />
            </div>

            <div className="flex w-full justify-end sm:block sm:w-auto">
              <ChatToolbar
                roomId={roomId}
                updateEmojiUrls={updateEmojiUrls}
                updateImgFiles={updateImgFiles}
                updateFileAttachments={updateFileAttachments}
                setAudioFile={setAudioFile}
                setEmojiMetaByUrl={setEmojiMetaByUrl}
                disableSendMessage={isSubmitting}
                disableRichMessageActions={isSubmitting}
                disableImportChatText={isSubmitting}
                onApplyImageTempAnnotations={() => applyMediaAnnotationPreference("image")}
                onApplyAudioTempAnnotations={() => applyMediaAnnotationPreference("audio")}
                handleMessageSubmit={() => {
                  void handleSubmit();
                }}
                currentChatStatus={currentChatStatus}
                onChangeChatStatus={setCurrentChatStatus}
                layout={toolbarLayout}
                showStatusBar={false}
                showWebgalLinkToggle={false}
                showRunModeToggle={false}
                showWebgalControls={false}
                showRunControls={false}
              />
            </div>
          </div>

          <TextStyleToolbar chatInputRef={chatInputRef} className="px-2 pb-1" />
        </div>
      </div>
    </div>
  );
}

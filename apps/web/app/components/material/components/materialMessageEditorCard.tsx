import type { MouseEvent } from "react";

import { TrashIcon } from "@phosphor-icons/react";
import { useCallback, useMemo, useRef, useState } from "react";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { MessageDraft } from "@/types/messageDraft";

import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import EditableMessageContent from "@/components/chat/message/editableMessageContent";
import {
  CHAT_MESSAGE_ANNOTATIONS_CLASS,
  CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS,
  CHAT_MESSAGE_ROW_CLASS,
  getChatMessageHoverToolbarClass,
} from "@/components/chat/message/messageCardStyle";
import MessageContentRenderer from "@/components/chat/message/messageContentRenderer";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { Edit2Outline, EmojiIconWhite } from "@/icons";
import {
  ANNOTATION_IDS,
  areAnnotationsEqual,
  hasAnnotation,
  normalizeAnnotations,
  toggleAnnotation,
} from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { getScreenSize } from "@/utils/getScreenSize";

type MaterialMessageEditorCardProps = {
  message: MessageDraft;
  index: number;
  onChange: (updater: (message: MessageDraft) => MessageDraft) => void;
  onDelete: () => void;
}

export default function MaterialMessageEditorCard({
  message,
  index,
  onChange,
  onDelete,
}: MaterialMessageEditorCardProps) {
  const annotations = useMemo(() => {
    const base = normalizeAnnotations(message.annotations);
    if (message.messageType === MESSAGE_TYPE.IMG && (message.extra as any)?.imageMessage?.background) {
      return base.includes(ANNOTATION_IDS.BACKGROUND) ? base : [...base, ANNOTATION_IDS.BACKGROUND];
    }
    return base;
  }, [message.annotations, message.extra, message.messageType]);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const editInputRef = useRef<ChatInputAreaHandle | null>(null);
  const isMobile = getScreenSize() === "sm";
  const useChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const canEditContent = message.messageType === MESSAGE_TYPE.TEXT
    || message.messageType === MESSAGE_TYPE.INTRO_TEXT
    || message.messageType === MESSAGE_TYPE.DICE;
  const canShowTextStyleToolbar = isEditingContent && canEditContent;
  const textStyleToolbar = canShowTextStyleToolbar
    ? (
        <TextStyleToolbar
          chatInputRef={editInputRef}
          visible={canShowTextStyleToolbar}
          className="text-style-toolbar"
        />
      )
    : null;
  const hoverToolbarClassName = getChatMessageHoverToolbarClass(isMobile);

  const updateMessage = useCallback((updater: (current: MessageDraft) => MessageDraft) => {
    onChange((current) => {
      const next = updater(current);
      return {
        ...next,
        extra: next.extra ?? {},
      };
    });
  }, [onChange]);

  const handleContentUpdate = useCallback((content: string) => {
    updateMessage(current => ({
      ...current,
      content,
    }));
  }, [updateMessage]);

  const handleDiceContentUpdate = useCallback((content: string) => {
    updateMessage(current => ({
      ...current,
      content,
      extra: {
        ...current.extra,
        diceResult: { result: content },
      },
    }));
  }, [updateMessage]);

  const handleUpdateAnnotations = useCallback((next: string[]) => {
    const nextAnnotations = normalizeAnnotations(next);
    const annotationsChanged = !areAnnotationsEqual(message.annotations, nextAnnotations);
    if (message.messageType === MESSAGE_TYPE.IMG && (message.extra as any)?.imageMessage) {
      const currentExtra = (message.extra ?? {}) as Record<string, any>;
      const currentImageMessage = currentExtra.imageMessage ?? {};
      const nextBackground = hasAnnotation(nextAnnotations, ANNOTATION_IDS.BACKGROUND);
      const currentBackground = Boolean(currentImageMessage.background);
      if (!annotationsChanged && nextBackground === currentBackground) {
        return;
      }
      updateMessage(current => ({
        ...current,
        annotations: nextAnnotations,
        extra: {
          ...current.extra,
          imageMessage: {
            ...((current.extra ?? {}) as Record<string, any>).imageMessage,
            background: nextBackground,
          },
        },
      }));
      return;
    }
    if (!annotationsChanged) {
      return;
    }
    updateMessage(current => ({
      ...current,
      annotations: nextAnnotations,
    }));
  }, [message.annotations, message.extra, message.messageType, updateMessage]);

  const handleToggleAnnotation = useCallback((id: string) => {
    handleUpdateAnnotations(toggleAnnotation(annotations, id));
  }, [annotations, handleUpdateAnnotations]);

  const handleOpenAnnotations = useCallback(() => {
    openMessageAnnotationPicker({
      initialSelected: annotations,
      messageType: message.messageType,
      onChange: handleUpdateAnnotations,
    });
  }, [annotations, handleUpdateAnnotations, message.messageType]);

  const shouldIgnoreEditBlur = useCallback((target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) {
      return false;
    }
    return Boolean(element.closest(".text-style-toolbar") || element.closest(".modal"));
  }, []);

  const handleEditMessageClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window === "undefined") {
      return;
    }
    const target = document.querySelector(
      `[data-material-message-index="${index}"] .editable-field`,
    ) as HTMLElement | null;
    if (!target) {
      return;
    }
    target.dispatchEvent(new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: target.offsetLeft + target.offsetWidth / 2,
      clientY: target.offsetTop + target.offsetHeight / 2,
    }));
  }, [index]);

  const renderedContent = (() => {
    if (message.messageType === MESSAGE_TYPE.TEXT) {
      return (
        <EditableMessageContent
          content={message.content ?? ""}
          onCommit={handleContentUpdate}
          className="editable-field whitespace-pre-wrap break-words"
          editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full"
          onEditingChange={setIsEditingContent}
          editInputRef={editInputRef}
          shouldIgnoreBlur={shouldIgnoreEditBlur}
          canEdit={true}
        />
      );
    }

    if (message.messageType === MESSAGE_TYPE.INTRO_TEXT) {
      return (
        <EditableMessageContent
          content={message.content ?? ""}
          onCommit={handleContentUpdate}
          className="editable-field whitespace-pre-wrap break-words"
          editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full"
          onEditingChange={setIsEditingContent}
          editInputRef={editInputRef}
          shouldIgnoreBlur={shouldIgnoreEditBlur}
          canEdit={true}
        />
      );
    }

    if (message.messageType === MESSAGE_TYPE.DICE) {
      const diceResult = ((message.extra ?? {}) as Record<string, any>).diceResult;
      const result = diceResult?.result || message.content || "";
      return (
        <div className="text-sm">
          <div>
            <EditableMessageContent
              content={result}
              onCommit={handleDiceContentUpdate}
              className="editable-field whitespace-pre-wrap break-words"
              editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full"
              onEditingChange={setIsEditingContent}
              editInputRef={editInputRef}
              shouldIgnoreBlur={shouldIgnoreEditBlur}
              canEdit={true}
            />
          </div>
        </div>
      );
    }

    return (
      <MessageContentRenderer
        message={{
          ...message,
          content: message.content ?? "",
          messageId: index + 1,
          messageType: message.messageType ?? MESSAGE_TYPE.TEXT,
          roomId: undefined,
          status: 0,
        }}
        annotations={annotations}
        cacheKeyBase={`material-editor:${index}`}
      />
    );
  })();

  const messageHoverToolbar = (
    <div className={hoverToolbarClassName}>
      <button
        type="button"
        className="
          btn btn-ghost btn-xs h-7 w-7 min-h-0 rounded-full p-0
          text-base-content/70
          hover:bg-base-300/70 hover:text-base-content
        "
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleOpenAnnotations();
        }}
        title="添加标注"
        aria-label="添加标注"
      >
        <EmojiIconWhite className="h-4 w-4" />
      </button>
      {canEditContent && (
        <button
          type="button"
          className="
            btn btn-ghost btn-xs h-7 w-7 min-h-0 rounded-full p-0
            text-base-content/70
            hover:bg-base-300/70 hover:text-base-content
          "
          onClick={handleEditMessageClick}
          title="编辑"
          aria-label="编辑"
        >
          <Edit2Outline className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        className="
          btn btn-ghost btn-xs h-7 w-7 min-h-0 rounded-full p-0
          text-base-content/70
          hover:bg-error/10 hover:text-error
        "
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete();
        }}
        title="删除素材条目"
        aria-label="删除素材条目"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );

  const annotationsBar = (
    <MessageAnnotationsBar
      annotations={annotations}
      canEdit={true}
      onToggle={handleToggleAnnotation}
      onOpenPicker={handleOpenAnnotations}
      showWhenEmpty={true}
      alwaysShowAddButton={true}
      showAddButton={true}
      compact={isMobile}
      className={useChatBubbleStyle ? CHAT_MESSAGE_ANNOTATIONS_CLASS : "mt-1.5"}
    />
  );

  return (
    <div className="group relative" data-material-message-index={index}>
      {textStyleToolbar}
      {useChatBubbleStyle
        ? (
            <div className={CHAT_MESSAGE_ROW_CLASS}>
              {messageHoverToolbar}

              <div className="flex min-w-0 flex-1 flex-col items-start">
                <div className={CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS}>
                  {renderedContent}
                </div>

                {annotationsBar}
              </div>
            </div>
          )
        : (
            <div className="
              flex w-full py-1.5
              sm:py-2
              relative
            ">
              {messageHoverToolbar}

              <div className="
                flex-1 min-w-0 p-0.5
                sm:p-1
                pr-2
                sm:pr-5
              ">
                <div className="
                  relative transition-all duration-200 rounded-lg p-1.5
                  sm:p-2
                  break-words text-base
                  sm:text-sm
                  lg:text-base
                  hover:bg-base-200/50
                ">
                  {renderedContent}
                </div>

                {annotationsBar}
              </div>
            </div>
          )}
    </div>
  );
}

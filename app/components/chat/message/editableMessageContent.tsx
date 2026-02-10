import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ChatInputArea from "@/components/chat/input/chatInputArea";
import { TextEnhanceRenderer } from "@/components/common/textEnhanceRenderer";

interface EditableMessageContentProps {
  content: string;
  className?: string;
  editorClassName?: string;
  placeholder?: string;
  canEdit?: boolean;
  onCommit: (nextContent: string) => void;
  onEditingChange?: (editing: boolean) => void;
  editInputRef?: React.RefObject<ChatInputAreaHandle | null>;
  shouldIgnoreBlur?: (relatedTarget: EventTarget | null) => boolean;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Convert plain text to HTML safe for contentEditable.
function plainTextToHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function EditableMessageContent({
  content,
  className,
  editorClassName,
  placeholder = "",
  canEdit = true,
  onCommit,
  onEditingChange,
  editInputRef,
  shouldIgnoreBlur,
}: EditableMessageContentProps) {
  const innerRef = useRef<ChatInputAreaHandle | null>(null);
  const chatInputRef = editInputRef ?? innerRef;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const wasEditingRef = useRef(false);
  const getEditorText = useCallback(() => {
    const raw = chatInputRef.current?.getRawElement();
    if (!raw) {
      return editContent;
    }
    return (raw.textContent ?? "").replace(/\u00A0/g, " ");
  }, [chatInputRef, editContent]);

  useEffect(() => {
    if (!isEditing) {
      setEditContent(content);
    }
  }, [content, isEditing]);

  useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  useEffect(() => {
    if (!isEditing || wasEditingRef.current) {
      wasEditingRef.current = isEditing;
      return;
    }
    const htmlContent = plainTextToHtml(editContent);
    chatInputRef.current?.setContent(htmlContent);
    chatInputRef.current?.triggerSync();
    chatInputRef.current?.focus();
    wasEditingRef.current = true;
  }, [chatInputRef, editContent, isEditing]);

  const startEditing = useCallback(() => {
    if (canEdit) {
      setIsEditing(true);
    }
  }, [canEdit]);

  const commitEditing = useCallback(() => {
    onCommit(getEditorText());
    setIsEditing(false);
    wasEditingRef.current = false;
  }, [getEditorText, onCommit]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (shouldIgnoreBlur?.(event.relatedTarget)) {
      return;
    }
    commitEditing();
  }, [commitEditing, shouldIgnoreBlur]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey) {
      event.preventDefault();
      commitEditing();
    }
  }, [commitEditing]);

  if (!isEditing) {
    const cursorClass = className?.includes("cursor-")
      ? ""
      : (canEdit ? "cursor-text" : "cursor-default");
    return (
      <div
        className={`${className ?? ""} ${cursorClass}`}
        onDoubleClick={startEditing}
      >
        <TextEnhanceRenderer content={content} />
      </div>
    );
  }

  return (
    <ChatInputArea
      ref={chatInputRef}
      className={editorClassName}
      placeholder={placeholder}
      disabled={!canEdit}
      onInputSync={() => {
        setEditContent(getEditorText());
      }}
      onPasteFiles={() => {}}
      onKeyDown={handleKeyDown}
      onKeyUp={() => {}}
      onMouseDown={() => {}}
      onCompositionStart={() => {}}
      onCompositionEnd={() => {}}
      onBlur={handleBlur}
    />
  );
}

export default EditableMessageContent;

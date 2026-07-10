import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import { TextEnhanceRenderer } from "@/components/common/textEnhanceRenderer";

type EditableMessageContentProps = {
  content: string;
  displayContent?: string;
  className?: string;
  editorClassName?: string;
  placeholder?: string;
  canEdit?: boolean;
  onCommit: (nextContent: string) => void;
  onEditingChange?: (editing: boolean) => void;
  editInputRef?: React.RefObject<ChatInputAreaHandle | null>;
  shouldIgnoreBlur?: (relatedTarget: EventTarget | null) => boolean;
}

type CaretPoint = {
  clientX: number;
  clientY: number;
}

export const EDITABLE_MESSAGE_CONTENT_EDITING_CLASS = `
  rounded-md bg-base-content/10 caret-warning
  focus:outline-none focus:ring-0
`;

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

function normalizeEditorText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

function extractPlainText(element: HTMLDivElement | null) {
  if (!element) {
    return "";
  }
  return normalizeEditorText(element.innerText);
}

function moveCaretToEnd(element: HTMLDivElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function createCaretRangeFromPoint(point: CaretPoint): Range | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const legacyRange = doc.caretRangeFromPoint?.(point.clientX, point.clientY);
  if (legacyRange) {
    return legacyRange;
  }
  const position = doc.caretPositionFromPoint?.(point.clientX, point.clientY);
  if (!position) {
    return null;
  }
  const range = document.createRange();
  range.setStart(position.offsetNode, position.offset);
  range.collapse(true);
  return range;
}

function moveCaretToPoint(element: HTMLDivElement, point: CaretPoint | null) {
  if (!point) {
    moveCaretToEnd(element);
    return;
  }
  const range = createCaretRangeFromPoint(point);
  if (!range || !element.contains(range.commonAncestorContainer)) {
    moveCaretToEnd(element);
    return;
  }
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function EditableMessageContent({
  content,
  displayContent,
  className,
  placeholder = "",
  canEdit = true,
  onCommit,
  onEditingChange,
  editInputRef,
  shouldIgnoreBlur,
}: EditableMessageContentProps) {
  const innerRef = useRef<ChatInputAreaHandle | null>(null);
  const chatInputRef = editInputRef ?? innerRef;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editStartPointRef = useRef<CaretPoint | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const wasEditingRef = useRef(false);
  const editContentRef = useRef(editContent);
  const getEditorText = useCallback(() => {
    const editor = editorRef.current;
    return editor ? extractPlainText(editor) : editContentRef.current;
  }, []);

  useEffect(() => {
    editContentRef.current = editContent;
  }, [editContent]);

  useEffect(() => {
    if (!isEditing) {
      queueMicrotask(() => setEditContent(content));
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
    const editor = editorRef.current;
    if (editor) {
      editor.innerHTML = plainTextToHtml(editContent);
      editor.focus();
      moveCaretToPoint(editor, editStartPointRef.current);
      editStartPointRef.current = null;
    }
    wasEditingRef.current = true;
  }, [editContent, isEditing]);

  useImperativeHandle(chatInputRef, () => ({
    setContent: (htmlContent, options) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      editor.innerHTML = htmlContent;
      editContentRef.current = extractPlainText(editor);
      if (options?.moveCursorToEnd !== false) {
        moveCaretToEnd(editor);
      }
    },
    focus: (options) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      editor.focus();
      if (options?.moveCursorToEnd !== false) {
        moveCaretToEnd(editor);
      }
    },
    insertNodeAtCursor: (node, options) => {
      const editor = editorRef.current;
      if (!editor) {
        return false;
      }
      editor.focus();
      const selection = window.getSelection();
      if (!selection) {
        return false;
      }
      let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (!range || !editor.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      if (options?.replaceSelection !== false) {
        range.deleteContents();
      }
      const insertedNode = typeof node === "string" ? document.createTextNode(node) : node;
      range.insertNode(insertedNode);
      range.setStartAfter(insertedNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      if (options?.moveCursorToEnd) {
        moveCaretToEnd(editor);
      }
      editContentRef.current = extractPlainText(editor);
      return true;
    },
    getTextAroundCursor: () => {
      const text = extractPlainText(editorRef.current);
      return { before: text, after: "" };
    },
    getCaretClientRect: () => null,
    getRawElement: () => editorRef.current,
    triggerSync: () => {
      editContentRef.current = extractPlainText(editorRef.current);
    },
    getPlainText: () => extractPlainText(editorRef.current),
  }), [chatInputRef]);

  const startEditing = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (canEdit) {
      event.preventDefault();
      event.stopPropagation();
      window.getSelection()?.removeAllRanges();
      editStartPointRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      setIsEditing(true);
    }
  }, [canEdit]);

  const preventNativeMultiClickSelection = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (canEdit && !isEditing && event.detail > 1) {
      event.preventDefault();
    }
  }, [canEdit, isEditing]);

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
    if (event.nativeEvent.isComposing)
      return;
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey) {
      event.preventDefault();
      commitEditing();
    }
  }, [commitEditing]);

  const cursorClass = className?.includes("cursor-")
    ? ""
    : (canEdit ? "cursor-text" : "cursor-default");

  return (
    <div
      ref={editorRef}
      className={`
        ${className ?? ""}
        ${cursorClass}
        ${isEditing ? EDITABLE_MESSAGE_CONTENT_EDITING_CLASS : ""}
      `}
      contentEditable={isEditing && canEdit}
      role={isEditing ? "textbox" : undefined}
      aria-label={isEditing ? "编辑消息内容" : undefined}
      aria-multiline={isEditing ? "true" : undefined}
      aria-disabled={isEditing && !canEdit ? true : undefined}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onMouseDown={preventNativeMultiClickSelection}
      onDoubleClick={startEditing}
      onInput={() => {
        editContentRef.current = getEditorText();
      }}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {isEditing ? editContent : <TextEnhanceRenderer content={displayContent ?? content} />}
    </div>
  );
}

export default EditableMessageContent;

import React from "react";

export type InlineTextEditorCaretPoint = {
  clientX: number;
  clientY: number;
}

type UseInlineTextEditorOptions = {
  enabled?: boolean;
  initialValue: string;
  normalize?: (value: string) => string;
  onCommit: (value: string) => void;
  onCancel?: () => void;
}

export function getInlineTextCommitValue({
  initialValue,
  nextValue,
  normalize = value => value,
}: {
  initialValue: string;
  nextValue: string;
  normalize?: (value: string) => string;
}): string | undefined {
  const normalizedInitial = normalize(initialValue);
  const normalizedNext = normalize(nextValue);
  return normalizedInitial === normalizedNext ? undefined : normalizedNext;
}

function createCaretRangeFromPoint(point: InlineTextEditorCaretPoint): Range | null {
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

function moveCaretToEnd(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function moveCaretToPoint(element: HTMLElement, point: InlineTextEditorCaretPoint | null) {
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

export function normalizeInlineRoleName(value: string): string {
  return value
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/^【\s*/, "")
    .replace(/\s*】$/, "")
    .trim();
}

export function useInlineTextEditor<TElement extends HTMLElement>({
  enabled = true,
  initialValue,
  normalize = value => value,
  onCommit,
  onCancel,
}: UseInlineTextEditorOptions) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const editorRef = React.useRef<TElement | null>(null);
  const editStartPointRef = React.useRef<InlineTextEditorCaretPoint | null>(null);
  const wasEditingRef = React.useRef(false);

  React.useEffect(() => {
    if (!isEditing) {
      wasEditingRef.current = false;
      return;
    }
    if (wasEditingRef.current) {
      return;
    }
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    editor.textContent = draft;
    editor.focus();
    moveCaretToPoint(editor, editStartPointRef.current);
    editStartPointRef.current = null;
    wasEditingRef.current = true;
  }, [draft, isEditing]);

  const cancel = React.useCallback(() => {
    setIsEditing(false);
    setDraft("");
    editStartPointRef.current = null;
    onCancel?.();
  }, [onCancel]);

  const reset = React.useCallback(() => {
    setIsEditing(false);
    setDraft("");
    wasEditingRef.current = false;
    editStartPointRef.current = null;
  }, []);

  const syncDraft = React.useCallback(() => {
    setDraft(editorRef.current?.innerText ?? "");
  }, []);

  const commit = React.useCallback(() => {
    const value = getInlineTextCommitValue({
      initialValue,
      nextValue: editorRef.current?.innerText ?? draft,
      normalize,
    });
    if (value === undefined) {
      setIsEditing(false);
      return;
    }
    onCommit(value);
    setIsEditing(false);
  }, [draft, initialValue, normalize, onCommit]);

  const preventMultiClickSelection = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (enabled && event.detail > 1) {
      event.preventDefault();
    }
  }, [enabled]);

  const startEditing = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!enabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    window.getSelection()?.removeAllRanges();
    editStartPointRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
    setDraft(initialValue);
    setIsEditing(true);
  }, [enabled, initialValue]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing)
      return;
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey) {
      event.preventDefault();
      syncDraft();
      commit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }, [cancel, commit, syncDraft]);

  return React.useMemo(() => ({
    editorRef,
    isEditing,
    draft,
    setDraft,
    startEditing,
    syncDraft,
    commit,
    cancel,
    reset,
    preventMultiClickSelection,
    handleKeyDown,
  }), [
    cancel,
    commit,
    draft,
    handleKeyDown,
    isEditing,
    preventMultiClickSelection,
    reset,
    startEditing,
    syncDraft,
  ]);
}

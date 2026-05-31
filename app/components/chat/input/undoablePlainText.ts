type EditableSelectionDeps = {
  doc?: Document | null;
  view?: Window | null;
};

function getEditableDocument(editor: HTMLElement, deps?: EditableSelectionDeps) {
  return deps?.doc ?? editor.ownerDocument ?? (typeof document === "undefined" ? null : document);
}

function getEditableWindow(doc: Document | null, deps?: EditableSelectionDeps) {
  return deps?.view ?? doc?.defaultView ?? (typeof window === "undefined" ? null : window);
}

function rangeBelongsToEditor(editor: HTMLElement, range: Range) {
  return editor.contains(range.startContainer) && editor.contains(range.endContainer);
}

function placeSelectionAtEnd(editor: HTMLElement, doc: Document, selection: Selection) {
  const range = doc.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
}

function restoreSelection(editor: HTMLElement, selection: Selection, range: Range | null | undefined, doc: Document) {
  if (range && rangeBelongsToEditor(editor, range)) {
    try {
      selection.removeAllRanges();
      selection.addRange(range);
      return range;
    }
    catch {
      return placeSelectionAtEnd(editor, doc, selection);
    }
  }

  if (selection.rangeCount > 0) {
    const activeRange = selection.getRangeAt(0);
    if (rangeBelongsToEditor(editor, activeRange)) {
      return activeRange;
    }
  }

  return placeSelectionAtEnd(editor, doc, selection);
}

function insertTextWithRangeFallback(selection: Selection, range: Range, text: string, doc: Document) {
  range.deleteContents();
  const textNode = doc.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function insertPlainTextWithUndo(
  editor: HTMLElement | null,
  text: string,
  options: {
    range?: Range | null;
  } & EditableSelectionDeps = {},
) {
  if (!editor || text.length === 0) {
    return false;
  }

  const doc = getEditableDocument(editor, options);
  const view = getEditableWindow(doc, options);
  const selection = view?.getSelection();
  if (!doc || !selection) {
    return false;
  }

  editor.focus();
  const range = restoreSelection(editor, selection, options.range, doc);
  const didInsertWithUndo = typeof doc.execCommand === "function"
    && doc.execCommand("insertText", false, text);

  if (!didInsertWithUndo) {
    insertTextWithRangeFallback(selection, range, text, doc);
  }

  return true;
}

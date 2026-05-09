import type {
  UserReadMeInlineMark,
  UserReadMeInlineMarkType,
  UserReadMeMessageNode,
} from "./userReadMeMessageDoc";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { getRemoteSnapshot, setRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/blocksuite/document/docSnapshotCache";
import { TextEnhanceRenderer } from "@/components/common/textEnhanceRenderer";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { getEditorRange } from "@/utils/getSelectionCoords";
import {
  createUserReadMeNodeId,
  createUserReadMeSnapshot,
  decodeUserReadMeNodes,
  ensureUserReadMeNodes,
  getUserReadMeInlineMarks,
  mergeUserReadMeNodeBackward,
  mergeUserReadMeNodeForward,
  serializeUserReadMeNodes,
  setUserReadMeInlineMarks,
  splitUserReadMeNode,
  toggleUserReadMeInlineMark,
} from "./userReadMeMessageDoc";

interface FocusRequest {
  nodeId: string;
  selectionStart: number;
  selectionEnd: number;
}

interface SelectionSnapshot {
  selectionStart: number;
  selectionEnd: number;
}

interface UserReadMeMessageEditorProps {
  userId: number;
  isOwner: boolean;
  docId: string;
}

const INLINE_MARK_LABELS: Record<UserReadMeInlineMarkType, string> = {
  bold: "B",
  italic: "I",
  code: "</>",
  highlight: "H",
};

const INLINE_MARK_BUTTONS: Array<{
  type: UserReadMeInlineMarkType;
  title: string;
  shortcut: string;
}> = [
  { type: "bold", title: "粗体", shortcut: "⌘/Ctrl+B" },
  { type: "italic", title: "斜体", shortcut: "⌘/Ctrl+I" },
  { type: "code", title: "代码", shortcut: "⌘/Ctrl+E" },
  { type: "highlight", title: "高亮", shortcut: "⌘/Ctrl+Shift+H" },
];

const INLINE_MARK_RENDER_ORDER: UserReadMeInlineMarkType[] = ["highlight", "code", "bold", "italic"];

function normalizePlainText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

function getDomPositionFromOffset(root: HTMLElement, targetOffset: number) {
  let traversed = 0;

  const locate = (node: Node): { node: Node; offset: number } | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = normalizePlainText(node.textContent ?? "").length;
      if (targetOffset <= traversed + textLength) {
        return {
          node,
          offset: Math.max(0, targetOffset - traversed),
        };
      }
      traversed += textLength;
      return null;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as HTMLElement;
    if (element.tagName === "BR") {
      if (targetOffset <= traversed) {
        const parent = element.parentNode ?? root;
        const offset = Array.from(parent.childNodes).indexOf(element);
        return {
          node: parent,
          offset,
        };
      }
      traversed += 1;
      const parent = element.parentNode ?? root;
      const offset = Array.from(parent.childNodes).indexOf(element) + 1;
      if (targetOffset <= traversed) {
        return {
          node: parent,
          offset,
        };
      }
      return null;
    }

    for (const child of Array.from(element.childNodes)) {
      const position = locate(child);
      if (position) {
        return position;
      }
    }

    return null;
  };

  const found = locate(root);
  if (found) {
    return found;
  }

  return {
    node: root,
    offset: root.childNodes.length,
  };
}

function setEditorSelectionOffsets(root: HTMLElement, selection: SelectionSnapshot) {
  const range = document.createRange();
  const start = getDomPositionFromOffset(root, selection.selectionStart);
  const end = getDomPositionFromOffset(root, selection.selectionEnd);
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);

  const browserSelection = window.getSelection();
  browserSelection?.removeAllRanges();
  browserSelection?.addRange(range);
}

function getEditorSelectionOffsets(root: HTMLElement): SelectionSnapshot | null {
  const selectionInfo = getEditorRange(root);
  if (!selectionInfo) {
    return null;
  }

  const { range } = selectionInfo;
  const startRange = document.createRange();
  startRange.selectNodeContents(root);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = document.createRange();
  endRange.selectNodeContents(root);
  endRange.setEnd(range.endContainer, range.endOffset);

  return {
    selectionStart: normalizePlainText(startRange.toString()).length,
    selectionEnd: normalizePlainText(endRange.toString()).length,
  };
}

function getMarkTypeFromElement(element: HTMLElement): UserReadMeInlineMarkType | null {
  const markType = element.dataset.markType;
  if (markType === "bold" || markType === "italic" || markType === "code" || markType === "highlight") {
    return markType;
  }

  switch (element.tagName) {
    case "STRONG":
    case "B":
      return "bold";
    case "EM":
    case "I":
      return "italic";
    case "CODE":
      return "code";
    case "MARK":
      return "highlight";
    default:
      return null;
  }
}

function parseRichTextEditorElement(root: HTMLElement): {
  content: string;
  marks: UserReadMeInlineMark[];
} {
  const parts: string[] = [];
  const marks: UserReadMeInlineMark[] = [];
  let offset = 0;

  const visit = (node: Node, activeMarks: UserReadMeInlineMarkType[]) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizePlainText(node.textContent ?? "");
      if (!text) {
        return;
      }
      const start = offset;
      parts.push(text);
      offset += text.length;
      for (const type of activeMarks) {
        marks.push({
          markId: createUserReadMeNodeId(),
          type,
          start,
          end: offset,
        });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    if (element.tagName === "BR") {
      parts.push("\n");
      offset += 1;
      return;
    }

    const markType = getMarkTypeFromElement(element);
    const nextActiveMarks = markType && !activeMarks.includes(markType)
      ? [...activeMarks, markType]
      : activeMarks;

    for (const child of Array.from(element.childNodes)) {
      visit(child, nextActiveMarks);
    }
  };

  for (const child of Array.from(root.childNodes)) {
    visit(child, []);
  }

  return {
    content: parts.join(""),
    marks,
  };
}

function insertPlainTextAtSelection(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  const nextRange = document.createRange();
  nextRange.setStart(textNode, textNode.textContent?.length ?? 0);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
}

function renderMarkedText(content: string, marks: UserReadMeInlineMark[]) {
  if (!content) {
    return null;
  }

  if (marks.length === 0) {
    return <TextEnhanceRenderer content={content} />;
  }

  const boundaries = new Set<number>([0, content.length]);
  for (const mark of marks) {
    boundaries.add(mark.start);
    boundaries.add(mark.end);
  }
  const sorted = Array.from(boundaries).sort((left, right) => left - right);

  return sorted.slice(0, -1).map((start, index) => {
    const end = sorted[index + 1];
    const text = content.slice(start, end);
    if (!text) {
      return null;
    }

    const activeMarks = marks
      .filter(mark => mark.start < end && mark.end > start)
      .map(mark => mark.type);

    let node = <>{text}</>;
    for (const type of INLINE_MARK_RENDER_ORDER) {
      if (!activeMarks.includes(type)) {
        continue;
      }
      switch (type) {
        case "bold":
          node = <strong className="font-semibold">{node}</strong>;
          break;
        case "italic":
          node = <em className="italic">{node}</em>;
          break;
        case "code":
          node = <code className="rounded bg-base-200 px-1 py-0.5 font-mono text-[0.92em] text-base-content">{node}</code>;
          break;
        case "highlight":
          node = <mark className="rounded bg-warning/25 px-0.5 text-inherit">{node}</mark>;
          break;
      }
    }

    return <span key={`${start}-${end}`}>{node}</span>;
  });
}

function ReadOnlyNode({ node }: { node: UserReadMeMessageNode }) {
  const marks = getUserReadMeInlineMarks(node);

  if (node.messageType === MESSAGE_TYPE.INTRO_TEXT) {
    return (
      <div className="rounded-md bg-black px-4 py-2 text-white">
        <span className="whitespace-pre-wrap break-words text-white">
          {renderMarkedText(node.content, marks)}
        </span>
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap break-words px-1 py-0.5 text-base-content/90">
      {renderMarkedText(node.content, marks)}
    </div>
  );
}

function InlineToolbar({
  disabled,
  onApply,
}: {
  disabled: boolean;
  onApply: (type: UserReadMeInlineMarkType) => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-1 px-1">
      {INLINE_MARK_BUTTONS.map(button => (
        <button
          key={button.type}
          type="button"
          disabled={disabled}
          title={`${button.title} ${button.shortcut}`}
          className="flex h-8 min-w-8 items-center justify-center rounded-md border border-transparent px-2 text-xs text-base-content/60 transition hover:border-base-300 hover:bg-base-200/60 hover:text-base-content disabled:cursor-default disabled:opacity-30"
          onMouseDown={event => event.preventDefault()}
          onClick={() => onApply(button.type)}
        >
          {INLINE_MARK_LABELS[button.type]}
        </button>
      ))}
    </div>
  );
}

function EditableNode({
  node,
  registerEditor,
  onSelectionChange,
  onFocus,
  onChange,
  onKeyDown,
}: {
  node: UserReadMeMessageNode;
  registerEditor: (nodeId: string, element: HTMLDivElement | null) => void;
  onSelectionChange: (nodeId: string, selection: SelectionSnapshot | null) => void;
  onFocus: (nodeId: string) => void;
  onChange: (nodeId: string, nextContent: string, nextMarks: UserReadMeInlineMark[], nextSelection: SelectionSnapshot | null) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, nodeId: string) => void;
}) {
  const marks = useMemo(() => getUserReadMeInlineMarks(node), [node]);

  const handleInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const editor = event.currentTarget;
    const selection = getEditorSelectionOffsets(editor);
    const parsed = parseRichTextEditorElement(editor);
    onChange(node.nodeId, parsed.content, parsed.marks, selection);
  }, [node.nodeId, onChange]);

  const handleSelectionUpdate = useCallback((event: React.SyntheticEvent<HTMLDivElement>) => {
    onSelectionChange(node.nodeId, getEditorSelectionOffsets(event.currentTarget));
  }, [node.nodeId, onSelectionChange]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    const plainText = event.clipboardData.getData("text/plain");
    if (!plainText) {
      return;
    }
    event.preventDefault();
    insertPlainTextAtSelection(plainText);
    const editor = event.currentTarget;
    const selection = getEditorSelectionOffsets(editor);
    const parsed = parseRichTextEditorElement(editor);
    onChange(node.nodeId, parsed.content, parsed.marks, selection);
  }, [node.nodeId, onChange]);

  return (
    <div
      ref={element => registerEditor(node.nodeId, element)}
      contentEditable
      suppressContentEditableWarning={true}
      spellCheck={false}
      role="textbox"
      aria-multiline={true}
      aria-label="个人主页段落"
      tabIndex={0}
      className={`block min-h-7 w-full whitespace-pre-wrap break-words rounded-md border border-transparent px-1 py-0.5 text-base leading-6 caret-primary focus:border-transparent focus:outline-none focus:ring-0 ${
        node.messageType === MESSAGE_TYPE.INTRO_TEXT
          ? "bg-black text-white"
          : "text-base-content"
      }`}
      onFocus={() => onFocus(node.nodeId)}
      onInput={handleInput}
      onKeyDown={event => onKeyDown(event, node.nodeId)}
      onKeyUp={handleSelectionUpdate}
      onMouseUp={handleSelectionUpdate}
      onPaste={handlePaste}
    >
      {renderMarkedText(node.content, marks)}
    </div>
  );
}

/**
 * 个人主页 ReadMe 的线性消息流编辑器。
 * 当前只在 user readme 页面启用，用来验证 message-stream 文档视图。
 */
export default function UserReadMeMessageEditor({
  userId,
  isOwner,
  docId,
}: UserReadMeMessageEditorProps) {
  const [nodes, setNodes] = useState<UserReadMeMessageNode[]>(() => ensureUserReadMeNodes([]));
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const editorMapRef = useRef(new Map<string, HTMLDivElement>());
  const selectionMapRef = useRef(new Map<string, SelectionSnapshot>());
  const pendingFocusRef = useRef<FocusRequest | null>(null);
  const readyRef = useRef(false);
  const lastSavedSerializedRef = useRef("");
  const saveErrorToastRef = useRef(0);

  const serializedNodes = useMemo(() => serializeUserReadMeNodes(nodes), [nodes]);

  const applyFocusRequest = useCallback((focusRequest: FocusRequest) => {
    const editor = editorMapRef.current.get(focusRequest.nodeId);
    if (!editor) {
      return false;
    }

    const contentLength = normalizePlainText(editor.textContent ?? "").length;
    const selectionStart = Math.max(0, Math.min(focusRequest.selectionStart, contentLength));
    const selectionEnd = Math.max(selectionStart, Math.min(focusRequest.selectionEnd, contentLength));
    editor.focus();
    setEditorSelectionOffsets(editor, {
      selectionStart,
      selectionEnd,
    });
    selectionMapRef.current.set(focusRequest.nodeId, {
      selectionStart,
      selectionEnd,
    });
    return true;
  }, []);

  const requestFocus = useCallback((focusRequest: FocusRequest) => {
    if (applyFocusRequest(focusRequest)) {
      pendingFocusRef.current = null;
      return;
    }
    pendingFocusRef.current = focusRequest;
  }, [applyFocusRequest]);

  const registerEditor = useCallback((nodeId: string, element: HTMLDivElement | null) => {
    if (element) {
      editorMapRef.current.set(nodeId, element);
      return;
    }
    editorMapRef.current.delete(nodeId);
    selectionMapRef.current.delete(nodeId);
  }, []);

  const updateNodeRichText = useCallback((
    nodeId: string,
    nextContent: string,
    nextMarks: UserReadMeInlineMark[],
    nextSelection: SelectionSnapshot | null,
  ) => {
    setNodes((prev) => {
      const index = prev.findIndex(node => node.nodeId === nodeId);
      if (index < 0) {
        return prev;
      }

      const current = prev[index];
      const nextNode = setUserReadMeInlineMarks({
        ...current,
        content: nextContent,
      }, nextMarks);

      if (serializeUserReadMeNodes([current]) === serializeUserReadMeNodes([nextNode])) {
        return prev;
      }

      const next = [...prev];
      next[index] = nextNode;
      return next;
    });

    if (nextSelection) {
      requestFocus({
        nodeId,
        selectionStart: nextSelection.selectionStart,
        selectionEnd: nextSelection.selectionEnd,
      });
    }
  }, [requestFocus]);

  const moveFocusToAdjacent = useCallback((nodeId: string, direction: -1 | 1, caret: "start" | "end") => {
    const index = nodes.findIndex(node => node.nodeId === nodeId);
    const target = nodes[index + direction];
    if (!target) {
      return;
    }
    requestFocus({
      nodeId: target.nodeId,
      selectionStart: caret === "start" ? 0 : target.content.length,
      selectionEnd: caret === "start" ? 0 : target.content.length,
    });
  }, [nodes, requestFocus]);

  const applyInlineMarkToSelection = useCallback((
    nodeId: string,
    type: UserReadMeInlineMarkType,
    selection: SelectionSnapshot,
  ) => {
    if (selection.selectionStart === selection.selectionEnd) {
      toast.error("先选中文本");
      return;
    }

    setNodes((prev) => {
      const index = prev.findIndex(node => node.nodeId === nodeId);
      if (index < 0) {
        return prev;
      }
      const next = [...prev];
      next[index] = toggleUserReadMeInlineMark(prev[index], {
        type,
        start: selection.selectionStart,
        end: selection.selectionEnd,
      });
      return next;
    });

    requestFocus({
      nodeId,
      selectionStart: selection.selectionStart,
      selectionEnd: selection.selectionEnd,
    });
  }, [requestFocus]);

  const handleApplyInlineMark = useCallback((type: UserReadMeInlineMarkType) => {
    if (!activeNodeId) {
      toast.error("先选中一个段落");
      return;
    }
    const selection = selectionMapRef.current.get(activeNodeId);
    if (!selection) {
      toast.error("先选中文本");
      return;
    }
    applyInlineMarkToSelection(activeNodeId, type, selection);
  }, [activeNodeId, applyInlineMarkToSelection]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>, nodeId: string) => {
    const editor = event.currentTarget;
    const selection = getEditorSelectionOffsets(editor);
    if (!selection) {
      return;
    }

    if ((event.metaKey || event.ctrlKey) && !event.altKey) {
      const lowerKey = event.key.toLowerCase();
      if (lowerKey === "b") {
        event.preventDefault();
        applyInlineMarkToSelection(nodeId, "bold", selection);
        return;
      }
      if (lowerKey === "i") {
        event.preventDefault();
        applyInlineMarkToSelection(nodeId, "italic", selection);
        return;
      }
      if (lowerKey === "e") {
        event.preventDefault();
        applyInlineMarkToSelection(nodeId, "code", selection);
        return;
      }
      if (lowerKey === "h" && event.shiftKey) {
        event.preventDefault();
        applyInlineMarkToSelection(nodeId, "highlight", selection);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      setNodes((prev) => {
        const result = splitUserReadMeNode(prev, {
          nodeId,
          selectionStart: selection.selectionStart,
          selectionEnd: selection.selectionEnd,
        });
        requestFocus({
          nodeId: result.focus.nodeId,
          selectionStart: result.focus.caret,
          selectionEnd: result.focus.caret,
        });
        return result.nodes;
      });
      return;
    }

    if (event.key === "Backspace" && selection.selectionStart === selection.selectionEnd && selection.selectionStart === 0) {
      const result = mergeUserReadMeNodeBackward(nodes, nodeId);
      if (result) {
        event.preventDefault();
        requestFocus({
          nodeId: result.focus.nodeId,
          selectionStart: result.focus.caret,
          selectionEnd: result.focus.caret,
        });
        setNodes(result.nodes);
      }
      return;
    }

    if (event.key === "Delete" && selection.selectionStart === selection.selectionEnd && selection.selectionEnd === nodes.find(node => node.nodeId === nodeId)?.content.length) {
      const result = mergeUserReadMeNodeForward(nodes, nodeId);
      if (result) {
        event.preventDefault();
        requestFocus({
          nodeId: result.focus.nodeId,
          selectionStart: result.focus.caret,
          selectionEnd: result.focus.caret,
        });
        setNodes(result.nodes);
      }
      return;
    }

    if (event.key === "ArrowUp" && selection.selectionStart === selection.selectionEnd && selection.selectionStart === 0) {
      event.preventDefault();
      moveFocusToAdjacent(nodeId, -1, "end");
      return;
    }

    if (event.key === "ArrowDown") {
      const currentNode = nodes.find(node => node.nodeId === nodeId);
      if (currentNode && selection.selectionStart === selection.selectionEnd && selection.selectionEnd === currentNode.content.length) {
        event.preventDefault();
        moveFocusToAdjacent(nodeId, 1, "start");
      }
    }
  }, [applyInlineMarkToSelection, moveFocusToAdjacent, nodes, requestFocus]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setLoadState("loading");
      setErrorMessage("");
      try {
        const cachedSnapshot = getCachedDocSnapshot(docId);
        const snapshot = cachedSnapshot ?? await getRemoteSnapshot({
          entityType: "user",
          entityId: userId,
          docType: "readme",
        });
        if (cancelled) {
          return;
        }
        if (snapshot) {
          setCachedDocSnapshot(docId, snapshot);
        }
        const decodedNodes = ensureUserReadMeNodes(decodeUserReadMeNodes(snapshot));
        lastSavedSerializedRef.current = serializeUserReadMeNodes(decodedNodes);
        readyRef.current = true;
        setNodes(decodedNodes);
        setLoadState("ready");
      }
      catch (error) {
        if (cancelled) {
          return;
        }
        readyRef.current = true;
        setNodes(ensureUserReadMeNodes([]));
        setLoadState("error");
        setErrorMessage(error instanceof Error ? error.message : "加载失败");
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [docId, userId]);

  useLayoutEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }
    if (applyFocusRequest(pendingFocus)) {
      pendingFocusRef.current = null;
    }
  }, [applyFocusRequest, nodes]);

  useEffect(() => {
    if (!isOwner || !readyRef.current || loadState !== "ready") {
      return;
    }
    if (serializedNodes === lastSavedSerializedRef.current) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      const snapshot = createUserReadMeSnapshot(nodes);
      void setRemoteSnapshot({
        entityType: "user",
        entityId: userId,
        docType: "readme",
        snapshot,
      }).then(() => {
        setCachedDocSnapshot(docId, snapshot);
        lastSavedSerializedRef.current = serializedNodes;
      }).catch((error) => {
        console.error("[UserReadMe] save failed", error);
        const now = Date.now();
        if (now - saveErrorToastRef.current > 2500) {
          toast.error("个人主页保存失败");
          saveErrorToastRef.current = now;
        }
      });
    }, 500);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [docId, isOwner, loadState, nodes, serializedNodes, userId]);

  if (loadState === "loading") {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-md bg-base-100/50">
        <span className="loading loading-spinner loading-md text-base-content/50"></span>
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-md bg-transparent">
      {loadState === "error" && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-warning">
          <WarningCircleIcon className="h-4 w-4" />
          <span>{errorMessage || "加载失败"}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1">
          {isOwner && (
            <InlineToolbar
              disabled={!activeNodeId}
              onApply={handleApplyInlineMark}
            />
          )}
          {isOwner
            ? nodes.map(node => (
                <EditableNode
                  key={node.nodeId}
                  node={node}
                  registerEditor={registerEditor}
                  onFocus={setActiveNodeId}
                  onSelectionChange={(nodeId, selection) => {
                    if (selection) {
                      selectionMapRef.current.set(nodeId, selection);
                    }
                    else {
                      selectionMapRef.current.delete(nodeId);
                    }
                  }}
                  onChange={updateNodeRichText}
                  onKeyDown={handleKeyDown}
                />
              ))
            : nodes.filter(node => node.content.trim().length > 0).map(node => (
                <ReadOnlyNode key={node.nodeId} node={node} />
              ))}
        </div>
      </div>
    </section>
  );
}

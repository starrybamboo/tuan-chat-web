import type { MessageEditorSlashMenuItem } from "./components/MessageEditorSlashMenu";
import type { MessageEditorInsertableBlockKind } from "./model/messageEditorTransforms";
import type { MessageEditorController } from "./runtime/messageEditorController";
import type { DescriptionEntityType } from "@/components/chat/infra/doc/description/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/doc/document/docHeader";
import type { MessageDraft } from "@/types/messageDraft";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseDescriptionDocId } from "@/components/chat/infra/doc/description/descriptionDocId";
import { getRemoteSnapshot, prewarmRemoteSnapshot, setRemoteSnapshot } from "@/components/chat/infra/doc/description/descriptionDocRemote";
import { normalizeBlocksuiteDocHeader } from "@/components/chat/infra/doc/document/docHeader";
import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotCache";
import { useFloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";
import MessageContentRenderer from "../chat/message/messageContentRenderer";

import { MessageEditorSlashMenu } from "./components/MessageEditorSlashMenu";
import { MessageEditorTextBlock } from "./components/MessageEditorTextBlock";
import { MessageEditorToolbar } from "./components/MessageEditorToolbar";
import { createMessageEditorSnapshot, decodeMessageEditorMessages } from "./model/messageEditorCodec";
import {
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  getMessageEditorBlockType,
  normalizeMessageEditorContent,
} from "./model/messageEditorTransforms";
import { createMessageEditorController } from "./runtime/messageEditorController";
import { MessageEditorEventBus } from "./runtime/messageEditorEventBus";
import { createMessageEditorRegistry } from "./runtime/messageEditorRegistry";
import {
  createMessageEditorSelection,
  resolveMessageEditorSelectionFromRange,
  restoreMessageEditorSelection,
} from "./runtime/messageEditorSelection";

interface MessageEditorProps {
  className?: string;
  coverUrl?: string;
  docId?: string;
  excerpt?: string;
  intentPrewarm?: boolean;
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  readOnly?: boolean;
  spaceId?: number;
  tcHeader?: {
    enabled?: boolean;
    fallbackTitle?: string;
    fallbackImageUrl?: string;
    fallbackImageFileId?: number;
    fallbackOriginalImageFileId?: number;
    fallbackImageMediaType?: string;
  };
  title?: string;
  workspaceId?: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

interface MessageEditorDragState {
  draggedBlockId: string;
  position: "before" | "after";
  targetBlockId: string;
}

const MESSAGE_EDITOR_SLASH_ITEMS: MessageEditorSlashMenuItem[] = [
  { kind: "paragraph", keyword: "text", label: "正文", description: "普通文本段落" },
  { kind: "heading1", keyword: "h1", label: "大标题", description: "一级标题文本块" },
  { kind: "heading2", keyword: "h2", label: "中标题", description: "二级标题文本块" },
  { kind: "heading3", keyword: "h3", label: "小标题", description: "三级标题文本块" },
  { kind: "intro", keyword: "intro", label: "黑幕", description: "黑底文字块" },
  { kind: "image", keyword: "image", label: "图片", description: "插入图片消息块" },
  { kind: "file", keyword: "file", label: "文件", description: "插入文件消息块" },
  { kind: "audio", keyword: "audio", label: "音频", description: "插入音频消息块" },
  { kind: "video", keyword: "video", label: "视频", description: "插入视频消息块" },
  { kind: "dice", keyword: "dice", label: "骰子", description: "插入骰子结果块" },
  { kind: "choose", keyword: "choose", label: "选择", description: "插入 WebGAL 选项块" },
];

function normalizeEditableText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

function isSelectionAtStart(range: Range, blockElement: HTMLElement) {
  const selectionText = normalizeEditableText(range.toString());
  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(blockElement);
  prefixRange.setEnd(range.startContainer, range.startOffset);
  return prefixRange.toString().length === 0 && selectionText.length === 0;
}

function isSelectionAtEnd(range: Range, blockElement: HTMLElement) {
  const suffixRange = document.createRange();
  suffixRange.selectNodeContents(blockElement);
  suffixRange.setStart(range.endContainer, range.endOffset);
  return suffixRange.toString().length === 0 && normalizeEditableText(range.toString()).length === 0;
}

function parseSlashQuery(value: string): string | null {
  const normalized = value.trim();
  const match = normalized.match(/^\/(\S*)$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * 基于 message-stream 的线性文档编辑器。
 */
export default function MessageEditor({
  className,
  coverUrl,
  docId,
  excerpt: _excerpt,
  intentPrewarm = false,
  onTcHeaderChange,
  readOnly = false,
  spaceId: _spaceId,
  tcHeader,
  title,
  workspaceId: _workspaceId,
}: MessageEditorProps) {
  const frameClassName = className ?? "h-full min-h-0 rounded-md";
  const resolvedTitle = title?.trim() || tcHeader?.fallbackTitle?.trim() || "消息";
  const resolvedCoverUrl = coverUrl || tcHeader?.fallbackImageUrl || "";
  const resolvedDocId = docId?.trim() || undefined;
  const remoteKey = useMemo(() => {
    return resolvedDocId ? parseDescriptionDocId(resolvedDocId) : null;
  }, [resolvedDocId]);
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const blockRefsRef = useRef(new Map<string, HTMLDivElement>());
  const messagesRef = useRef<MessageDraft[]>([]);
  const controllerRef = useRef<MessageEditorController | null>(null);
  const restoreSelectionRef = useRef<{
    blockId?: string;
    caret?: number;
    selection?: ReturnType<typeof createMessageEditorSelection>;
  } | null>(null);
  const [messages, setMessages] = useState<MessageDraft[]>(() => ensureMessageEditorMessages([]));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<MessageEditorDragState | null>(null);
  const [slashSelectionIndex, setSlashSelectionIndex] = useState(0);
  const [dismissedSlashKey, setDismissedSlashKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [ready, setReady] = useState(!resolvedDocId);
  const registry = useMemo(() => createMessageEditorRegistry(), []);
  const eventBus = useMemo(() => new MessageEditorEventBus(), []);
  const header = useMemo(() => {
    return normalizeBlocksuiteDocHeader({
      title: resolvedTitle,
      imageUrl: resolvedCoverUrl,
      imageFileId: tcHeader?.fallbackImageFileId,
      originalImageFileId: tcHeader?.fallbackOriginalImageFileId,
      imageMediaType: tcHeader?.fallbackImageMediaType,
    });
  }, [
    resolvedCoverUrl,
    resolvedTitle,
    tcHeader?.fallbackImageFileId,
    tcHeader?.fallbackImageMediaType,
    tcHeader?.fallbackOriginalImageFileId,
  ]);
  const lastNotifyDigestRef = useRef("");
  const lastSavedSerializedRef = useRef("");

  const clearActiveBlock = useCallback(() => {
    setActiveBlockId(null);
    controllerRef.current?.setActiveBlock(null);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const setMessagesWithRef = useCallback((updater: (previous: MessageDraft[]) => MessageDraft[]) => {
    setMessages((previous) => {
      const next = ensureMessageEditorMessages(updater(previous));
      messagesRef.current = next;
      return next;
    });
  }, []);

  const getCurrentMessages = useCallback(() => {
    return messagesRef.current;
  }, []);

  useEffect(() => {
    controllerRef.current = createMessageEditorController({
      eventBus,
      registry,
      getMessages: getCurrentMessages,
      setMessages: setMessagesWithRef,
    });
  }, [eventBus, getCurrentMessages, registry, setMessagesWithRef]);

  const { toolbarRef, isFloatingVisible, toolbarPos, savedSelectionRef, hideToolbar } = useFloatingSelectionToolbar({
    visible: !readOnly,
    resolveEditorElement: useCallback((range: Range) => {
      const root = editorRootRef.current;
      if (!root) {
        return null;
      }
      const selection = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, range);
      if (!selection || selection.collapsed) {
        return null;
      }
      return root;
    }, [registry]),
  });

  const restorePendingSelection = useCallback(() => {
    const root = editorRootRef.current;
    const pending = restoreSelectionRef.current;
    if (!root || !pending) {
      return;
    }

    restoreSelectionRef.current = null;
    if (pending.selection) {
      const focusBlock = root.querySelector<HTMLElement>(`[data-me-block-id="${pending.selection.focus.blockId}"]`);
      focusBlock?.focus?.({ preventScroll: true });
      restoreMessageEditorSelection(root, pending.selection);
      return;
    }

    if (pending.blockId && typeof pending.caret === "number") {
      const focusBlock = root.querySelector<HTMLElement>(`[data-me-block-id="${pending.blockId}"]`);
      focusBlock?.focus?.({ preventScroll: true });
      const selection = createMessageEditorSelection(messagesRef.current, registry, {
        blockId: pending.blockId,
        offset: pending.caret,
      }, {
        blockId: pending.blockId,
        offset: pending.caret,
      });
      if (selection) {
        restoreMessageEditorSelection(root, selection);
      }
    }
  }, [registry]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    queueMicrotask(restorePendingSelection);
  }, [messages, ready, restorePendingSelection]);

  useEffect(() => {
    if (!resolvedDocId || !onTcHeaderChange) {
      return;
    }
    const parsed = parseDescriptionDocId(resolvedDocId);
    const digest = JSON.stringify({
      docId: resolvedDocId,
      header,
      entityType: parsed?.entityType,
      entityId: parsed?.entityId,
    });
    if (lastNotifyDigestRef.current === digest) {
      return;
    }
    lastNotifyDigestRef.current = digest;
    onTcHeaderChange({
      docId: resolvedDocId,
      entityType: parsed?.entityType as DescriptionEntityType | undefined,
      entityId: parsed?.entityId,
      header,
    });
  }, [header, onTcHeaderChange, resolvedDocId]);

  useEffect(() => {
    let cancelled = false;
    restoreSelectionRef.current = null;
    hideToolbar();

    if (!resolvedDocId || !remoteKey) {
      const fallback = ensureMessageEditorMessages(messagesRef.current.length > 0 ? messagesRef.current : [createMessageEditorTextDraft()]);
      messagesRef.current = fallback;
      lastSavedSerializedRef.current = createMessageEditorSnapshot(fallback).updateB64;
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }
        setMessages(fallback);
        setLoadError("");
        setSaveState("idle");
        setReady(true);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setReady(false);
      }
    });
    const cached = getCachedDocSnapshot(resolvedDocId);
    if (cached) {
      const decoded = ensureMessageEditorMessages(decodeMessageEditorMessages(cached));
      messagesRef.current = decoded;
      lastSavedSerializedRef.current = cached.updateB64;
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }
        setMessages(decoded);
        setLoadError("");
        setSaveState("idle");
      });
    }

    if (intentPrewarm) {
      prewarmRemoteSnapshot(remoteKey).catch(() => {});
    }

    getRemoteSnapshot(remoteKey).then((snapshot) => {
      if (cancelled) {
        return;
      }
      setCachedDocSnapshot(resolvedDocId, snapshot);
      const decoded = ensureMessageEditorMessages(decodeMessageEditorMessages(snapshot));
      messagesRef.current = decoded;
      setMessages(decoded);
      lastSavedSerializedRef.current = snapshot?.updateB64 ?? "";
      setLoadError("");
      setSaveState("idle");
      setReady(true);
    }).catch((error) => {
      if (cancelled) {
        return;
      }
      setLoadError(error instanceof Error ? error.message : String(error));
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [hideToolbar, intentPrewarm, remoteKey, resolvedDocId]);

  useEffect(() => {
    if (!ready || readOnly || !resolvedDocId || !remoteKey) {
      return;
    }

    const snapshot = createMessageEditorSnapshot(messages);
    if (snapshot.updateB64 === lastSavedSerializedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSaveState("saving");
      setRemoteSnapshot({
        ...remoteKey,
        snapshot,
      }).then(() => {
        lastSavedSerializedRef.current = snapshot.updateB64;
        setCachedDocSnapshot(resolvedDocId, snapshot);
        setSaveState("saved");
      }).catch(() => {
        setSaveState("error");
      });
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [messages, readOnly, ready, remoteKey, resolvedDocId]);

  const resolveEditorSelection = useCallback((preferSaved = false) => {
    const root = editorRootRef.current;
    if (!root) {
      return null;
    }

    const selection = window.getSelection();
    if (!preferSaved && selection && selection.rangeCount > 0) {
      const resolved = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, selection.getRangeAt(0));
      if (resolved) {
        eventBus.emit("selectionChanged", {
          blockIds: resolved.blockIds,
          multiBlock: resolved.multiBlock,
        });
        return resolved;
      }
    }

    const saved = savedSelectionRef.current;
    if (!saved) {
      return null;
    }

    const resolved = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, saved.range);
    if (resolved) {
      eventBus.emit("selectionChanged", {
        blockIds: resolved.blockIds,
        multiBlock: resolved.multiBlock,
      });
    }
    return resolved;
  }, [eventBus, registry, savedSelectionRef]);

  const registerBlockRef = useCallback((blockId: string, node: HTMLDivElement | null) => {
    if (node) {
      blockRefsRef.current.set(blockId, node);
      return;
    }
    blockRefsRef.current.delete(blockId);
  }, []);

  const slashMenuState = useMemo(() => {
    if (readOnly || !activeBlockId) {
      return null;
    }

    const activeMessage = messages.find(message => getMessageEditorBlockId(message) === activeBlockId);
    if (!activeMessage || !registry.isTextBlock(activeMessage)) {
      return null;
    }

    const query = parseSlashQuery(normalizeMessageEditorContent(activeMessage.content));
    if (query == null) {
      return null;
    }

    const slashKey = `${activeBlockId}:${query}`;
    if (dismissedSlashKey === slashKey) {
      return null;
    }

    const items = MESSAGE_EDITOR_SLASH_ITEMS.filter((item) => {
      if (!query) {
        return true;
      }
      return item.keyword.includes(query)
        || item.label.toLowerCase().includes(query)
        || item.description.toLowerCase().includes(query);
    });

    if (items.length === 0) {
      return null;
    }

    return {
      blockId: activeBlockId,
      items,
      slashKey,
    };
  }, [activeBlockId, dismissedSlashKey, messages, readOnly, registry]);

  const activeSlashSelectionIndex = slashMenuState
    ? Math.max(0, Math.min(slashSelectionIndex, slashMenuState.items.length - 1))
    : 0;

  const handleSelectSlashItem = useCallback((kind: MessageEditorInsertableBlockKind) => {
    if (!slashMenuState) {
      return;
    }

    const focus = controllerRef.current?.replaceBlockWithKind(slashMenuState.blockId, kind) ?? null;
    setDismissedSlashKey(null);
    setSlashSelectionIndex(0);
    hideToolbar();

    if (focus) {
      setActiveBlockId(focus.blockId);
      restoreSelectionRef.current = focus;
      return;
    }

    clearActiveBlock();
  }, [clearActiveBlock, hideToolbar, slashMenuState]);

  const handleTextInput = useCallback((blockId: string, nextContent: string) => {
    const root = editorRootRef.current;
    const selection = window.getSelection();
    let caret: number | null = null;
    if (root && selection && selection.rangeCount > 0) {
      const resolved = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, selection.getRangeAt(0));
      if (resolved && !resolved.multiBlock) {
        caret = resolved.focus.offset;
      }
    }

    controllerRef.current?.updateTextContent(blockId, nextContent);
    if (caret != null) {
      restoreSelectionRef.current = {
        blockId,
        caret,
      };
    }
  }, [registry]);

  const handleTextBlur = useCallback(() => {
    window.setTimeout(() => {
      const root = editorRootRef.current;
      const activeElement = document.activeElement;
      if (root && activeElement instanceof Node && root.contains(activeElement)) {
        return;
      }
      clearActiveBlock();
    }, 0);
  }, [clearActiveBlock]);

  const handleTextKeyDown = useCallback((blockId: string, event: React.KeyboardEvent<HTMLDivElement>) => {
    const root = editorRootRef.current;
    const selection = window.getSelection();
    const blockElement = blockRefsRef.current.get(blockId);
    if (!root || !selection || selection.rangeCount === 0 || !blockElement) {
      return;
    }

    const range = selection.getRangeAt(0);
    const editorSelection = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, range);
    if (!editorSelection) {
      return;
    }

    if (slashMenuState?.blockId === blockId) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashSelectionIndex((previous) => {
          return Math.min(previous + 1, slashMenuState.items.length - 1);
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashSelectionIndex(previous => Math.max(previous - 1, 0));
        return;
      }

      if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        const activeItem = slashMenuState.items[activeSlashSelectionIndex] ?? slashMenuState.items[0];
        if (activeItem) {
          handleSelectSlashItem(activeItem.kind);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setDismissedSlashKey(slashMenuState.slashKey);
        return;
      }
    }

    const contentIsMultiline = normalizeEditableText(blockElement.textContent ?? "").includes("\n");

    if (event.key === "ArrowUp" && editorSelection.collapsed && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const shouldMove = !contentIsMultiline || isSelectionAtStart(range, blockElement);
      if (shouldMove) {
        event.preventDefault();
        const focus = controllerRef.current?.getAdjacentTextBlock(blockId, -1, editorSelection.focus.offset);
        if (focus) {
          setActiveBlockId(focus.blockId);
          restoreSelectionRef.current = focus;
        }
      }
      return;
    }

    if (event.key === "ArrowDown" && editorSelection.collapsed && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const shouldMove = !contentIsMultiline || isSelectionAtEnd(range, blockElement);
      if (shouldMove) {
        event.preventDefault();
        const focus = controllerRef.current?.getAdjacentTextBlock(blockId, 1, editorSelection.focus.offset);
        if (focus) {
          setActiveBlockId(focus.blockId);
          restoreSelectionRef.current = focus;
        }
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      const focus = controllerRef.current?.splitAtSelection(editorSelection);
      if (focus) {
        setActiveBlockId(focus.blockId);
        restoreSelectionRef.current = focus;
      }
      return;
    }

    if (event.key === "Backspace" && editorSelection.collapsed && isSelectionAtStart(range, blockElement)) {
      event.preventDefault();
      const focus = controllerRef.current?.mergeBackward(blockId);
      if (focus) {
        setActiveBlockId(focus.blockId);
        restoreSelectionRef.current = focus;
      }
      return;
    }

    if (event.key === "Delete" && editorSelection.collapsed && isSelectionAtEnd(range, blockElement)) {
      event.preventDefault();
      const focus = controllerRef.current?.mergeForward(blockId);
      if (focus) {
        setActiveBlockId(focus.blockId);
        restoreSelectionRef.current = focus;
      }
    }
  }, [activeSlashSelectionIndex, handleSelectSlashItem, registry, slashMenuState]);

  const applyInlineMark = useCallback((type: "bold" | "italic" | "code" | "highlight") => {
    const selection = resolveEditorSelection(true);
    if (!selection || selection.collapsed) {
      return;
    }
    controllerRef.current?.applyInlineMark(selection, type);
    restoreSelectionRef.current = { selection };
  }, [resolveEditorSelection]);

  const applyColorMark = useCallback((color?: string) => {
    const selection = resolveEditorSelection(true);
    if (!selection || selection.collapsed) {
      return;
    }
    controllerRef.current?.applyColorMark(selection, color);
    restoreSelectionRef.current = { selection };
  }, [resolveEditorSelection]);

  const applyBlockType = useCallback((blockType: "paragraph" | "heading1" | "heading2" | "heading3" | "intro") => {
    const selection = resolveEditorSelection(true);
    if (!selection) {
      if (!activeBlockId) {
        return;
      }
      const collapsed = createMessageEditorSelection(messagesRef.current, registry, {
        blockId: activeBlockId,
        offset: 0,
      }, {
        blockId: activeBlockId,
        offset: 0,
      });
      if (!collapsed) {
        return;
      }
      controllerRef.current?.applyBlockType(collapsed, blockType);
      return;
    }

    controllerRef.current?.applyBlockType(selection, blockType);
    restoreSelectionRef.current = selection.collapsed ? null : { selection };
  }, [activeBlockId, registry, resolveEditorSelection]);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const root = editorRootRef.current;
      const target = event.target;
      if (!root || !(target instanceof Node)) {
        return;
      }
      if (root.contains(target)) {
        return;
      }
      clearActiveBlock();
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [clearActiveBlock, readOnly]);

  const handleBlockDragStart = useCallback((blockId: string, event: React.DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
    setDragState({
      draggedBlockId: blockId,
      targetBlockId: blockId,
      position: "after",
    });
  }, []);

  const handleBlockDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  const handleBlockDragOver = useCallback((blockId: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    setDragState((previous) => {
      if (!previous) {
        return previous;
      }
      if (previous.targetBlockId === blockId && previous.position === position) {
        return previous;
      }
      return {
        ...previous,
        targetBlockId: blockId,
        position,
      };
    });
  }, [dragState]);

  const handleBlockDrop = useCallback((blockId: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    event.preventDefault();
    const currentMessages = ensureMessageEditorMessages(messagesRef.current);
    const sourceIndex = currentMessages.findIndex(message => getMessageEditorBlockId(message) === dragState.draggedBlockId);
    const targetIndex = currentMessages.findIndex(message => getMessageEditorBlockId(message) === blockId);
    if (sourceIndex < 0 || targetIndex < 0) {
      setDragState(null);
      return;
    }

    let nextIndex = targetIndex + (dragState.position === "after" ? 1 : 0);
    if (sourceIndex < nextIndex) {
      nextIndex -= 1;
    }

    controllerRef.current?.moveBlockToIndex(dragState.draggedBlockId, nextIndex);

    const draggedMessage = currentMessages[sourceIndex];
    if (draggedMessage && registry.isTextBlock(draggedMessage)) {
      const selection = resolveEditorSelection();
      const preferredOffset = selection && !selection.multiBlock && selection.focus.blockId === dragState.draggedBlockId
        ? selection.focus.offset
        : normalizeMessageEditorContent(draggedMessage.content).length;
      setActiveBlockId(dragState.draggedBlockId);
      restoreSelectionRef.current = {
        blockId: dragState.draggedBlockId,
        caret: preferredOffset,
      };
    }
    else {
      clearActiveBlock();
    }

    setDragState(null);
  }, [clearActiveBlock, dragState, registry, resolveEditorSelection]);

  const atomicMessages = useMemo(() => {
    return messages.map((message) => {
      return {
        blockId: getMessageEditorBlockId(message),
        message,
        blockType: getMessageEditorBlockType(message),
        driver: registry.resolve(message),
      };
    });
  }, [messages, registry]);

  let statusLabel = "编辑中";
  if (readOnly) {
    statusLabel = "只读";
  }
  else if (!ready) {
    statusLabel = "载入中";
  }
  else if (saveState === "saving") {
    statusLabel = "保存中";
  }
  else if (saveState === "saved") {
    statusLabel = "已保存";
  }
  else if (saveState === "error") {
    statusLabel = "未保存";
  }

  return (
    <div className={`${frameClassName} overflow-hidden border border-base-300 bg-base-100`}>
      <div className="flex h-full min-h-0 flex-col">
        {resolvedCoverUrl
          ? (
              <div className="h-40 w-full shrink-0 overflow-hidden border-b border-base-300 bg-base-200">
                <img className="h-full w-full object-cover" src={resolvedCoverUrl} alt={resolvedTitle} />
              </div>
            )
          : null}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-base font-medium text-base-content">{resolvedTitle}</div>
              {resolvedDocId
                ? (
                    <div className="truncate font-mono text-xs text-base-content/45">
                      {resolvedDocId}
                    </div>
                  )
                : null}
            </div>
            <div className="rounded-md border border-base-300 px-2 py-1 text-xs text-base-content/55">
              {statusLabel}
            </div>
          </div>

          <div
            ref={editorRootRef}
            className="relative min-h-0 flex-1 overflow-auto"
            onMouseDownCapture={(event) => {
              const target = event.target;
              if (!(target instanceof HTMLElement)) {
                return;
              }
              if (target.closest("[data-me-block-id]") || target.closest("[data-me-slash-menu]") || target.closest("[data-me-block-handle]")) {
                return;
              }
              clearActiveBlock();
            }}
          >
            {!ready && (
              <div className="flex h-full items-center justify-center text-sm text-base-content/45">
                载入中
              </div>
            )}

            {ready && (
              <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-0.5 px-8 py-3 md:px-10">
                {ready && loadError
                  ? (
                      <div className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
                        {loadError}
                      </div>
                    )
                  : null}

                {atomicMessages.map(({ blockId, message, driver }) => {
                  const showDropBefore = dragState
                    && dragState.draggedBlockId !== blockId
                    && dragState.targetBlockId === blockId
                    && dragState.position === "before";
                  const showDropAfter = dragState
                    && dragState.draggedBlockId !== blockId
                    && dragState.targetBlockId === blockId
                    && dragState.position === "after";

                  if (driver.kind === "text") {
                    return (
                      <div
                        key={blockId}
                        className="group relative pl-10"
                        onDragOver={event => handleBlockDragOver(blockId, event)}
                        onDrop={event => handleBlockDrop(blockId, event)}
                      >
                        {showDropBefore && (
                          <div className="pointer-events-none absolute inset-x-10 top-0 h-0.5 rounded-full bg-primary" />
                        )}
                        {showDropAfter && (
                          <div className="pointer-events-none absolute inset-x-10 bottom-0 h-0.5 rounded-full bg-primary" />
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            draggable
                            data-me-block-handle="true"
                            className="absolute left-1 top-1 flex size-6 cursor-grab items-center justify-center rounded-md text-base-content/30 opacity-0 transition hover:bg-base-200 hover:text-base-content/70 hover:opacity-100 active:cursor-grabbing group-hover:opacity-100"
                            onDragStart={event => handleBlockDragStart(blockId, event)}
                            onDragEnd={handleBlockDragEnd}
                            aria-label="拖拽排序"
                          >
                            <DotsSixVerticalIcon size={16} weight="bold" />
                          </button>
                        )}
                        <MessageEditorTextBlock
                          active={activeBlockId === blockId}
                          blockId={blockId}
                          message={message}
                          placeholder="输入内容"
                          readOnly={readOnly}
                          registerBlockRef={registerBlockRef}
                          onFocus={(nextBlockId) => {
                            setDismissedSlashKey(null);
                            setActiveBlockId(nextBlockId);
                            controllerRef.current?.setActiveBlock(nextBlockId);
                          }}
                          onBlur={handleTextBlur}
                          onInput={handleTextInput}
                          onKeyDown={handleTextKeyDown}
                        />
                        {slashMenuState?.blockId === blockId && !readOnly && (
                          <div className="pl-3">
                            <MessageEditorSlashMenu
                              visible
                              items={slashMenuState.items}
                              selectedIndex={activeSlashSelectionIndex}
                              onSelect={item => handleSelectSlashItem(item.kind)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={blockId}
                      className="group relative pl-10"
                      onDragOver={event => handleBlockDragOver(blockId, event)}
                      onDrop={event => handleBlockDrop(blockId, event)}
                    >
                      {showDropBefore && (
                        <div className="pointer-events-none absolute inset-x-10 top-0 h-0.5 rounded-full bg-primary" />
                      )}
                      {showDropAfter && (
                        <div className="pointer-events-none absolute inset-x-10 bottom-0 h-0.5 rounded-full bg-primary" />
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          draggable
                          data-me-block-handle="true"
                          className="absolute left-1 top-1.5 flex size-6 cursor-grab items-center justify-center rounded-md text-base-content/30 opacity-0 transition hover:bg-base-200 hover:text-base-content/70 hover:opacity-100 active:cursor-grabbing group-hover:opacity-100"
                          onDragStart={event => handleBlockDragStart(blockId, event)}
                          onDragEnd={handleBlockDragEnd}
                          aria-label="拖拽排序"
                        >
                          <DotsSixVerticalIcon size={16} weight="bold" />
                        </button>
                      )}
                      <div
                        data-me-block-id={blockId}
                        className="rounded-xl border border-base-300/70 bg-base-100 px-3 py-2 shadow-sm"
                      >
                        <MessageContentRenderer
                          message={{
                            ...message,
                            content: message.content ?? "",
                            messageType: message.messageType ?? 0,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {!readOnly && (
        <MessageEditorToolbar
          visible={isFloatingVisible}
          position={toolbarPos}
          toolbarRef={toolbarRef}
          onApplyInlineMark={applyInlineMark}
          onApplyBlockType={applyBlockType}
          onApplyColor={applyColorMark}
        />
      )}
    </div>
  );
}

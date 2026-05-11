import type { MessageEditorSlashMenuItem } from "./components/MessageEditorSlashMenu";
import type { MessageEditorInsertableBlockKind } from "./model/messageEditorTransforms";
import type { MessageEditorController } from "./runtime/messageEditorController";
import type { MessageEditorSelection, MessageEditorSelectionPoint } from "./runtime/messageEditorSelection";
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
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import { UploadUtils } from "@/utils/UploadUtils";
import { MessageEditorAtomicBlock } from "./components/MessageEditorAtomicBlock";
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
  setMessageEditorUploadedMedia,
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

interface MessageEditorResolvedDragTarget {
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

function getOffsetWithinBlock(blockElement: HTMLElement, container: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(blockElement);
  try {
    range.setEnd(container, offset);
  }
  catch {
    return normalizeMessageEditorContent(blockElement.textContent).length;
  }
  return range.toString().length;
}

function resolveCaretOffsetFromPoint(blockElement: HTMLElement, clientX: number, clientY: number) {
  const documentWithCaretApis = blockElement.ownerDocument as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offset: number; offsetNode: Node } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  const caretPosition = documentWithCaretApis.caretPositionFromPoint?.(clientX, clientY);
  if (caretPosition && blockElement.contains(caretPosition.offsetNode)) {
    return getOffsetWithinBlock(blockElement, caretPosition.offsetNode, caretPosition.offset);
  }

  const caretRange = documentWithCaretApis.caretRangeFromPoint?.(clientX, clientY);
  if (caretRange && blockElement.contains(caretRange.startContainer)) {
    return getOffsetWithinBlock(blockElement, caretRange.startContainer, caretRange.startOffset);
  }

  return null;
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

async function readImageDimensions(file: File) {
  return await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("读取图片尺寸失败"));
    };
    image.src = url;
  });
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
  const frameClassName = className ?? "min-h-screen min-h-[100svh] rounded-md";
  const resolvedTitle = title?.trim() || tcHeader?.fallbackTitle?.trim() || "消息";
  const resolvedCoverUrl = coverUrl || tcHeader?.fallbackImageUrl || "";
  const resolvedDocId = docId?.trim() || undefined;
  const remoteKey = useMemo(() => {
    return resolvedDocId ? parseDescriptionDocId(resolvedDocId) : null;
  }, [resolvedDocId]);
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const blockRefsRef = useRef(new Map<string, HTMLDivElement>());
  const blockShellRefsRef = useRef(new Map<string, HTMLDivElement>());
  const messagesRef = useRef<MessageDraft[]>([]);
  const controllerRef = useRef<MessageEditorController | null>(null);
  const uploadUtils = useMemo(() => new UploadUtils(), []);
  const restoreSelectionRef = useRef<{
    blockId?: string;
    caret?: number;
    selection?: ReturnType<typeof createMessageEditorSelection>;
  } | null>(null);
  const pointerSelectionCleanupRef = useRef<(() => void) | null>(null);
  const pointerSelectionRef = useRef<MessageEditorSelection | null>(null);
  const pointerSelectionPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [messages, setMessages] = useState<MessageDraft[]>(() => ensureMessageEditorMessages([]));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [crossBlockSelection, setCrossBlockSelection] = useState<{
    position: { x: number; y: number };
    selection: MessageEditorSelection;
  } | null>(null);
  const [crossBlockSelectionPreview, setCrossBlockSelectionPreview] = useState<MessageEditorSelection | null>(null);
  const [dragState, setDragState] = useState<MessageEditorDragState | null>(null);
  const [isPointerSelecting, setIsPointerSelecting] = useState(false);
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

  const clearCrossBlockSelection = useCallback(() => {
    pointerSelectionRef.current = null;
    pointerSelectionPositionRef.current = null;
    setCrossBlockSelectionPreview(null);
    setCrossBlockSelection(null);
  }, []);

  const clearActiveBlock = useCallback(() => {
    setActiveBlockId(null);
    controllerRef.current?.setActiveBlock(null);
    clearCrossBlockSelection();
  }, [clearCrossBlockSelection]);

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
    suspend: isPointerSelecting || crossBlockSelectionPreview !== null || crossBlockSelection !== null,
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
    if (crossBlockSelection?.selection) {
      eventBus.emit("selectionChanged", {
        blockIds: crossBlockSelection.selection.blockIds,
        multiBlock: crossBlockSelection.selection.multiBlock,
      });
      return crossBlockSelection.selection;
    }

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
  }, [crossBlockSelection, eventBus, registry, savedSelectionRef]);

  const registerBlockRef = useCallback((blockId: string, node: HTMLDivElement | null) => {
    if (node) {
      blockRefsRef.current.set(blockId, node);
      return;
    }
    blockRefsRef.current.delete(blockId);
  }, []);

  const registerBlockShellRef = useCallback((blockId: string, node: HTMLDivElement | null) => {
    if (node) {
      blockShellRefsRef.current.set(blockId, node);
      return;
    }
    blockShellRefsRef.current.delete(blockId);
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
    clearCrossBlockSelection();
    controllerRef.current?.updateTextContent(blockId, nextContent);
  }, [clearCrossBlockSelection]);

  const handleTextBlur = useCallback(() => {
    window.setTimeout(() => {
      if (pointerSelectionCleanupRef.current) {
        return;
      }
      const root = editorRootRef.current;
      const activeElement = document.activeElement;
      if (root && activeElement instanceof Node && root.contains(activeElement)) {
        return;
      }
      clearActiveBlock();
    }, 0);
  }, [clearActiveBlock]);

  const resolveTextSelectionPointFromClientPosition = useCallback((clientX: number, clientY: number): MessageEditorSelectionPoint | null => {
    const root = editorRootRef.current;
    if (!root) {
      return null;
    }

    const currentMessages = ensureMessageEditorMessages(messagesRef.current);
    const messageByBlockId = new Map(currentMessages.map(message => [getMessageEditorBlockId(message), message] as const));

    const blockIdFromNode = (node: Node | null) => {
      if (!(node instanceof Element)) {
        return null;
      }
      const blockElement = node.closest<HTMLElement>("[data-me-block-id]");
      const blockId = blockElement?.dataset.meBlockId;
      if (!blockId) {
        return null;
      }
      const message = messageByBlockId.get(blockId);
      if (!message || !registry.isTextBlock(message)) {
        return null;
      }
      return blockId;
    };

    const resolvePointForBlock = (blockId: string) => {
      const blockElement = blockRefsRef.current.get(blockId);
      const message = messageByBlockId.get(blockId);
      if (!blockElement || !message) {
        return null;
      }

      const contentLength = normalizeMessageEditorContent(message.content).length;
      const bounds = blockElement.getBoundingClientRect();
      const directOffset = resolveCaretOffsetFromPoint(blockElement, clientX, clientY);
      if (directOffset != null) {
        return {
          blockId,
          offset: Math.max(0, Math.min(directOffset, contentLength)),
        };
      }

      if (clientY <= bounds.top || clientX <= bounds.left) {
        return { blockId, offset: 0 };
      }
      if (clientY >= bounds.bottom || clientX >= bounds.right) {
        return { blockId, offset: contentLength };
      }

      return { blockId, offset: contentLength };
    };

    const directBlockId = blockIdFromNode(root.ownerDocument.elementFromPoint(clientX, clientY));
    if (directBlockId) {
      return resolvePointForBlock(directBlockId);
    }

    const nearestTextBlockId = currentMessages
      .filter(message => registry.isTextBlock(message))
      .map((message) => {
        const blockId = getMessageEditorBlockId(message);
        const blockElement = blockRefsRef.current.get(blockId);
        if (!blockElement) {
          return null;
        }
        const bounds = blockElement.getBoundingClientRect();
        const distance = clientY < bounds.top
          ? bounds.top - clientY
          : clientY > bounds.bottom
            ? clientY - bounds.bottom
            : 0;
        return { blockId, distance };
      })
      .filter((entry): entry is { blockId: string; distance: number } => entry !== null)
      .sort((left, right) => left.distance - right.distance)[0]
      ?.blockId;

    return nearestTextBlockId ? resolvePointForBlock(nearestTextBlockId) : null;
  }, [registry]);

  const handleTextMouseDown = useCallback((blockId: string, event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const root = editorRootRef.current;
    if (!root) {
      return;
    }

    const anchor = resolveTextSelectionPointFromClientPosition(event.clientX, event.clientY);
    if (!anchor || anchor.blockId !== blockId) {
      return;
    }

    pointerSelectionCleanupRef.current?.();
    clearCrossBlockSelection();
    setIsPointerSelecting(true);
    hideToolbar();

    const documentRef = root.ownerDocument;
    const currentMessages = ensureMessageEditorMessages(messagesRef.current);
    const messageIndexByBlockId = new Map(currentMessages.map((message, index) => [getMessageEditorBlockId(message), index] as const));
    const handleDocumentMouseMove = (moveEvent: MouseEvent) => {
      if ((moveEvent.buttons & 1) === 0) {
        return;
      }

      const resolvedFocus = resolveTextSelectionPointFromClientPosition(moveEvent.clientX, moveEvent.clientY);
      if (!resolvedFocus) {
        return;
      }

      let focus = resolvedFocus;
      const focusIndex = messageIndexByBlockId.get(focus.blockId);
      const anchorIndex = messageIndexByBlockId.get(anchor.blockId);
      const focusMessage = currentMessages.find(message => getMessageEditorBlockId(message) === focus.blockId);
      if (focusIndex != null && anchorIndex != null && focusIndex !== anchorIndex && focusMessage) {
        const contentLength = normalizeMessageEditorContent(focusMessage.content).length;
        focus = {
          ...focus,
          offset: focusIndex > anchorIndex ? contentLength : 0,
        };
      }

      const selection = createMessageEditorSelection(messagesRef.current, registry, anchor, focus);
      if (!selection) {
        return;
      }

      if (!selection.multiBlock) {
        pointerSelectionRef.current = null;
        pointerSelectionPositionRef.current = null;
        setCrossBlockSelectionPreview(null);
        return;
      }

      const focusBlock = blockRefsRef.current.get(selection.focus.blockId);
      if (!focusBlock) {
        return;
      }

      const bounds = focusBlock.getBoundingClientRect();
      const toolbarX = Math.max(bounds.left, Math.min(moveEvent.clientX, bounds.right));
      pointerSelectionRef.current = selection;
      pointerSelectionPositionRef.current = {
        x: toolbarX,
        y: bounds.top,
      };
      setCrossBlockSelectionPreview(selection);
      window.getSelection()?.removeAllRanges();
    };

    const cleanup = () => {
      documentRef.removeEventListener("mousemove", handleDocumentMouseMove);
      documentRef.removeEventListener("mouseup", handleDocumentMouseUp);
      pointerSelectionCleanupRef.current = null;
      setIsPointerSelecting(false);
    };

    const handleDocumentMouseUp = () => {
      const nextSelection = pointerSelectionRef.current;
      const nextPosition = pointerSelectionPositionRef.current;
      cleanup();
      if (nextSelection && nextPosition) {
        setCrossBlockSelection({
          position: nextPosition,
          selection: nextSelection,
        });
        window.getSelection()?.removeAllRanges();
        return;
      }
      clearCrossBlockSelection();
    };

    pointerSelectionCleanupRef.current = cleanup;
    documentRef.addEventListener("mousemove", handleDocumentMouseMove);
    documentRef.addEventListener("mouseup", handleDocumentMouseUp, { once: true });
  }, [clearCrossBlockSelection, hideToolbar, registry, resolveTextSelectionPointFromClientPosition]);

  useEffect(() => {
    return () => {
      pointerSelectionCleanupRef.current?.();
    };
  }, []);

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

  const resolveDragTarget = useCallback((clientY: number): MessageEditorResolvedDragTarget | null => {
    const currentMessages = ensureMessageEditorMessages(messagesRef.current);
    const entries = currentMessages
      .map((message) => {
        const blockId = getMessageEditorBlockId(message);
        const node = blockShellRefsRef.current.get(blockId);
        if (!node) {
          return null;
        }
        const bounds = node.getBoundingClientRect();
        return {
          blockId,
          top: bounds.top,
          bottom: bounds.bottom,
          middle: bounds.top + bounds.height / 2,
        };
      })
      .filter((entry): entry is { blockId: string; top: number; bottom: number; middle: number } => entry !== null);

    if (entries.length === 0) {
      return null;
    }

    for (const entry of entries) {
      if (clientY <= entry.bottom) {
        return {
          targetBlockId: entry.blockId,
          position: clientY <= entry.middle ? "before" : "after",
        };
      }
    }

    return {
      targetBlockId: entries[entries.length - 1].blockId,
      position: "after" as const,
    };
  }, []);

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

  const handleBlockDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const nextTarget = resolveDragTarget(event.clientY);
    if (!nextTarget) {
      return;
    }
    setDragState((previous) => {
      if (!previous) {
        return previous;
      }
      if (previous.targetBlockId === nextTarget.targetBlockId && previous.position === nextTarget.position) {
        return previous;
      }
      return {
        ...previous,
        targetBlockId: nextTarget.targetBlockId,
        position: nextTarget.position,
      };
    });
  }, [dragState, resolveDragTarget]);

  const handleBlockDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    event.preventDefault();
    const currentMessages = ensureMessageEditorMessages(messagesRef.current);
    const sourceIndex = currentMessages.findIndex(message => getMessageEditorBlockId(message) === dragState.draggedBlockId);
    const targetIndex = currentMessages.findIndex(message => getMessageEditorBlockId(message) === dragState.targetBlockId);
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

  const handleDeleteAtomicBlock = useCallback((blockId: string) => {
    const focus = controllerRef.current?.removeBlock(blockId) ?? null;
    hideToolbar();
    if (focus) {
      setActiveBlockId(focus.blockId);
      restoreSelectionRef.current = focus;
      return;
    }
    clearActiveBlock();
  }, [clearActiveBlock, hideToolbar]);

  const handleUploadAtomicBlock = useCallback(async (blockId: string, file: File) => {
    const controller = controllerRef.current;
    if (!controller) {
      return;
    }

    const currentMessage = messagesRef.current.find(message => getMessageEditorBlockId(message) === blockId);
    if (!currentMessage) {
      return;
    }

    if (currentMessage.messageType === MESSAGE_TYPE.IMG) {
      const [uploadedImage, dimensions] = await Promise.all([
        uploadUtils.uploadDualImage(file),
        readImageDimensions(file),
      ]);
      controller.updateBlock(blockId, message => setMessageEditorUploadedMedia(message, {
        fileId: uploadedImage.fileId,
        fileName: file.name,
        mediaType: uploadedImage.mediaType,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
      }));
      return;
    }

    if (currentMessage.messageType === MESSAGE_TYPE.FILE) {
      const uploadedFile = await uploadUtils.uploadFileAsset(file);
      controller.updateBlock(blockId, message => setMessageEditorUploadedMedia(message, {
        fileId: uploadedFile.fileId,
        fileName: file.name,
        mediaType: uploadedFile.mediaType,
        size: file.size,
      }));
      return;
    }

    if (currentMessage.messageType === MESSAGE_TYPE.SOUND) {
      const uploadedAudio = await uploadUtils.uploadAudioAsset(file);
      controller.updateBlock(blockId, message => setMessageEditorUploadedMedia(message, {
        fileId: uploadedAudio.fileId,
        fileName: file.name,
        mediaType: uploadedAudio.mediaType,
        size: file.size,
      }));
      return;
    }

    if (currentMessage.messageType === MESSAGE_TYPE.VIDEO) {
      const uploadedVideo = await uploadUtils.uploadVideo(file);
      controller.updateBlock(blockId, message => setMessageEditorUploadedMedia(message, {
        fileId: uploadedVideo.fileId,
        fileName: file.name,
        mediaType: uploadedVideo.mediaType,
        size: file.size,
      }));
    }
  }, [uploadUtils]);

  const handleAppendTrailingMessage = useCallback(() => {
    const focus = controllerRef.current?.ensureTrailingTextBlock() ?? null;
    hideToolbar();
    if (!focus) {
      return;
    }
    setActiveBlockId(focus.blockId);
    restoreSelectionRef.current = focus;
  }, [hideToolbar]);

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
    <div className={`${frameClassName} min-h-screen overflow-hidden border border-base-300 bg-base-100`}>
      <div className="flex h-full min-h-0 flex-col">
        {resolvedCoverUrl
          ? (
              <div className="h-40 w-full shrink-0 overflow-hidden border-b border-base-300 bg-base-200">
                <img className="h-full w-full object-cover" src={resolvedCoverUrl} alt={resolvedTitle} />
              </div>
            )
          : null}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-base-300 px-4 py-4 md:px-10">
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
            onDragOver={handleBlockDragOver}
            onDrop={handleBlockDrop}
            onMouseDownCapture={(event) => {
              const target = event.target;
              if (!(target instanceof HTMLElement)) {
                return;
              }
              if (
                target.closest("[data-me-block-id]")
                || target.closest("[data-me-slash-menu]")
                || target.closest("[data-me-block-handle]")
                || target.closest("[data-me-editor-bottom-space]")
              ) {
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
              <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col py-2">
                {ready && loadError
                  ? (
                      <div className="rounded-md border border-error/20 bg-error/5 px-2 py-2 text-sm text-error">
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
                        ref={node => registerBlockShellRef(blockId, node)}
                        className={[
                          "group relative rounded-md px-8 transition",
                          dragState?.draggedBlockId === blockId
                            ? "border border-base-300/80 bg-base-100/80"
                            : "border border-transparent",
                        ].join(" ")}
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
                            className={[
                              "absolute left-1 top-1 flex size-6 cursor-grab items-center justify-center rounded-md border border-base-300/80 bg-base-100 text-base-content/35 transition hover:border-base-400 hover:bg-base-200 hover:text-base-content/70 active:cursor-grabbing",
                              dragState?.draggedBlockId === blockId ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                            ].join(" ")}
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
                          onMouseDown={handleTextMouseDown}
                          placeholder="输入内容"
                          readOnly={readOnly}
                          registerBlockRef={registerBlockRef}
                          selectionSegment={
                            crossBlockSelectionPreview?.segments.find(segment => segment.blockId === blockId)
                            ?? crossBlockSelection?.selection.segments.find(segment => segment.blockId === blockId)
                            ?? null
                          }
                          onFocus={(nextBlockId) => {
                            clearCrossBlockSelection();
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
                      ref={node => registerBlockShellRef(blockId, node)}
                      className={[
                        "group relative rounded-xl px-6 transition",
                        dragState?.draggedBlockId === blockId
                          ? "border border-base-300/80 bg-base-100/80"
                          : "border border-transparent",
                      ].join(" ")}
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
                          className={[
                            "absolute left-1 top-1.5 flex size-6 cursor-grab items-center justify-center rounded-md border border-base-300/80 bg-base-100 text-base-content/35 transition hover:border-base-400 hover:bg-base-200 hover:text-base-content/70 active:cursor-grabbing",
                            dragState?.draggedBlockId === blockId ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                          ].join(" ")}
                          onDragStart={event => handleBlockDragStart(blockId, event)}
                          onDragEnd={handleBlockDragEnd}
                          aria-label="拖拽排序"
                        >
                          <DotsSixVerticalIcon size={16} weight="bold" />
                        </button>
                      )}
                      <div data-me-block-id={blockId}>
                        <MessageEditorAtomicBlock
                          active={activeBlockId === blockId}
                          blockId={blockId}
                          message={message}
                          readOnly={readOnly}
                          onFocus={(nextBlockId) => {
                            clearCrossBlockSelection();
                            setActiveBlockId(nextBlockId);
                            controllerRef.current?.setActiveBlock(nextBlockId);
                          }}
                          onDelete={handleDeleteAtomicBlock}
                          onUpload={handleUploadAtomicBlock}
                        />
                      </div>
                    </div>
                  );
                })}
                {!readOnly && (
                  // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
                  <div
                    data-me-editor-bottom-space="true"
                    className="min-h-20 flex-1"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleAppendTrailingMessage();
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!readOnly && (
        <MessageEditorToolbar
          visible={!isPointerSelecting && (crossBlockSelection !== null || isFloatingVisible)}
          position={crossBlockSelection?.position ?? toolbarPos}
          toolbarRef={toolbarRef}
          onApplyInlineMark={applyInlineMark}
          onApplyBlockType={applyBlockType}
          onApplyColor={applyColorMark}
        />
      )}
    </div>
  );
}

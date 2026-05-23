import type { Message } from "../../../api";
import type { MessageEditorSlashMenuItem } from "./components/MessageEditorSlashMenu";
import type {
  MessageEditorInsertableBlockKind,
  MessageEditorSelectionTextResult,
} from "./model/messageEditorTransforms";
import type { MessageEditorController } from "./runtime/messageEditorController";
import type { MessageEditorSelection, MessageEditorSelectionPoint } from "./runtime/messageEditorSelection";
import type { RoomMessageStreamPatchOperation } from "@/components/chat/infra/doc/document/roomMessageStreamApi";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import type { MessageDraft } from "@/types/messageDraft";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotCache";
import { getPersistedDocSnapshot, setPersistedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotPersistence";
import {
  getRemoteRoomMessageStream,
  patchRemoteRoomMessageStream,
  readRoomMessageStreamMessages,
  syncRemoteRoomMessageStream,
} from "@/components/chat/infra/doc/document/roomMessageStreamApi";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import { useFloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";
import { DraggableIcon } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import { UploadUtils } from "@/utils/UploadUtils";
import { MessageEditorAtomicBlock } from "./components/MessageEditorAtomicBlock";
import { MessageEditorSlashMenu } from "./components/MessageEditorSlashMenu";
import { MessageEditorTextBlock } from "./components/MessageEditorTextBlock";
import { createMessageEditorSnapshot, decodeMessageEditorMessages } from "./model/messageEditorCodec";
import {
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  normalizeMessageEditorContent,
  serializeMessageEditorMessages,
  setMessageEditorUploadedMedia,
  updateMessageEditorImageSize,
} from "./model/messageEditorTransforms";
import { createMessageEditorController } from "./runtime/messageEditorController";
import { MessageEditorEventBus } from "./runtime/messageEditorEventBus";
import { resolveMessageEditorTextPointFromClientPosition } from "./runtime/messageEditorHitTest";
import { createMessageEditorRegistry } from "./runtime/messageEditorRegistry";
import {
  createMessageEditorSelection,
  createMessageEditorTextRunSelection,
  getAdjacentMessageEditorTextBlockPoint,
  getMessageEditorSelectionText,
  moveMessageEditorTextPointByCharacter,
  resolveMessageEditorSelectionFromRange,
  restoreMessageEditorSelection,
} from "./runtime/messageEditorSelection";

interface MessageEditorProps {
  className?: string;
  coverUrl?: string;
  docId?: string;
  excerpt?: string;
  initialMessages?: Message[];
  intentPrewarm?: boolean;
  onRemoteMessagesSaved?: (messages: Message[]) => void | Promise<void>;
  readOnly?: boolean;
  remoteSource?: "self" | "room-cache";
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

interface MessageEditorHistoryFocus {
  blockId: string;
  caret: number;
}

interface MessageEditorHistoryEntry {
  focus: MessageEditorHistoryFocus | null;
  messages: MessageDraft[];
  serialized: string;
}

type MessageEditorHistoryKind = "default" | "typing";

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
  { kind: "heading1", keyword: "h1", label: "大标题", description: "插入 # 标题" },
  { kind: "heading2", keyword: "h2", label: "中标题", description: "插入 ## 标题" },
  { kind: "heading3", keyword: "h3", label: "小标题", description: "插入 ### 标题" },
  { kind: "bulletedList", keyword: "list", label: "列表", description: "插入 - 列表项" },
  { kind: "numberedList", keyword: "ol", label: "编号", description: "插入 1. 列表项" },
  { kind: "quote", keyword: "quote", label: "引用", description: "插入 > 引用" },
  { kind: "intro", keyword: "intro", label: "黑幕", description: "黑底文字块" },
  { kind: "image", keyword: "image", label: "图片", description: "插入图片消息块" },
  { kind: "file", keyword: "file", label: "文件", description: "插入文件消息块" },
  { kind: "audio", keyword: "audio", label: "音频", description: "插入音频消息块" },
  { kind: "video", keyword: "video", label: "视频", description: "插入视频消息块" },
  { kind: "dice", keyword: "dice", label: "骰子", description: "插入骰子结果块" },
  { kind: "choose", keyword: "choose", label: "选择", description: "插入 WebGAL 选项块" },
];

const MESSAGE_EDITOR_HISTORY_LIMIT = 100;
const MESSAGE_EDITOR_TYPING_HISTORY_INTERVAL_MS = 1000;
const MESSAGE_EDITOR_LOCAL_SAVE_DELAY_MS = 500;
const MESSAGE_EDITOR_REMOTE_SYNC_DELAY_MS = 10000;
const MESSAGE_EDITOR_CONTENT_WIDTH_CLASS = "mx-auto w-full max-w-4xl";
const MESSAGE_EDITOR_BLOCK_GUTTER_CLASS = "pl-6";
const MESSAGE_EDITOR_BLOCK_HANDLE_CLASS = [
  "absolute left-0 z-30 flex size-6 cursor-grab items-center justify-center text-base-content/35",
  "opacity-0 transition-opacity duration-150",
  "group-hover:opacity-100 group-focus-within:opacity-100 hover:text-base-content/70 active:cursor-grabbing",
].join(" ");

function hasMeaningfulMessageEditorContent(messages: MessageDraft[]): boolean {
  return ensureMessageEditorMessages(messages).some((message) => {
    if (message.messageType !== MESSAGE_TYPE.TEXT && message.messageType !== MESSAGE_TYPE.INTRO_TEXT) {
      return true;
    }
    return normalizeMessageEditorContent(message.content).trim().length > 0;
  });
}

type RuntimeMessageDraft = MessageDraft & Partial<Message>;

type RuntimeMessageIdState = "new" | "optimistic" | "persisted";

function isRuntimeOptimisticMessage(message: MessageDraft): boolean {
  const value = (message as RuntimeMessageDraft).tcLocalSyncState;
  if (value === "optimistic") {
    return true;
  }
  const runtimeMessageId = (message as RuntimeMessageDraft).messageId;
  return typeof runtimeMessageId === "number" && Number.isFinite(runtimeMessageId) && runtimeMessageId < 0;
}

function getRuntimeMessageIdState(message: MessageDraft): RuntimeMessageIdState {
  if (isRuntimeOptimisticMessage(message)) {
    return "optimistic";
  }
  const value = (message as RuntimeMessageDraft).messageId;
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
    return "new";
  }
  return "persisted";
}

function getRuntimeMessageId(message: MessageDraft): number | undefined {
  const value = (message as RuntimeMessageDraft).messageId;
  return getRuntimeMessageIdState(message) === "persisted" ? value : undefined;
}

function getRuntimePosition(message: MessageDraft, fallback: number): number {
  const value = (message as RuntimeMessageDraft).position;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableSerializeMessageEditorValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerializeMessageEditorValue(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableSerializeMessageEditorValue(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

function serializeMessageEditorPatchContent(message: MessageDraft): string {
  return stableSerializeMessageEditorValue({
    annotations: message.annotations ?? null,
    avatarId: message.avatarId ?? null,
    content: message.content ?? "",
    customRoleName: message.customRoleName ?? null,
    extra: message.extra ?? null,
    messageType: message.messageType ?? MESSAGE_TYPE.TEXT,
    roleId: message.roleId ?? null,
    webgal: message.webgal ?? null,
  });
}

export function buildRoomMessagePatchOperations(
  baselineMessages: MessageDraft[],
  nextMessages: MessageDraft[],
): RoomMessageStreamPatchOperation[] {
  const baselineById = new Map<number, MessageDraft>();
  ensureMessageEditorMessages(baselineMessages).forEach((message) => {
    const messageId = getRuntimeMessageId(message);
    if (messageId !== undefined) {
      baselineById.set(messageId, message);
    }
  });

  const seenIds = new Set<number>();
  const operations: RoomMessageStreamPatchOperation[] = [];
  ensureMessageEditorMessages(nextMessages).forEach((message, index) => {
    const messageIdState = getRuntimeMessageIdState(message);
    const messageId = getRuntimeMessageId(message);
    const position = getRuntimePosition(message, index + 1);
    if (messageIdState === "optimistic") {
      // 本地乐观消息还没真正进云端，文档 patch 只处理已确认的消息。
      return;
    }
    if (messageIdState === "new") {
      operations.push({
        op: "insert",
        clientId: getMessageEditorBlockId(message),
        message: {
          ...message,
          position,
        },
        position,
      });
      return;
    }
    if (messageId === undefined) {
      return;
    }

    seenIds.add(messageId);
    const baseline = baselineById.get(messageId);
    if (!baseline) {
      operations.push({
        op: "insert",
        clientId: getMessageEditorBlockId(message),
        message: {
          ...message,
          position,
        },
        position,
      });
      return;
    }

    const contentChanged = serializeMessageEditorPatchContent(baseline) !== serializeMessageEditorPatchContent(message);
    const positionChanged = getRuntimePosition(baseline, index + 1) !== position;
    if (contentChanged) {
      operations.push({
        op: "update",
        messageId,
        message: {
          ...message,
          position,
        },
        position,
      });
      return;
    }
    if (positionChanged) {
      operations.push({
        op: "move",
        messageId,
        position,
      });
    }
  });

  for (const messageId of baselineById.keys()) {
    if (!seenIds.has(messageId)) {
      operations.push({
        op: "delete",
        messageId,
      });
    }
  }

  return operations;
}
const MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS = "px-8 md:px-10";
const MESSAGE_EDITOR_DEFAULT_FRAME_CLASS = "h-[80vh] min-h-0 rounded-md";
const MESSAGE_EDITOR_SCROLL_VIEWPORT_CLASS = "relative min-h-0 flex-1 overflow-auto";

function normalizeEditableText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

/**
 * 解析编辑器外框类名。
 * 默认值用于独立文档场景，采用 80vh；嵌入抽屉/弹窗时可由调用方覆写。
 */
export function getMessageEditorFrameClassName(className?: string) {
  return className ?? MESSAGE_EDITOR_DEFAULT_FRAME_CLASS;
}

/**
 * 返回承载封面、标题和正文的统一滚动容器类名。
 * 这样文档头部和正文会处在同一个滚动上下文里。
 */
export function getMessageEditorScrollViewportClassName() {
  return MESSAGE_EDITOR_SCROLL_VIEWPORT_CLASS;
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

function parseWholeTextEnhanceReplacement(replacement: string, selectedText: string): string | null {
  if (!selectedText) {
    return null;
  }

  const prefix = `[${selectedText}](`;
  if (!replacement.startsWith(prefix) || !replacement.endsWith(")")) {
    return null;
  }

  return replacement.slice(prefix.length, -1);
}

/**
 * 判断文档级点击是否应被视为编辑器外部点击。
 * 工具栏内部的 SVG / Path 等元素同样需要被识别为“内部”，否则会误触发清理逻辑。
 */
interface MessageEditorSelectionEventElementLike {
  closest?: (selector: string) => MessageEditorSelectionEventElementLike | null;
  parentElement?: MessageEditorSelectionEventElementLike | null;
  tagName?: string;
}

export function shouldIgnoreDocumentSelectionEventTarget(target: EventTarget | null) {
  const candidate = target as MessageEditorSelectionEventElementLike | null;
  const element = candidate && typeof candidate.closest === "function"
    ? candidate
    : candidate?.parentElement ?? null;
  const tagName = element?.tagName;

  if (!element || typeof element.closest !== "function" || typeof tagName !== "string") {
    return false;
  }

  return Boolean(
    element.closest(".text-style-toolbar")
    || element.closest(".modal")
    || element.closest("[role='dialog']")
    || element.closest("[contenteditable='true']")
    || ["INPUT", "TEXTAREA", "SELECT"].includes(tagName),
  );
}

function resolveUndoRedoShortcut(event: Pick<KeyboardEvent | React.KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">): "redo" | "undo" | null {
  if ((!event.metaKey && !event.ctrlKey) || event.altKey) {
    return null;
  }

  const key = event.key.toLowerCase();
  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }
  if (key === "y" && !event.shiftKey) {
    return "redo";
  }
  return null;
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
  initialMessages,
  onRemoteMessagesSaved,
  readOnly = false,
  remoteSource = "self",
  spaceId,
  tcHeader,
  title,
  workspaceId,
}: MessageEditorProps) {
  const frameClassName = getMessageEditorFrameClassName(className);
  const resolvedTitle = title?.trim() || tcHeader?.fallbackTitle?.trim() || "消息";
  const resolvedCoverUrl = coverUrl || tcHeader?.fallbackImageUrl || "";
  const resolvedDocId = docId?.trim() || undefined;
  const resolvedSpaceId = typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0 ? spaceId : undefined;
  const resolvedWorkspaceId = workspaceId?.trim() || undefined;
  const resolvedDocRoomId = resolvedDocId && /^\d+$/.test(resolvedDocId) ? Number(resolvedDocId) : undefined;
  const normalizedInitialMessages = useMemo(
    () => ensureMessageEditorMessages(initialMessages ?? []),
    [initialMessages],
  );
  const isRoomCacheSource = remoteSource === "room-cache";
  const shouldSyncRemote = Boolean(
    resolvedDocRoomId
    && resolvedSpaceId
    && (!resolvedWorkspaceId || resolvedWorkspaceId.startsWith("space:")),
  );
  const shouldLoadRemote = shouldSyncRemote && remoteSource === "self";
  const initialEditorMessages = useMemo(
    () => isRoomCacheSource ? normalizedInitialMessages : ensureMessageEditorMessages([]),
    [isRoomCacheSource, normalizedInitialMessages],
  );
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const blockRefsRef = useRef(new Map<string, HTMLDivElement>());
  const blockShellRefsRef = useRef(new Map<string, HTMLDivElement>());
  const messagesRef = useRef<MessageDraft[]>(initialEditorMessages);
  const controllerRef = useRef<MessageEditorController | null>(null);
  const textStyleInputRef = useRef<ChatInputAreaHandle | null>(null);
  const undoStackRef = useRef<MessageEditorHistoryEntry[]>([]);
  const redoStackRef = useRef<MessageEditorHistoryEntry[]>([]);
  const typingHistoryRef = useRef<{
    baseSerialized: string;
    blockId: string;
    lastAt: number;
  } | null>(null);
  const uploadUtils = useMemo(() => new UploadUtils(), []);
  const restoreSelectionRef = useRef<{
    blockId?: string;
    caret?: number;
    selection?: ReturnType<typeof createMessageEditorSelection>;
  } | null>(null);
  const pointerSelectionCleanupRef = useRef<(() => void) | null>(null);
  const pointerSelectionRef = useRef<MessageEditorSelection | null>(null);
  const pointerSelectionPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [messages, setMessages] = useState<MessageDraft[]>(() => initialEditorMessages);
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
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [ready, setReady] = useState(!resolvedDocId || isRoomCacheSource);
  const registry = useMemo(() => createMessageEditorRegistry(), []);
  const eventBus = useMemo(() => new MessageEditorEventBus(), []);
  const lastSavedSerializedRef = useRef(isRoomCacheSource ? serializeMessageEditorMessages(initialEditorMessages) : "");
  const remoteRevisionRef = useRef<number | null>(null);
  const saveGenerationRef = useRef(0);
  const activeRemoteSaveGenerationRef = useRef<number | null>(null);
  const dirtySinceLoadRef = useRef(false);
  const initialMessagesSeedRef = useRef(normalizedInitialMessages);
  const loadSeedKeyRef = useRef<string | null>(null);
  const baselineMessagesRef = useRef<MessageDraft[]>(isRoomCacheSource ? initialEditorMessages : []);

  useEffect(() => {
    const loadSeedKey = `${resolvedDocId ?? ""}|${remoteSource}`;
    if (loadSeedKeyRef.current !== loadSeedKey) {
      loadSeedKeyRef.current = loadSeedKey;
      initialMessagesSeedRef.current = normalizedInitialMessages;
    }
  }, [normalizedInitialMessages, remoteSource, resolvedDocId]);

  useEffect(() => {
    if (!ready || !resolvedDocId || !isRoomCacheSource || dirtySinceLoadRef.current) {
      return;
    }

    const nextMessages = ensureMessageEditorMessages(normalizedInitialMessages);
    const nextSerialized = serializeMessageEditorMessages(nextMessages);
    const currentSerialized = stableSerializeMessageEditorValue(messagesRef.current);
    const nextRuntimeSerialized = stableSerializeMessageEditorValue(nextMessages);
    if (currentSerialized === nextRuntimeSerialized) {
      return;
    }

    baselineMessagesRef.current = nextMessages;
    messagesRef.current = nextMessages;
    lastSavedSerializedRef.current = nextSerialized;
    setMessages(nextMessages);
  }, [isRoomCacheSource, normalizedInitialMessages, ready, resolvedDocId]);

  const reconcileRoomCacheRemoteMessages = useCallback(async (
    remoteMessages: Message[],
    options: { updateState?: boolean } = {},
  ) => {
    const savedMessages = ensureMessageEditorMessages(remoteMessages);
    if (savedMessages.length === 0) {
      return false;
    }

    // 服务端会给新增块分配真实 messageId；这里立即回填，避免下一次 diff 把同一块再次当作 insert。
    baselineMessagesRef.current = savedMessages;
    messagesRef.current = savedMessages;
    lastSavedSerializedRef.current = serializeMessageEditorMessages(savedMessages);
    dirtySinceLoadRef.current = false;
    if (options.updateState !== false) {
      setMessages(savedMessages);
    }
    await onRemoteMessagesSaved?.(remoteMessages);
    return true;
  }, [onRemoteMessagesSaved]);

  const isActiveRemoteSaveGeneration = useCallback((generation: number) => {
    return activeRemoteSaveGenerationRef.current === generation
      && saveGenerationRef.current === generation;
  }, []);

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

  const resolveHistoryFocus = useCallback((sourceMessages: MessageDraft[]): MessageEditorHistoryFocus | null => {
    const sourceByBlockId = new Map(ensureMessageEditorMessages(sourceMessages).map(message => [getMessageEditorBlockId(message), message] as const));
    const clampPoint = (point: MessageEditorSelectionPoint | null | undefined): MessageEditorHistoryFocus | null => {
      if (!point) {
        return null;
      }
      const message = sourceByBlockId.get(point.blockId);
      if (!message || !registry.isTextBlock(message)) {
        return null;
      }
      const contentLength = normalizeMessageEditorContent(message.content).length;
      return {
        blockId: point.blockId,
        caret: Math.max(0, Math.min(point.offset, contentLength)),
      };
    };

    if (crossBlockSelection?.selection) {
      return clampPoint(crossBlockSelection.selection.focus);
    }

    const root = editorRootRef.current;
    const nativeSelection = window.getSelection();
    if (root && nativeSelection && nativeSelection.rangeCount > 0) {
      const resolved = resolveMessageEditorSelectionFromRange(root, sourceMessages, registry, nativeSelection.getRangeAt(0));
      const focus = clampPoint(resolved?.focus);
      if (focus) {
        return focus;
      }
    }

    if (!activeBlockId) {
      return null;
    }
    const activeMessage = sourceByBlockId.get(activeBlockId);
    if (!activeMessage || !registry.isTextBlock(activeMessage)) {
      return null;
    }

    return {
      blockId: activeBlockId,
      caret: normalizeMessageEditorContent(activeMessage.content).length,
    };
  }, [activeBlockId, crossBlockSelection, registry]);

  const createHistoryEntry = useCallback((sourceMessages: MessageDraft[]): MessageEditorHistoryEntry => {
    const normalizedMessages = ensureMessageEditorMessages(sourceMessages);
    return {
      focus: resolveHistoryFocus(normalizedMessages),
      messages: normalizedMessages,
      serialized: serializeMessageEditorMessages(normalizedMessages),
    };
  }, [resolveHistoryFocus]);

  const pushUndoHistoryEntry = useCallback((entry: MessageEditorHistoryEntry, historyKind: MessageEditorHistoryKind = "default") => {
    const undoStack = undoStackRef.current;
    if (undoStack.at(-1)?.serialized === entry.serialized) {
      return;
    }

    const now = Date.now();
    const typingHistory = typingHistoryRef.current;
    const focusBlockId = entry.focus?.blockId;
    if (
      historyKind === "typing"
      && focusBlockId
      && typingHistory
      && typingHistory.blockId === focusBlockId
      && typingHistory.baseSerialized === undoStack.at(-1)?.serialized
      && now - typingHistory.lastAt <= MESSAGE_EDITOR_TYPING_HISTORY_INTERVAL_MS
    ) {
      typingHistory.lastAt = now;
      redoStackRef.current = [];
      return;
    }

    undoStackRef.current = [...undoStack, entry].slice(-MESSAGE_EDITOR_HISTORY_LIMIT);
    redoStackRef.current = [];
    typingHistoryRef.current = historyKind === "typing" && focusBlockId
      ? {
          baseSerialized: entry.serialized,
          blockId: focusBlockId,
          lastAt: now,
        }
      : null;
  }, []);

  const resetHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    typingHistoryRef.current = null;
  }, []);

  const setMessagesWithRef = useCallback((updater: (previous: MessageDraft[]) => MessageDraft[], historyKind: MessageEditorHistoryKind = "default") => {
    setMessages((previous) => {
      const normalizedPrevious = ensureMessageEditorMessages(previous);
      const next = ensureMessageEditorMessages(updater(normalizedPrevious));
      if (serializeMessageEditorMessages(normalizedPrevious) !== serializeMessageEditorMessages(next)) {
        pushUndoHistoryEntry(createHistoryEntry(normalizedPrevious), historyKind);
        if (ready) {
          dirtySinceLoadRef.current = true;
        }
      }
      messagesRef.current = next;
      return next;
    });
  }, [createHistoryEntry, pushUndoHistoryEntry, ready]);

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

  const { savedSelectionRef, hideToolbar } = useFloatingSelectionToolbar({
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

    const focusEditableInsideBlock = (block: HTMLElement | null) => {
      const target = block?.matches("[contenteditable='true']")
        ? block
        : block?.querySelector<HTMLElement>("[contenteditable='true']");
      target?.focus?.({ preventScroll: true });
    };

    restoreSelectionRef.current = null;
    if (pending.selection) {
      const focusBlock = root.querySelector<HTMLElement>(`[data-me-block-id="${pending.selection.focus.blockId}"]`);
      focusEditableInsideBlock(focusBlock);
      restoreMessageEditorSelection(root, pending.selection);
      return;
    }

    if (pending.blockId && typeof pending.caret === "number") {
      const focusBlock = root.querySelector<HTMLElement>(`[data-me-block-id="${pending.blockId}"]`);
      focusEditableInsideBlock(focusBlock);
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

  useLayoutEffect(() => {
    if (!ready) {
      return;
    }
    queueMicrotask(restorePendingSelection);
  }, [activeBlockId, messages, ready, restorePendingSelection]);

  useEffect(() => {
    let cancelled = false;
    restoreSelectionRef.current = null;
    hideToolbar();

    if (isRoomCacheSource) {
      const nextMessages = ensureMessageEditorMessages(initialMessagesSeedRef.current);
      const nextSerialized = serializeMessageEditorMessages(nextMessages);
      remoteRevisionRef.current = null;
      resetHistory();
      dirtySinceLoadRef.current = false;
      baselineMessagesRef.current = nextMessages;
      messagesRef.current = nextMessages;
      lastSavedSerializedRef.current = nextSerialized;
      setMessages(nextMessages);
      setSaveState("idle");
      setReady(true);
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setReady(false);
      }
    });

    void (async () => {
      await Promise.resolve();
      const cached = resolvedDocId && !shouldSyncRemote && !isRoomCacheSource ? getCachedDocSnapshot(resolvedDocId) : null;
      const persisted = cached ?? (resolvedDocId && !shouldSyncRemote && !isRoomCacheSource
        ? await getPersistedDocSnapshot(resolvedDocId).catch(() => null)
        : null);
      const remote = shouldLoadRemote && resolvedDocRoomId
        ? await getRemoteRoomMessageStream({ roomId: resolvedDocRoomId }).catch((error) => {
            console.warn("[MessageEditor] load remote room message stream failed", error);
            return null;
          })
        : null;

      if (cancelled) {
        return;
      }

      if (resolvedDocId && !shouldSyncRemote && !isRoomCacheSource && persisted && !cached) {
        setCachedDocSnapshot(resolvedDocId, persisted);
      }

      const remoteRevision = typeof remote?.revision === "number" ? remote.revision : null;
      remoteRevisionRef.current = remoteRevision;
      const hasRemoteMessages = Array.isArray(remote?.messages) && remote.messages.length > 0;
      const seededInitialMessages = initialMessagesSeedRef.current;

      const fallback = resolvedDocId
        ? (isRoomCacheSource
            ? (seededInitialMessages.length > 0 ? seededInitialMessages : [createMessageEditorTextDraft()])
            : (seededInitialMessages.length > 0 ? seededInitialMessages : [createMessageEditorTextDraft()]))
        : (messagesRef.current.length > 0 ? messagesRef.current : [createMessageEditorTextDraft()]);
      const shouldUseRemote = remoteRevision !== null && (remoteRevision > 0 || hasRemoteMessages);
      const decoded = shouldUseRemote
        ? ensureMessageEditorMessages(readRoomMessageStreamMessages(remote))
        : ensureMessageEditorMessages(
            isRoomCacheSource
              ? fallback
              : (persisted ? decodeMessageEditorMessages(persisted) : fallback),
          );
      const loadedSnapshot = createMessageEditorSnapshot(decoded, shouldUseRemote ? remote?.updatedAt : undefined);
      if (shouldUseRemote && resolvedDocId && !shouldSyncRemote && !isRoomCacheSource) {
        setCachedDocSnapshot(resolvedDocId, loadedSnapshot);
        void setPersistedDocSnapshot(resolvedDocId, loadedSnapshot).catch((error) => {
          console.warn("[MessageEditor] cache remote doc room snapshot failed", error);
        });
      }
      resetHistory();
      dirtySinceLoadRef.current = false;
      baselineMessagesRef.current = decoded;
      messagesRef.current = decoded;
      lastSavedSerializedRef.current = shouldUseRemote
        ? loadedSnapshot.updateB64
        : (persisted?.updateB64 ?? loadedSnapshot.updateB64);
      setMessages(decoded);
      setSaveState("idle");
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [hideToolbar, isRoomCacheSource, resetHistory, resolvedDocId, resolvedDocRoomId, shouldLoadRemote, shouldSyncRemote]);

  useEffect(() => {
    if (!ready || readOnly || !resolvedDocId || !dirtySinceLoadRef.current) {
      return;
    }

    const snapshot = createMessageEditorSnapshot(messages);
    if (snapshot.updateB64 === lastSavedSerializedRef.current) {
      return;
    }

    if (shouldSyncRemote && resolvedDocRoomId && !hasMeaningfulMessageEditorContent(messages)) {
      console.warn("[MessageEditor] skip empty room message-stream sync to avoid clearing content");
      return;
    }

    const timer = window.setTimeout(() => {
      const saveGeneration = saveGenerationRef.current + 1;
      saveGenerationRef.current = saveGeneration;
      activeRemoteSaveGenerationRef.current = saveGeneration;
      setSaveState("saving");
      const persistTask = shouldSyncRemote && resolvedDocRoomId
        ? (isRoomCacheSource
            ? (() => {
                const operations = buildRoomMessagePatchOperations(baselineMessagesRef.current, messages);
                if (operations.length === 0) {
                  return Promise.resolve();
                }
                return patchRemoteRoomMessageStream({
                  operations,
                  roomId: resolvedDocRoomId,
                }).then(async (remote) => {
                  if (!isActiveRemoteSaveGeneration(saveGeneration)) {
                    return;
                  }
                  const savedMessages = readRoomMessageStreamMessages(remote);
                  if (savedMessages.length > 0) {
                    remoteRevisionRef.current = typeof remote.revision === "number" ? remote.revision : remoteRevisionRef.current;
                    await reconcileRoomCacheRemoteMessages(savedMessages);
                  }
                });
              })()
            : syncRemoteRoomMessageStream({
                baseRevision: remoteRevisionRef.current,
                messages,
                roomId: resolvedDocRoomId,
              }).then(async (remote) => {
                if (!isActiveRemoteSaveGeneration(saveGeneration)) {
                  return;
                }
                if (remote.conflict) {
                  remoteRevisionRef.current = typeof remote.revision === "number" ? remote.revision : remoteRevisionRef.current;
                  throw new Error("文档云端版本已变化");
                }
                remoteRevisionRef.current = typeof remote.revision === "number" ? remote.revision : remoteRevisionRef.current;
                const savedMessages = readRoomMessageStreamMessages(remote);
                if (savedMessages.length > 0) {
                  await onRemoteMessagesSaved?.(savedMessages);
                }
                else {
                  console.warn("[MessageEditor] remote sync returned no usable messages, keep local room cache untouched");
                }
              }))
        : setPersistedDocSnapshot(resolvedDocId, snapshot).then(() => {
            setCachedDocSnapshot(resolvedDocId, snapshot);
          });

      void persistTask
        .then(() => {
          if (saveGenerationRef.current === saveGeneration) {
            const savedBaseline = isRoomCacheSource ? messagesRef.current : messages;
            lastSavedSerializedRef.current = isRoomCacheSource
              ? serializeMessageEditorMessages(savedBaseline)
              : snapshot.updateB64;
            dirtySinceLoadRef.current = false;
            baselineMessagesRef.current = savedBaseline;
            setSaveState("saved");
          }
          if (activeRemoteSaveGenerationRef.current === saveGeneration) {
            activeRemoteSaveGenerationRef.current = null;
          }
        })
        .catch((error) => {
          console.error("[MessageEditor] persist snapshot failed", error);
          if (saveGenerationRef.current === saveGeneration) {
            setSaveState("error");
          }
          if (activeRemoteSaveGenerationRef.current === saveGeneration) {
            activeRemoteSaveGenerationRef.current = null;
          }
        });
    }, shouldSyncRemote ? MESSAGE_EDITOR_REMOTE_SYNC_DELAY_MS : MESSAGE_EDITOR_LOCAL_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isActiveRemoteSaveGeneration, isRoomCacheSource, messages, onRemoteMessagesSaved, readOnly, ready, reconcileRoomCacheRemoteMessages, remoteSource, resolvedDocId, resolvedDocRoomId, shouldSyncRemote]);

  useEffect(() => {
    return () => {
      saveGenerationRef.current += 1;
      if (readOnly || !resolvedDocId || !dirtySinceLoadRef.current) {
        return;
      }

      const snapshot = createMessageEditorSnapshot(messagesRef.current);
      if (snapshot.updateB64 === lastSavedSerializedRef.current) {
        return;
      }

      if (shouldSyncRemote && resolvedDocRoomId && !hasMeaningfulMessageEditorContent(messagesRef.current)) {
        console.warn("[MessageEditor] skip empty room message-stream flush to avoid clearing content");
        return;
      }

      lastSavedSerializedRef.current = snapshot.updateB64;
      if (shouldSyncRemote && resolvedDocRoomId) {
        const saveGeneration = saveGenerationRef.current;
        activeRemoteSaveGenerationRef.current = saveGeneration;
        const persistRemote = isRoomCacheSource
          ? (() => {
              const operations = buildRoomMessagePatchOperations(baselineMessagesRef.current, messagesRef.current);
              if (operations.length === 0) {
                return Promise.resolve();
              }
              return patchRemoteRoomMessageStream({
                operations,
                roomId: resolvedDocRoomId,
              }).then((remote) => {
                if (!isActiveRemoteSaveGeneration(saveGeneration)) {
                  return;
                }
                const savedMessages = readRoomMessageStreamMessages(remote);
                if (savedMessages.length > 0) {
                  remoteRevisionRef.current = typeof remote.revision === "number" ? remote.revision : remoteRevisionRef.current;
                  void reconcileRoomCacheRemoteMessages(savedMessages, { updateState: false });
                }
              });
            })()
          : syncRemoteRoomMessageStream({
              baseRevision: remoteRevisionRef.current,
              messages: messagesRef.current,
              roomId: resolvedDocRoomId,
            }).then((remote) => {
              if (!isActiveRemoteSaveGeneration(saveGeneration)) {
                return;
              }
              if (!remote.conflict && typeof remote.revision === "number") {
                remoteRevisionRef.current = remote.revision;
              }
              if (!remote.conflict) {
                const savedMessages = readRoomMessageStreamMessages(remote);
                if (savedMessages.length > 0) {
                  void onRemoteMessagesSaved?.(savedMessages);
                }
                else {
                  console.warn("[MessageEditor] remote flush returned no usable messages, keep local room cache untouched");
                }
              }
            });
        void persistRemote.catch((error) => {
          console.warn("[MessageEditor] flush remote room message stream failed", error);
        }).finally(() => {
          if (activeRemoteSaveGenerationRef.current === saveGeneration) {
            activeRemoteSaveGenerationRef.current = null;
          }
        });
        return;
      }

      setCachedDocSnapshot(resolvedDocId, snapshot);
      void setPersistedDocSnapshot(resolvedDocId, snapshot).catch((error) => {
        console.error("[MessageEditor] flush snapshot failed", error);
      });
    };
  }, [isActiveRemoteSaveGeneration, isRoomCacheSource, onRemoteMessagesSaved, readOnly, reconcileRoomCacheRemoteMessages, remoteSource, resolvedDocId, resolvedDocRoomId, shouldSyncRemote]);

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

  const crossBlockSelectionText = useMemo(() => {
    return crossBlockSelection
      ? getMessageEditorSelectionText(messages, crossBlockSelection.selection)
      : "";
  }, [crossBlockSelection, messages]);

  const focusTextPoint = useCallback((point: MessageEditorSelectionPoint | null) => {
    if (!point) {
      return;
    }

    clearCrossBlockSelection();
    hideToolbar();
    setActiveBlockId(point.blockId);
    controllerRef.current?.setActiveBlock(point.blockId);
    restoreSelectionRef.current = {
      blockId: point.blockId,
      caret: point.offset,
    };
    window.requestAnimationFrame(() => {
      restorePendingSelection();
    });
  }, [clearCrossBlockSelection, hideToolbar, restorePendingSelection]);

  const showDocumentTextSelection = useCallback((selection: MessageEditorSelection | null) => {
    if (!selection) {
      return;
    }

    if (selection.collapsed) {
      focusTextPoint(selection.focus);
      return;
    }

    const focusBlock = blockRefsRef.current.get(selection.focus.blockId)
      ?? blockRefsRef.current.get(selection.end.blockId);
    const bounds = focusBlock?.getBoundingClientRect();
    setActiveBlockId(null);
    controllerRef.current?.setActiveBlock(null);
    hideToolbar();
    window.getSelection()?.removeAllRanges();
    setCrossBlockSelectionPreview(null);
    setCrossBlockSelection({
      position: bounds
        ? {
            x: bounds.left + bounds.width / 2,
            y: bounds.top,
          }
        : { x: 0, y: 0 },
      selection,
    });
  }, [focusTextPoint, hideToolbar]);

  const focusAfterSelectionEdit = useCallback((focus: { blockId: string; caret: number } | null) => {
    if (!focus) {
      return;
    }
    focusTextPoint({
      blockId: focus.blockId,
      offset: focus.caret,
    });
  }, [focusTextPoint]);

  const restoreSelectionAfterSelectionEdit = useCallback((result: MessageEditorSelectionTextResult | null) => {
    if (!result) {
      return;
    }

    const nextSelection = createMessageEditorSelection(
      result.messages,
      registry,
      result.selection.start,
      result.selection.end,
    );
    if (!nextSelection || nextSelection.collapsed) {
      focusAfterSelectionEdit(result.focus);
      return;
    }

    clearCrossBlockSelection();
    setActiveBlockId(nextSelection.focus.blockId);
    controllerRef.current?.setActiveBlock(nextSelection.focus.blockId);
    restoreSelectionRef.current = {
      selection: nextSelection,
    };
  }, [clearCrossBlockSelection, focusAfterSelectionEdit, registry]);

  const restoreHistoryEntry = useCallback((entry: MessageEditorHistoryEntry) => {
    messagesRef.current = entry.messages;
    setMessages(entry.messages);
    if (entry.focus) {
      focusTextPoint({
        blockId: entry.focus.blockId,
        offset: entry.focus.caret,
      });
      return;
    }
    clearActiveBlock();
  }, [clearActiveBlock, focusTextPoint]);

  const performHistoryAction = useCallback((action: "redo" | "undo") => {
    const sourceStack = action === "undo" ? undoStackRef.current : redoStackRef.current;
    const targetEntry = sourceStack.at(-1);
    if (!targetEntry) {
      return false;
    }

    typingHistoryRef.current = null;
    const currentEntry = createHistoryEntry(messagesRef.current);
    const appendEntry = (stack: MessageEditorHistoryEntry[], entry: MessageEditorHistoryEntry) => {
      if (stack.at(-1)?.serialized === entry.serialized) {
        return stack;
      }
      return [...stack, entry].slice(-MESSAGE_EDITOR_HISTORY_LIMIT);
    };

    if (action === "undo") {
      undoStackRef.current = sourceStack.slice(0, -1);
      redoStackRef.current = appendEntry(redoStackRef.current, currentEntry);
    }
    else {
      redoStackRef.current = sourceStack.slice(0, -1);
      undoStackRef.current = appendEntry(undoStackRef.current, currentEntry);
    }

    restoreHistoryEntry(targetEntry);
    return true;
  }, [createHistoryEntry, restoreHistoryEntry]);

  const handleUndoRedoShortcut = useCallback((event: Pick<KeyboardEvent | React.KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "preventDefault" | "shiftKey" | "stopPropagation">) => {
    const action = resolveUndoRedoShortcut(event);
    if (!action) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    performHistoryAction(action);
    return true;
  }, [performHistoryAction]);

  const replaceDocumentSelectionText = useCallback((selection: MessageEditorSelection, replacement: string) => {
    const result = controllerRef.current?.replaceSelectionText(selection, replacement) ?? null;
    focusAfterSelectionEdit(result?.focus ?? null);
  }, [focusAfterSelectionEdit]);

  const handleTextStyleInsert = useCallback((replacement: string, selectedText: string, options?: { transform?: (selectedPart: string) => string }) => {
    const selection = crossBlockSelection?.selection ?? resolveEditorSelection(true);
    if (!selection || selection.collapsed) {
      return;
    }

    if (options?.transform) {
      const result = controllerRef.current?.transformSelectionText(selection, options.transform) ?? null;
      restoreSelectionAfterSelectionEdit(result);
      return;
    }

    const textEnhanceParams = parseWholeTextEnhanceReplacement(replacement, selectedText);
    const result = textEnhanceParams
      ? controllerRef.current?.transformSelectionText(selection, selectedPart => `[${selectedPart}](${textEnhanceParams})`) ?? null
      : controllerRef.current?.replaceSelectionText(selection, replacement) ?? null;
    restoreSelectionAfterSelectionEdit(result);
  }, [crossBlockSelection, resolveEditorSelection, restoreSelectionAfterSelectionEdit]);

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
      if (activeElement instanceof HTMLElement && (activeElement.closest(".text-style-toolbar") || activeElement.closest(".modal"))) {
        return;
      }
      clearActiveBlock();
    }, 0);
  }, [clearActiveBlock]);

  const resolveTextSelectionPointFromClientPosition = useCallback((clientX: number, clientY: number, preferredBlockId?: string): MessageEditorSelectionPoint | null => {
    const root = editorRootRef.current;
    if (!root) {
      return null;
    }

    return resolveMessageEditorTextPointFromClientPosition({
      blockRefs: blockRefsRef.current,
      blockShellRefs: blockShellRefsRef.current,
      clientX,
      clientY,
      messages: messagesRef.current,
      preferredBlockId,
      registry,
      root,
    });
  }, [registry]);

  const startTextPointerSelection = useCallback((
    anchor: MessageEditorSelectionPoint,
    event: React.MouseEvent<HTMLElement>,
    activateCaret: () => void,
  ) => {
    if (readOnly || event.button !== 0) {
      return;
    }

    const root = editorRootRef.current;
    if (!root) {
      return;
    }

    event.preventDefault();
    pointerSelectionCleanupRef.current?.();
    clearCrossBlockSelection();
    setIsPointerSelecting(true);
    hideToolbar();

    const documentRef = root.ownerDocument;
    const startPosition = {
      x: event.clientX,
      y: event.clientY,
    };
    let didDrag = false;

    const handleDocumentMouseMove = (moveEvent: MouseEvent) => {
      if ((moveEvent.buttons & 1) === 0) {
        return;
      }

      if (!didDrag) {
        didDrag = Math.abs(moveEvent.clientX - startPosition.x) > 3
          || Math.abs(moveEvent.clientY - startPosition.y) > 3;
      }
      if (!didDrag) {
        return;
      }

      const resolvedFocus = resolveTextSelectionPointFromClientPosition(moveEvent.clientX, moveEvent.clientY);
      if (!resolvedFocus) {
        return;
      }

      const selection = createMessageEditorSelection(messagesRef.current, registry, anchor, resolvedFocus);
      if (!selection || selection.collapsed) {
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
        setActiveBlockId(null);
        controllerRef.current?.setActiveBlock(null);
        setCrossBlockSelectionPreview(null);
        setCrossBlockSelection({
          position: nextPosition,
          selection: nextSelection,
        });
        window.getSelection()?.removeAllRanges();
        return;
      }
      if (!didDrag) {
        activateCaret();
        return;
      }
      clearCrossBlockSelection();
    };

    pointerSelectionCleanupRef.current = cleanup;
    documentRef.addEventListener("mousemove", handleDocumentMouseMove);
    documentRef.addEventListener("mouseup", handleDocumentMouseUp, { once: true });
  }, [clearCrossBlockSelection, hideToolbar, readOnly, registry, resolveTextSelectionPointFromClientPosition]);

  const handleTextMouseDown = useCallback((blockId: string, event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = resolveTextSelectionPointFromClientPosition(event.clientX, event.clientY, blockId);
    if (!anchor) {
      return;
    }

    startTextPointerSelection(anchor, event, () => {
      focusTextPoint(anchor);
    });
  }, [focusTextPoint, resolveTextSelectionPointFromClientPosition, startTextPointerSelection]);

  const handleEditorSurfaceMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || event.button !== 0) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (
      target.closest("[data-me-block-id]")
      || target.closest("[data-me-block-hit]")
      || target.closest("[data-me-slash-menu]")
      || target.closest("[data-me-block-handle]")
    ) {
      return;
    }

    const anchor = resolveTextSelectionPointFromClientPosition(event.clientX, event.clientY);
    if (!anchor) {
      return;
    }

    const shouldAppendOnClick = Boolean(target.closest("[data-me-editor-bottom-space]"));
    startTextPointerSelection(anchor, event, () => {
      if (!shouldAppendOnClick) {
        focusTextPoint(anchor);
        return;
      }
      const focus = controllerRef.current?.ensureTrailingTextBlock() ?? null;
      if (!focus) {
        return;
      }
      setActiveBlockId(focus.blockId);
      restoreSelectionRef.current = focus;
    });
  }, [
    focusTextPoint,
    readOnly,
    resolveTextSelectionPointFromClientPosition,
    startTextPointerSelection,
  ]);

  useEffect(() => {
    return () => {
      pointerSelectionCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    let mouseUpTimer: number | null = null;
    const handleDocumentMouseUp = () => {
      if (mouseUpTimer != null) {
        window.clearTimeout(mouseUpTimer);
      }
      mouseUpTimer = window.setTimeout(() => {
        mouseUpTimer = null;
        if (pointerSelectionCleanupRef.current || isPointerSelecting || crossBlockSelection) {
          return;
        }

        const root = editorRootRef.current;
        const nativeSelection = window.getSelection();
        if (!root || !nativeSelection || nativeSelection.rangeCount === 0) {
          return;
        }

        const range = nativeSelection.getRangeAt(0);
        const resolvedSelection = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, range);
        if (!resolvedSelection || resolvedSelection.collapsed || !resolvedSelection.multiBlock) {
          return;
        }

        const rects = range.getClientRects();
        const rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();
        if (!rect) {
          return;
        }

        setActiveBlockId(null);
        controllerRef.current?.setActiveBlock(null);
        setCrossBlockSelectionPreview(null);
        setCrossBlockSelection({
          position: {
            x: rect.left + rect.width / 2,
            y: rect.top,
          },
          selection: resolvedSelection,
        });
        nativeSelection.removeAllRanges();
      }, 0);
    };

    document.addEventListener("mouseup", handleDocumentMouseUp);
    return () => {
      if (mouseUpTimer != null) {
        window.clearTimeout(mouseUpTimer);
      }
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [crossBlockSelection, isPointerSelecting, readOnly, registry]);

  const copySelectionTextToClipboard = useCallback((selection: MessageEditorSelection) => {
    const text = getMessageEditorSelectionText(messagesRef.current, selection);
    if (!text) {
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }, []);

  useEffect(() => {
    if (readOnly || !crossBlockSelection) {
      return;
    }

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreDocumentSelectionEventTarget(event.target)) {
        return;
      }
      if (handleUndoRedoShortcut(event)) {
        return;
      }

      const selection = crossBlockSelection.selection;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "c") {
        event.preventDefault();
        copySelectionTextToClipboard(selection);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "x") {
        event.preventDefault();
        copySelectionTextToClipboard(selection);
        replaceDocumentSelectionText(selection, "");
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearCrossBlockSelection();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        replaceDocumentSelectionText(selection, "");
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        if (!event.shiftKey) {
          focusTextPoint(direction < 0 ? selection.start : selection.end);
          return;
        }

        const nextFocus = moveMessageEditorTextPointByCharacter(messagesRef.current, registry, selection.focus, direction);
        if (nextFocus) {
          showDocumentTextSelection(createMessageEditorSelection(messagesRef.current, registry, selection.anchor, nextFocus));
        }
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        const direction = event.key === "ArrowUp" ? -1 : 1;
        if (!event.shiftKey) {
          focusTextPoint(direction < 0 ? selection.start : selection.end);
          return;
        }

        const nextFocus = getAdjacentMessageEditorTextBlockPoint(messagesRef.current, registry, selection.focus, direction, selection.focus.offset);
        if (nextFocus) {
          showDocumentTextSelection(createMessageEditorSelection(messagesRef.current, registry, selection.anchor, nextFocus));
        }
        return;
      }

      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        replaceDocumentSelectionText(selection, event.key);
      }
    };

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [
    clearCrossBlockSelection,
    copySelectionTextToClipboard,
    crossBlockSelection,
    focusTextPoint,
    handleUndoRedoShortcut,
    readOnly,
    registry,
    replaceDocumentSelectionText,
    showDocumentTextSelection,
  ]);

  useEffect(() => {
    if (readOnly || !crossBlockSelection) {
      return;
    }

    const handleDocumentPaste = (event: ClipboardEvent) => {
      if (shouldIgnoreDocumentSelectionEventTarget(event.target)) {
        return;
      }

      const text = event.clipboardData?.getData("text/plain");
      if (!text) {
        return;
      }

      event.preventDefault();
      replaceDocumentSelectionText(crossBlockSelection.selection, normalizeEditableText(text));
    };

    document.addEventListener("paste", handleDocumentPaste);
    return () => {
      document.removeEventListener("paste", handleDocumentPaste);
    };
  }, [crossBlockSelection, readOnly, replaceDocumentSelectionText]);

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

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      const runSelection = createMessageEditorTextRunSelection(messagesRef.current, registry, blockId);
      if (runSelection && !runSelection.collapsed) {
        event.preventDefault();
        showDocumentTextSelection(runSelection);
      }
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
    const currentMessage = messagesRef.current.find(message => getMessageEditorBlockId(message) === blockId);
    const currentContentLength = normalizeMessageEditorContent(currentMessage?.content).length;

    if (!event.metaKey && !event.ctrlKey && !event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      if (event.shiftKey) {
        const atBoundary = direction < 0
          ? editorSelection.focus.offset === 0
          : editorSelection.focus.offset === currentContentLength;
        if (atBoundary) {
          const nextFocus = moveMessageEditorTextPointByCharacter(messagesRef.current, registry, editorSelection.focus, direction);
          if (nextFocus) {
            event.preventDefault();
            showDocumentTextSelection(createMessageEditorSelection(messagesRef.current, registry, editorSelection.anchor, nextFocus));
          }
        }
        return;
      }

      if (editorSelection.collapsed) {
        const atBoundary = direction < 0
          ? editorSelection.focus.offset === 0
          : editorSelection.focus.offset === currentContentLength;
        if (atBoundary) {
          const adjacentPoint = getAdjacentMessageEditorTextBlockPoint(
            messagesRef.current,
            registry,
            editorSelection.focus,
            direction,
            direction < 0 ? Number.MAX_SAFE_INTEGER : 0,
          );
          if (adjacentPoint) {
            event.preventDefault();
            focusTextPoint(adjacentPoint);
          }
        }
      }
      return;
    }

    if (event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const shouldMove = direction < 0
        ? (!contentIsMultiline || isSelectionAtStart(range, blockElement))
        : (!contentIsMultiline || isSelectionAtEnd(range, blockElement));
      if (shouldMove) {
        const nextFocus = getAdjacentMessageEditorTextBlockPoint(messagesRef.current, registry, editorSelection.focus, direction, editorSelection.focus.offset);
        if (nextFocus) {
          event.preventDefault();
          showDocumentTextSelection(createMessageEditorSelection(messagesRef.current, registry, editorSelection.anchor, nextFocus));
        }
      }
      return;
    }

    if (event.key === "ArrowUp" && editorSelection.collapsed && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const shouldMove = !contentIsMultiline || isSelectionAtStart(range, blockElement);
      if (shouldMove) {
        event.preventDefault();
        const point = getAdjacentMessageEditorTextBlockPoint(messagesRef.current, registry, editorSelection.focus, -1, editorSelection.focus.offset);
        const focus = point
          ? {
              blockId: point.blockId,
              caret: point.offset,
            }
          : null;
        if (focus) {
          focusTextPoint({
            blockId: focus.blockId,
            offset: focus.caret,
          });
        }
      }
      return;
    }

    if (event.key === "ArrowDown" && editorSelection.collapsed && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const shouldMove = !contentIsMultiline || isSelectionAtEnd(range, blockElement);
      if (shouldMove) {
        event.preventDefault();
        const point = getAdjacentMessageEditorTextBlockPoint(messagesRef.current, registry, editorSelection.focus, 1, editorSelection.focus.offset);
        const focus = point
          ? {
              blockId: point.blockId,
              caret: point.offset,
            }
          : null;
        if (focus) {
          focusTextPoint({
            blockId: focus.blockId,
            offset: focus.caret,
          });
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
  }, [activeSlashSelectionIndex, focusTextPoint, handleSelectSlashItem, registry, showDocumentTextSelection, slashMenuState]);

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
      if (shouldIgnoreDocumentSelectionEventTarget(target)) {
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

  const handleResizeAtomicBlock = useCallback((blockId: string, size: { height: number; width: number }) => {
    controllerRef.current?.updateBlock(blockId, message => updateMessageEditorImageSize(message, size));
  }, []);

  const atomicMessages = useMemo(() => {
    return messages.map((message) => {
      return {
        blockId: getMessageEditorBlockId(message),
        message,
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
        <div
          ref={editorRootRef}
          className={getMessageEditorScrollViewportClassName()}
          onDragOver={handleBlockDragOver}
          onDrop={handleBlockDrop}
          onKeyDownCapture={(event) => {
            handleUndoRedoShortcut(event);
          }}
          onMouseDownCapture={(event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
              return;
            }
            if (
              target.closest("[data-me-block-id]")
              || target.closest("[data-me-block-hit]")
              || target.closest("[data-me-editor-surface]")
              || target.closest("[data-me-slash-menu]")
              || target.closest("[data-me-block-handle]")
              || target.closest("[data-me-editor-bottom-space]")
            ) {
              return;
            }
            clearActiveBlock();
          }}
        >
          {resolvedCoverUrl
            ? (
                <div className="h-40 w-full shrink-0 overflow-hidden border-b border-base-300 bg-base-200">
                  <img className="h-full w-full object-cover" src={resolvedCoverUrl} alt={resolvedTitle} />
                </div>
              )
            : null}

          <div className="border-b border-base-300 py-4">
            <div className={`${MESSAGE_EDITOR_CONTENT_WIDTH_CLASS} ${MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS} flex items-center justify-between gap-4`}>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-base-content md:text-xl">{resolvedTitle}</div>
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
          </div>

          {!ready && (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-base-content/45">
              载入中
            </div>
          )}

          {ready && (
            <div className="flex min-h-0 flex-col">
              <div
                data-me-editor-surface="true"
                role="presentation"
                className="flex min-h-svh w-full flex-col py-2"
                onMouseDown={handleEditorSurfaceMouseDown}
              >
                {atomicMessages.map(({ blockId, message, driver }) => {
                  const activeTextSelection = crossBlockSelectionPreview ?? crossBlockSelection?.selection ?? null;
                  const selectedBlockIndex = activeTextSelection?.blockIds.indexOf(blockId) ?? -1;
                  const showSelectedLineBreak = selectedBlockIndex >= 0
                    && selectedBlockIndex < (activeTextSelection?.blockIds.length ?? 0) - 1;
                  const showDropBefore = dragState
                    && dragState.draggedBlockId !== blockId
                    && dragState.targetBlockId === blockId
                    && dragState.position === "before";
                  const showDropAfter = dragState
                    && dragState.draggedBlockId !== blockId
                    && dragState.targetBlockId === blockId
                    && dragState.position === "after";

                  if (driver.kind === "text") {
                    const showPlaceholder = atomicMessages.length === 1
                      && normalizeMessageEditorContent(message.content).length === 0;
                    return (
                      <div
                        key={blockId}
                        ref={node => registerBlockShellRef(blockId, node)}
                        className={[
                          `group relative ${MESSAGE_EDITOR_CONTENT_WIDTH_CLASS} ${MESSAGE_EDITOR_BLOCK_GUTTER_CLASS} rounded-md ${MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS} transition`,
                          dragState?.draggedBlockId === blockId
                            ? "bg-base-100/80 ring-1 ring-base-300/80"
                            : "",
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
                              `${MESSAGE_EDITOR_BLOCK_HANDLE_CLASS} top-0`,
                              dragState?.draggedBlockId === blockId ? "!opacity-100" : "",
                            ].join(" ")}
                            onDragStart={event => handleBlockDragStart(blockId, event)}
                            onDragEnd={handleBlockDragEnd}
                            aria-label="拖拽排序"
                            title="拖拽排序"
                          >
                            <DraggableIcon className="size-6" />
                          </button>
                        )}
                        <MessageEditorTextBlock
                          active={activeBlockId === blockId}
                          blockId={blockId}
                          message={message}
                          onMouseDown={handleTextMouseDown}
                          placeholder={showPlaceholder ? "输入内容" : ""}
                          readOnly={readOnly}
                          registerBlockRef={registerBlockRef}
                          textInputRef={textStyleInputRef}
                          selectionSegment={(() => {
                            const segment = activeTextSelection?.segments.find(item => item.blockId === blockId);
                            if (segment) {
                              return {
                                ...segment,
                                showLineBreakAfter: showSelectedLineBreak,
                              };
                            }
                            if (showSelectedLineBreak) {
                              const contentLength = normalizeMessageEditorContent(message.content).length;
                              return {
                                end: contentLength,
                                showLineBreakAfter: true,
                                start: contentLength,
                              };
                            }
                            return null;
                          })()}
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
                        `group relative mt-9 mb-9 ${MESSAGE_EDITOR_CONTENT_WIDTH_CLASS} ${MESSAGE_EDITOR_BLOCK_GUTTER_CLASS} rounded-xl px-6 transition`,
                        dragState?.draggedBlockId === blockId
                          ? "bg-base-100/80 ring-1 ring-base-300/80"
                          : "",
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
                            `${MESSAGE_EDITOR_BLOCK_HANDLE_CLASS} top-1.5`,
                            dragState?.draggedBlockId === blockId ? "!opacity-100" : "",
                          ].join(" ")}
                          onDragStart={event => handleBlockDragStart(blockId, event)}
                          onDragEnd={handleBlockDragEnd}
                          aria-label="拖拽排序"
                          title="拖拽排序"
                        >
                          <DraggableIcon className="size-6" />
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
                          onResize={handleResizeAtomicBlock}
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
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!readOnly && (
        <TextStyleToolbar
          chatInputRef={textStyleInputRef}
          externalSelection={crossBlockSelection
            ? {
                position: crossBlockSelection.position,
                text: crossBlockSelectionText,
              }
            : undefined}
          onInsertText={handleTextStyleInsert}
          visible={Boolean(activeBlockId) || Boolean(crossBlockSelection)}
          className="text-style-toolbar"
        />
      )}
    </div>
  );
}

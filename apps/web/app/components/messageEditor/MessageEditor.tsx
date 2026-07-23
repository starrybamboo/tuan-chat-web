import type { ReactNode } from "react";
import type { ListRange } from "react-virtuoso";

import { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import { RoomContext } from "@/components/chat/core/roomContext";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import { parseImportedChatText } from "@/components/chat/utils/importChatText";
import { appToast } from "@/components/common/appToast/appToast";
import { useFloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";
import {
  readImageDimensions,
  readMediaDuration,
  readVideoDimensions,
} from "@/utils/media/mediaMetadata";
import { UploadUtils } from "@/utils/media/UploadUtils";

import type {
  MessageEditorContentAdapter,
  MessageEditorMessage,
  MessageEditorRoomSyncProgress,
  MessageEditorTcHeader,
} from "./messageEditorTypes";
import type { MessageEditorSlashMenuState } from "./model/messageEditorSlash";
import type { MessageEditorSpeakerMenuItem } from "./model/messageEditorSpeaker";
import type { MessageEditorSpeakerAvatarMenuItem } from "./model/messageEditorSpeakerAvatar";
import type {
  MessageEditorInsertBlockResult,
  MessageEditorSelectionTextResult,
} from "./model/messageEditorTextTransforms";
import type { MessageEditorInsertableBlockKind } from "./model/messageEditorTransforms";
import type {
  MessageEditorActions,
  MessageEditorEditTransaction,
} from "./runtime/messageEditorActions";
import type {
  MessageEditorHistoryEntry,
  MessageEditorHistoryFocus,
} from "./runtime/messageEditorHistoryManager";
import type { MessageEditorSelection, MessageEditorSelectionPoint } from "./runtime/messageEditorSelection";

import { useGetRoleAvatarsQuery } from "../../../api/hooks/RoleAndAvatarHooks";
import { MessageEditorBlockRow } from "./components/MessageEditorBlockRow";
import {
  MessageEditorFloatingHeader,
  MessageEditorHeader,
  shouldShowMessageEditorFloatingHeader,
} from "./components/MessageEditorHeader";
import { MessageEditorSlashMenu } from "./components/MessageEditorSlashMenu";
import { MessageEditorSpeakerAvatarMenu } from "./components/MessageEditorSpeakerAvatarMenu";
import { MessageEditorSpeakerHeader } from "./components/MessageEditorSpeakerHeader";
import { MessageEditorSpeakerMenu } from "./components/MessageEditorSpeakerMenu";
import {
  MessageEditorVirtualizedBlockList,
  type MessageEditorVirtualizedBlockListHandle,
} from "./components/MessageEditorVirtualizedBlockList";
import useMessageEditorMessageMutations from "./hooks/useMessageEditorMessageMutations";
import {
  MESSAGE_EDITOR_BLOCK_GUTTER_CLASS,
  MESSAGE_EDITOR_BLOCK_DRAG_SURFACE_CLASS,
  MESSAGE_EDITOR_BLOCK_WIDTH_CLASS,
  MESSAGE_EDITOR_COMMAND_MENU_LAYER_CLASS,
  MESSAGE_EDITOR_DEFAULT_FRAME_CLASS,
  MESSAGE_EDITOR_SCROLL_VIEWPORT_CLASS,
  MESSAGE_EDITOR_SPEAKER_HANDLE_CLASS,
  MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS,
} from "./messageEditorLayout";
import { resolveMessageEditorSlashMenuState } from "./model/messageEditorSlash";
import {
  buildMessageEditorSpeakerMenuItems,
  extractMessageEditorSpeakerCommandMatch,
  hasMessageEditorSpeaker,
  isMessageEditorSpeakerMenuCommitKey,
  resolveMessageEditorSpeakerRoles,
  splitMessageEditorSpeakerCommandQuery,
} from "./model/messageEditorSpeaker";
import {
  buildMessageEditorSpeakerAvatarClearMenuItems,
  buildMessageEditorSpeakerAvatarMenuItems,
} from "./model/messageEditorSpeakerAvatar";
import {
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  isMessageEditorTextMessage,
  normalizeMessageEditorContent,
} from "./model/messageEditorTransforms";
import {
  estimateMessageEditorBlockHeight,
} from "./model/messageEditorVirtualizationPolicy";
import { createMessageEditorActions } from "./runtime/messageEditorActions";
import { MessageEditorBlockDragSession } from "./runtime/messageEditorBlockDragSession";
import {
  getMessageEditorClipboardFiles,
  getMessageEditorMediaBlockKindForFile,
  getMessageEditorMediaBlockKindForMessage,
  isMessageEditorFileDrag,
  isMessageEditorUploadableMediaMessage,
} from "./runtime/messageEditorFileDrop";
import { MessageEditorHistoryManager } from "./runtime/messageEditorHistoryManager";
import {
  resolveMessageEditorBlockIdFromNode,
  resolveMessageEditorDropTarget,
  resolveMessageEditorTextPointFromClientPosition,
  resolveMessageEditorVisibleDropTarget,
} from "./runtime/messageEditorHitTest";
import {
  MessageEditorPointerSelectionSession,
  resolveMessageEditorPointerAutoScrollDelta,
} from "./runtime/messageEditorPointerSelectionSession";
import { createMessageEditorRegistry } from "./runtime/messageEditorRegistry";
import {
  createMessageEditorDocumentSelectionFromDocument,
  createMessageEditorSelection,
  createMessageEditorSelectionDocument,
  createMessageEditorSelectionFromDocument,
  createMessageEditorSelectionRenderLookup,
  getAdjacentMessageEditorDocumentBlockPoint,
  getAdjacentMessageEditorTextBlockPoint,
  getMessageEditorSelectionText,
  moveMessageEditorDocumentPointByCharacter,
  resolveMessageEditorSelectionFromNative,
  resolveMessageEditorSelectionFromRange,
  restoreMessageEditorSelection,
} from "./runtime/messageEditorSelection";

// ==== Props 与局部编排类型 ====

type MessageEditorProps = {
  adapter: MessageEditorContentAdapter;
  className?: string;
  coverUrl?: string;
  docId?: string;
  excerpt?: string;
  intentPrewarm?: boolean;
  onRequestImportTextPaste?: (text: string, insertAsPlainText: () => void) => void;
  onRequestClearRoomDocument?: () => void;
  roomDocumentSyncState?: "clean" | "syncing" | "error" | "ambiguous";
  roomDocumentSyncProgress?: MessageEditorRoomSyncProgress;
  roomDocumentProblemBlockIds?: ReadonlySet<string>;
  roomDocumentDeletedCount?: number;
  readOnly?: boolean;
  spaceId?: number;
  tcHeader?: MessageEditorTcHeader;
  title?: string;
  workspaceId?: string;
}

type MessageEditorDragState = {
  draggedBlockId: string;
  position: "before" | "after";
  targetBlockId: string;
}

type MessageEditorResolvedDragTarget = {
  position: "before" | "after";
  targetBlockId: string;
}

type PendingMessageEditorMediaUpload = {
  error?: string;
  file: File;
  requestId: number;
}

export function resolveMessageEditorFileDropPoint(
  target: MessageEditorResolvedDragTarget | null,
  messages: MessageEditorMessage[],
): MessageEditorSelectionPoint | null {
  if (!target) {
    return null;
  }

  const message = messages.find(item => getMessageEditorBlockId(item) === target.targetBlockId);
  if (!message) {
    return null;
  }

  return {
    blockId: target.targetBlockId,
    offset: target.position === "before"
      ? 0
      : isMessageEditorTextMessage(message)
        ? normalizeMessageEditorContent(message.content).length
        : 1,
  };
}

type MessageEditorSpeakerMenuState = {
  blockId: string;
  commandKey: string;
  items: MessageEditorSpeakerMenuItem[];
  prefix: "/" | "@";
  query: string;
  remainder: string;
}

type MessageEditorSpeakerAvatarMenuState = {
  blockId: string;
  clearSpeaker?: boolean;
  commandKey: string;
  remainder: string;
  roleId: number;
  roleLabel: string;
}

type MessageEditorFocusRestore = {
  blockId?: string;
  caret?: number;
  selection?: MessageEditorSelection;
}

export function shouldKeepMessageEditorFocusRestore(
  restore: MessageEditorFocusRestore | null,
  focusedBlockId: string,
) {
  const restoreBlockId = restore?.selection?.focus.blockId ?? restore?.blockId ?? null;
  return restoreBlockId === focusedBlockId;
}

/**
 * 空文本块没有可供浏览器建立原生选区的内容；必须在 pointer down 时切入
 * contenteditable，避免输入法首个 composition 落在尚未聚焦的预览节点上。
 */
export function shouldFocusEmptyTextBlockOnPointerDown(options: {
  content: string;
  mouseButton: number;
  readOnly: boolean;
}) {
  return !options.readOnly && options.mouseButton === 0 && normalizeMessageEditorContent(options.content).length === 0;
}

export function focusEmptyTextBlockBeforeIme(options: {
  active: boolean;
  content: string;
  mouseButton: number;
  readOnly: boolean;
}, actions: {
  activate: () => void;
  focusActiveEditor: () => void;
}) {
  if (!shouldFocusEmptyTextBlockOnPointerDown(options)) {
    return false;
  }

  actions.activate();
  if (options.active) {
    // mousedown 已被选区逻辑 preventDefault；激活块不会重新挂载，必须在同一事件中补回焦点。
    actions.focusActiveEditor();
  }
  return true;
}

// ==== 公共 helper 与远端持久化桥接 ====

export function isMessageEditorImportablePasteText(text: string): boolean {
  return parseImportedChatText(text).messages.length > 0;
}

export { extractMessageEditorSlashQuery } from "./model/messageEditorSlash";

// ==== 文本规范化与布局 class helper ====

function normalizeEditableText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

function useMessageEditorEventCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
) {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  return useCallback((...args: Args) => callbackRef.current(...args), []);
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

/**
 * 返回命令菜单浮层类名。菜单不能参与正文流式排版。
 */
export function getMessageEditorSlashMenuLayerClassName() {
  return MESSAGE_EDITOR_COMMAND_MENU_LAYER_CLASS;
}

/**
 * 解析文字块外壳类名。
 */
export function getMessageEditorTextBlockShellClassName(options: {
  isDragging: boolean;
}) {
  return [
    `group relative isolate ${MESSAGE_EDITOR_BLOCK_WIDTH_CLASS} ${MESSAGE_EDITOR_BLOCK_GUTTER_CLASS} rounded-md ${MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS} transition`,
    options.isDragging ? MESSAGE_EDITOR_BLOCK_DRAG_SURFACE_CLASS : "",
  ].join(" ");
}

export function getMessageEditorAtomicBlockShellClassName(options: {
  isActive: boolean;
  isDragging: boolean;
  isSelected: boolean;
  readOnly: boolean;
}) {
  return [
    `group relative isolate ${MESSAGE_EDITOR_BLOCK_WIDTH_CLASS} ${MESSAGE_EDITOR_BLOCK_GUTTER_CLASS} rounded-md ${MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS} py-1 transition`,
    options.readOnly ? "cursor-default" : "cursor-pointer",
    options.isDragging
      ? MESSAGE_EDITOR_BLOCK_DRAG_SURFACE_CLASS
      : "",
  ].join(" ");
}

export function resolveMessageEditorTextClickFocusPoint(
  blockId: string,
  hitPoint: MessageEditorSelectionPoint | null,
): MessageEditorSelectionPoint {
  return hitPoint ?? { blockId, offset: 0 };
}

export function shouldHandleMessageEditorAtomicBlockKeyDown(options: {
  altKey: boolean;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  key: string;
  metaKey: boolean;
  readOnly: boolean;
}) {
  return !options.readOnly && !options.metaKey && !options.ctrlKey && !options.altKey
    && (options.key === "Backspace" || options.key === "Delete" || options.key === "ArrowUp" || options.key === "ArrowDown");
}

export { resolveMessageEditorPointerAutoScrollDelta };
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


function MessageEditorFloatingCommandMenu({ children }: { children: ReactNode }) {
  return (
    <div className={getMessageEditorSlashMenuLayerClassName()}>
      {children}
    </div>
  );
}

/**
 * 判断文档级点击是否应被视为编辑器外部点击。
 * 工具栏内部的 SVG / Path 等元素同样需要被识别为“内部”，否则会误触发清理逻辑。
 */
// ==== DOM 事件守卫 ====

type MessageEditorSelectionEventElementLike = {
  closest?: (selector: string) => MessageEditorSelectionEventElementLike | null;
  parentElement?: MessageEditorSelectionEventElementLike | null;
  tagName?: string;
}

const ATOMIC_BLOCK_SELECTION_IGNORED_TAG_NAMES = new Set([
  "A",
  "AUDIO",
  "BUTTON",
  "CANVAS",
  "IFRAME",
  "INPUT",
  "OPTION",
  "SELECT",
  "TEXTAREA",
  "VIDEO",
]);

const ATOMIC_BLOCK_SELECTION_IGNORED_SELECTORS = [
  ".modal",
  ".text-style-toolbar",
  "[contenteditable='true']",
  "[data-me-block-handle]",
  "[data-me-slash-menu]",
  "[data-me-speaker-menu]",
  "[data-me-speaker-avatar-menu]",
  "[role='dialog']",
];

function closestAny(element: MessageEditorSelectionEventElementLike, selectors: string[]) {
  return selectors.some(selector => Boolean(element.closest?.(selector)));
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

export function shouldStartMessageEditorAtomicBlockSelection(target: EventTarget | null) {
  const candidate = target as MessageEditorSelectionEventElementLike | null;
  const element = candidate && typeof candidate.closest === "function"
    ? candidate
    : candidate?.parentElement ?? null;
  const tagName = element?.tagName?.toUpperCase();

  if (!element || typeof element.closest !== "function" || !tagName) {
    return false;
  }

  if (ATOMIC_BLOCK_SELECTION_IGNORED_TAG_NAMES.has(tagName)) {
    return false;
  }

  return !closestAny(element, ATOMIC_BLOCK_SELECTION_IGNORED_SELECTORS);
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

/**
 * 基于 message-stream 的线性文档编辑器。
 */
// ==== MessageEditor 中心编排器 ====

export default function MessageEditor({
  adapter,
  className,
  coverUrl,
  docId,
  excerpt: _excerpt,
  onRequestImportTextPaste,
  onRequestClearRoomDocument,
  readOnly = false,
  spaceId,
  tcHeader,
  title,
  workspaceId,
  roomDocumentSyncState,
  roomDocumentSyncProgress,
  roomDocumentProblemBlockIds,
  roomDocumentDeletedCount,
}: MessageEditorProps) {
  const roomContext = use(RoomContext);

  /**
   * 状态拓扑：
   * - messages 是渲染源，messagesRef 是事件回调和控制器读取的同步镜像。
   * - actions 声明用户心智级编辑意图，所有事务都经 commitEditorTransaction 写入文档、历史与 dirty 标记。
   * - historyManagerRef 封装 undo / redo / typing merge 规则，避免历史栈 invariant 散落在 React refs 中。
   * - activeBlockId、crossBlockSelection、restoreSelectionRef 构成焦点层，低层由 applyFocusTarget 提交，高层由 activate* command 编排。
   * - useMessageEditorMessageMutations 统一提交消息事务，并封装 dirty、批处理、乐观更新和持久化对账。
   */

  // ==== 文档身份与初始来源 ====
  const frameClassName = getMessageEditorFrameClassName(className);
  const resolvedDocId = docId?.trim() || undefined;
  const resolvedSpaceId = typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0 ? spaceId : undefined;
  const resolvedWorkspaceId = workspaceId?.trim() || undefined;
  const resolvedDocRoomId = resolvedDocId && /^\d+$/.test(resolvedDocId) ? Number(resolvedDocId) : undefined;
  const isRoomDocument = Boolean(
    resolvedDocRoomId
    && resolvedSpaceId
    && (!resolvedWorkspaceId || resolvedWorkspaceId.startsWith("space:")),
  );
  // ==== Runtime refs 与 DOM registry ====
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const blockRefsRef = useRef(new Map<string, HTMLDivElement>());
  const blockShellRefsRef = useRef(new Map<string, HTMLDivElement>());
  const blockSlotRefsRef = useRef(new Map<string, HTMLDivElement>());
  const virtualizedBlockListRef = useRef<MessageEditorVirtualizedBlockListHandle | null>(null);
  const actionsRef = useRef<MessageEditorActions | null>(null);
  const textStyleInputRef = useRef<ChatInputAreaHandle | null>(null);
  const historyManagerRef = useRef(new MessageEditorHistoryManager());
  const uploadUtils = useMemo(() => new UploadUtils(), []);
  const restoreSelectionRef = useRef<MessageEditorFocusRestore | null>(null);
  const pointerSelectionSessionRef = useRef<MessageEditorPointerSelectionSession | null>(null);
  const blockDragSessionRef = useRef<MessageEditorBlockDragSession | null>(null);
  const headerVisibilityMarkerRef = useRef<HTMLDivElement | null>(null);
  // ==== React 交互状态 ====
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [crossBlockSelection, setCrossBlockSelection] = useState<{
    position: { x: number; y: number };
    selection: MessageEditorSelection;
  } | null>(null);
  const [crossBlockSelectionPreview, setCrossBlockSelectionPreview] = useState<MessageEditorSelection | null>(null);
  const [dragState, setDragState] = useState<MessageEditorDragState | null>(null);
  const [fileDropTarget, setFileDropTarget] = useState<MessageEditorResolvedDragTarget | null>(null);
  const [isPointerSelecting, setIsPointerSelecting] = useState(false);
  const [slashSelectionIndex, setSlashSelectionIndex] = useState(0);
  const [dismissedSlashKey, setDismissedSlashKey] = useState<string | null>(null);
  const [speakerSelectionIndex, setSpeakerSelectionIndex] = useState(0);
  const [dismissedSpeakerKey, setDismissedSpeakerKey] = useState<string | null>(null);
  const [speakerAvatarMenuState, setSpeakerAvatarMenuState] = useState<MessageEditorSpeakerAvatarMenuState | null>(null);
  const [speakerAvatarSelectionIndex, setSpeakerAvatarSelectionIndex] = useState(0);
  const [speakerAvatarSearchQuery, setSpeakerAvatarSearchQuery] = useState("");
  const [editorScrollRoot, setEditorScrollRoot] = useState<HTMLDivElement | null>(null);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const [composingBlockId, setComposingBlockId] = useState<string | null>(null);
  const [pendingMediaUploads, setPendingMediaUploads] = useState<Map<string, PendingMessageEditorMediaUpload>>(new Map());
  const pendingMediaUploadsRef = useRef(new Map<string, PendingMessageEditorMediaUpload>());
  const pendingMediaUploadRequestIdRef = useRef(0);
  const ready = adapter.ready;
  // ==== Runtime 单例与加载镜像 ====
  const registry = useMemo(() => createMessageEditorRegistry(), []);

  useEffect(() => {
    const root = editorScrollRoot;
    const marker = headerVisibilityMarkerRef.current;
    if (!root || !marker) {
      setShowFloatingHeader(false);
      return;
    }

    const commitVisibility = (isIntersecting: boolean, markerTop: number, viewportTop: number) => {
      const nextVisible = shouldShowMessageEditorFloatingHeader({
        isIntersecting,
        markerTop,
        viewportTop,
      });
      setShowFloatingHeader(previous => previous === nextVisible ? previous : nextVisible);
    };
    const measureVisibility = () => {
      const markerRect = marker.getBoundingClientRect();
      const viewportRect = root.getBoundingClientRect();
      commitVisibility(
        markerRect.bottom >= viewportRect.top && markerRect.top <= viewportRect.bottom,
        markerRect.top,
        viewportRect.top,
      );
    };

    measureVisibility();
    const view = marker.ownerDocument.defaultView;
    const ViewIntersectionObserver = view?.IntersectionObserver;
    if (typeof ViewIntersectionObserver !== "function") {
      root.addEventListener("scroll", measureVisibility, { passive: true });
      view?.addEventListener("resize", measureVisibility);
      return () => {
        root.removeEventListener("scroll", measureVisibility);
        view?.removeEventListener("resize", measureVisibility);
      };
    }

    const observer = new ViewIntersectionObserver((entries) => {
      const entry = entries.at(-1);
      if (!entry) {
        return;
      }
      commitVisibility(
        entry.isIntersecting,
        entry.boundingClientRect.top,
        entry.rootBounds?.top ?? root.getBoundingClientRect().top,
      );
    }, {
      root,
      threshold: 0,
    });
    observer.observe(marker);
    return () => observer.disconnect();
  }, [editorScrollRoot]);

  // ==== 核心 command 与 commit helper ====
  const stageFocusRestore = useCallback((restore: MessageEditorFocusRestore | null) => {
    restoreSelectionRef.current = restore;
  }, []);

  const commitActiveBlock = useCallback((blockId: string | null) => {
    setActiveBlockId(blockId);
  }, []);

  const applyFocusTarget = useCallback((target: MessageEditorFocusRestore | null) => {
    const blockId = target?.selection?.focus.blockId ?? target?.blockId ?? null;
    commitActiveBlock(blockId);
    stageFocusRestore(target);
  }, [commitActiveBlock, stageFocusRestore]);

  const clearCrossBlockSelection = useCallback(() => {
    setCrossBlockSelectionPreview(null);
    setCrossBlockSelection(null);
  }, []);

  const commitCrossBlockSelectionPreview = useCallback((selection: MessageEditorSelection | null) => {
    setCrossBlockSelectionPreview(selection);
    if (selection) {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  const clearSpeakerAvatarMenu = useCallback(() => {
    setSpeakerAvatarMenuState(null);
    setSpeakerAvatarSelectionIndex(0);
    setSpeakerAvatarSearchQuery("");
  }, []);

  const openSpeakerAvatarMenu = useCallback((state: MessageEditorSpeakerAvatarMenuState, searchQuery: string) => {
    setSpeakerAvatarMenuState(state);
    setSpeakerAvatarSearchQuery(searchQuery);
    setSpeakerAvatarSelectionIndex(0);
  }, []);

  const clearEditorInteractionState = useCallback(() => {
    applyFocusTarget(null);
    clearCrossBlockSelection();
    clearSpeakerAvatarMenu();
  }, [applyFocusTarget, clearCrossBlockSelection, clearSpeakerAvatarMenu]);

  const resetSlashCommandMenu = useCallback(() => {
    setDismissedSlashKey(null);
    setSlashSelectionIndex(0);
  }, []);

  const clearSlashCommandDismissal = useCallback(() => {
    setDismissedSlashKey(null);
  }, []);

  const dismissSlashCommandMenu = useCallback((slashKey: string) => {
    setDismissedSlashKey(slashKey);
  }, []);

  const moveSlashCommandSelection = useCallback((delta: -1 | 1, itemCount: number) => {
    setSlashSelectionIndex((previous) => {
      return Math.max(0, Math.min(previous + delta, itemCount - 1));
    });
  }, []);

  const resetSpeakerCommandMenu = useCallback(() => {
    setDismissedSpeakerKey(null);
    setSpeakerSelectionIndex(0);
  }, []);

  const clearSpeakerCommandDismissal = useCallback(() => {
    setDismissedSpeakerKey(null);
  }, []);

  const resetSpeakerCommandSelection = useCallback(() => {
    setSpeakerSelectionIndex(0);
  }, []);

  const dismissSpeakerCommandMenu = useCallback((commandKey: string) => {
    setDismissedSpeakerKey(commandKey);
  }, []);

  const moveSpeakerCommandSelection = useCallback((delta: -1 | 1, itemCount: number) => {
    setSpeakerSelectionIndex((previous) => {
      return Math.max(0, Math.min(previous + delta, itemCount - 1));
    });
  }, []);

  const moveSpeakerAvatarCommandSelection = useCallback((delta: -1 | 1, itemCount: number) => {
    setSpeakerAvatarSelectionIndex((previous) => {
      return Math.max(0, Math.min(previous + delta, Math.max(0, itemCount - 1)));
    });
  }, []);

  const resetSpeakerAvatarCommandSelection = useCallback(() => {
    setSpeakerAvatarSelectionIndex(0);
  }, []);

  const appendSpeakerAvatarSearchCharacter = useCallback((character: string) => {
    setSpeakerAvatarSearchQuery(previous => `${previous}${character}`);
    setSpeakerAvatarSelectionIndex(0);
  }, []);

  const deleteSpeakerAvatarSearchCharacter = useCallback(() => {
    setSpeakerAvatarSearchQuery(previous => previous.slice(0, -1));
  }, []);

  const resolveHistoryFocus = useCallback((sourceMessages: MessageEditorMessage[]): MessageEditorHistoryFocus | null => {
    const sourceByBlockId = new Map(sourceMessages.map(message => [getMessageEditorBlockId(message), message] as const));
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
      const resolved = resolveMessageEditorSelectionFromNative(root, sourceMessages, registry, nativeSelection);
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

  const createHistoryEntry = useCallback((sourceMessages: MessageEditorMessage[]): MessageEditorHistoryEntry => {
    return {
      focus: resolveHistoryFocus(sourceMessages),
      messages: sourceMessages,
    };
  }, [resolveHistoryFocus]);

  const {
    commitTransaction: commitEditorTransaction,
    getCurrentMessages,
    messages,
    messagesRef,
    restoreSnapshot: commitDocumentSnapshot,
    saveState,
  } = useMessageEditorMessageMutations({
    adapter,
    createHistoryEntry,
    historyManager: historyManagerRef.current,
    readOnly,
  });
  const selectionDocument = useMemo(() => createMessageEditorSelectionDocument(messages), [messages]);
  const messageByBlockId = selectionDocument.messageByBlockId;

  useEffect(() => {
    const blockIds = new Set(messages.map(getMessageEditorBlockId));
    const hasRemovedUpload = [...pendingMediaUploadsRef.current.keys()].some(blockId => !blockIds.has(blockId));
    if (!hasRemovedUpload) {
      return;
    }

    const nextPendingUploads = new Map(
      [...pendingMediaUploadsRef.current].filter(([blockId]) => blockIds.has(blockId)),
    );
    pendingMediaUploadsRef.current = nextPendingUploads;
    setPendingMediaUploads(nextPendingUploads);
  }, [messages]);

  const resetHistory = useCallback(() => {
    historyManagerRef.current.reset();
  }, []);

  useEffect(() => {
    actionsRef.current = createMessageEditorActions({
      createHistoryEntry,
      historyManager: historyManagerRef.current,
      registry,
      getMessages: getCurrentMessages,
    });
  }, [createHistoryEntry, getCurrentMessages, registry]);

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

  const clearSelectionInteractionState = useCallback(() => {
    clearCrossBlockSelection();
    hideToolbar();
  }, [clearCrossBlockSelection, hideToolbar]);

  const commitCrossBlockSelection = useCallback((
    selection: MessageEditorSelection,
    position: { x: number; y: number },
    options: { hideToolbar?: boolean } = {},
  ) => {
    applyFocusTarget(null);
    if (options.hideToolbar !== false) {
      hideToolbar();
    }
    setCrossBlockSelectionPreview(null);
    setCrossBlockSelection({
      position,
      selection,
    });
    window.getSelection()?.removeAllRanges();
  }, [applyFocusTarget, hideToolbar]);

  const commitRestoredDocumentSelection = useCallback((selection: MessageEditorSelection) => {
    clearCrossBlockSelection();
    applyFocusTarget({ selection });
  }, [applyFocusTarget, clearCrossBlockSelection]);

  const commitCommandFocusResult = useCallback((
    focus: MessageEditorFocusRestore | null,
    options: { clearWhenMissing?: boolean; hideToolbar?: boolean } = {},
  ) => {
    if (options.hideToolbar) {
      hideToolbar();
    }
    if (focus) {
      applyFocusTarget(focus);
      return true;
    }
    if (options.clearWhenMissing) {
      clearEditorInteractionState();
    }
    return false;
  }, [applyFocusTarget, clearEditorInteractionState, hideToolbar]);

  const commitSpeakerCommandResult = useCallback((blockId: string, nextContent: string) => {
    resetSpeakerCommandMenu();
    commitCommandFocusResult({
      blockId,
      caret: normalizeMessageEditorContent(nextContent).length,
    }, { hideToolbar: true });
  }, [commitCommandFocusResult, resetSpeakerCommandMenu]);

  const commitTextInputInteraction = useCallback((blockId: string) => {
    clearCrossBlockSelection();
    clearSpeakerCommandDismissal();
    if (speakerAvatarMenuState?.blockId === blockId) {
      clearSpeakerAvatarMenu();
    }
  }, [clearCrossBlockSelection, clearSpeakerAvatarMenu, clearSpeakerCommandDismissal, speakerAvatarMenuState]);

  const activateBlock = useCallback((blockId: string, options: { clearDismissedSlash?: boolean } = {}) => {
    clearCrossBlockSelection();
    if (options.clearDismissedSlash) {
      clearSlashCommandDismissal();
    }
    commitActiveBlock(blockId);
    if (!shouldKeepMessageEditorFocusRestore(restoreSelectionRef.current, blockId)) {
      stageFocusRestore(null);
    }
  }, [clearCrossBlockSelection, clearSlashCommandDismissal, commitActiveBlock, stageFocusRestore]);

  const restorePendingSelection = useCallback((requestedRestore?: MessageEditorFocusRestore | null) => {
    const root = editorRootRef.current;
    const pending = requestedRestore === undefined ? restoreSelectionRef.current : requestedRestore;
    if (!root || !pending) {
      return;
    }

    const focusEditableInsideBlock = (block: HTMLElement | null) => {
      const target = block?.matches("[contenteditable='true']")
        ? block
        : block?.matches("[data-me-atomic-focus]")
          ? block
          : block?.querySelector<HTMLElement>("[contenteditable='true'],[data-me-atomic-focus]");
      target?.focus?.({ preventScroll: true });
    };

    const isAtomicFocusTarget = (blockId: string) => {
      const message = selectionDocument.messageByBlockId.get(blockId);
      return Boolean(message && !registry.isTextBlock(message));
    };

    if (pending.selection) {
      const focusBlock = root.querySelector<HTMLElement>(`[data-me-block-id="${pending.selection.focus.blockId}"]`);
      if (!focusBlock) {
        const requested = virtualizedBlockListRef.current?.scrollBlockIntoView(
          pending.selection.focus.blockId,
          { align: "center", behavior: "auto" },
        );
        if (requested === false) {
          stageFocusRestore(null);
        }
        return;
      }

      if (pending.selection.multiBlock) {
        const bounds = focusBlock.getBoundingClientRect();
        stageFocusRestore(null);
        commitCrossBlockSelection(pending.selection, {
          x: bounds.left + bounds.width / 2,
          y: bounds.top,
        }, { hideToolbar: false });
        return;
      }

      if (isAtomicFocusTarget(pending.selection.focus.blockId)) {
        focusEditableInsideBlock(focusBlock);
        stageFocusRestore(null);
        return;
      }

      focusEditableInsideBlock(focusBlock);
      restoreMessageEditorSelection(root, pending.selection);
      stageFocusRestore(null);
      return;
    }

    if (pending.blockId && typeof pending.caret === "number") {
      const focusBlock = root.querySelector<HTMLElement>(`[data-me-block-id="${pending.blockId}"]`);
      if (!focusBlock) {
        const requested = virtualizedBlockListRef.current?.scrollBlockIntoView(
          pending.blockId,
          { align: "center", behavior: "auto" },
        );
        if (requested === false) {
          stageFocusRestore(null);
        }
        return;
      }
      if (isAtomicFocusTarget(pending.blockId)) {
        focusEditableInsideBlock(focusBlock);
        stageFocusRestore(null);
        return;
      }
      focusEditableInsideBlock(focusBlock);
      const selection = createMessageEditorSelectionFromDocument(selectionDocument, registry, {
        blockId: pending.blockId,
        offset: pending.caret,
      }, {
        blockId: pending.blockId,
        offset: pending.caret,
      });
      if (selection) {
        restoreMessageEditorSelection(root, selection);
      }
      stageFocusRestore(null);
    }
  }, [commitCrossBlockSelection, registry, selectionDocument, stageFocusRestore]);

  useLayoutEffect(() => {
    if (!ready) {
      return;
    }
    queueMicrotask(restorePendingSelection);
  }, [activeBlockId, messages, ready, restorePendingSelection]);

  useEffect(() => {
    stageFocusRestore(null);
    hideToolbar();
    resetHistory();
  }, [adapter.identity, hideToolbar, resetHistory, stageFocusRestore]);

  // ==== 选区、历史与用户 action dispatch ====
  const resolveEditorSelection = useCallback((preferSaved = false) => {
    if (crossBlockSelection?.selection) {
      return crossBlockSelection.selection;
    }

    const root = editorRootRef.current;
    if (!root) {
      return null;
    }

    const selection = window.getSelection();
    if (!preferSaved && selection && selection.rangeCount > 0) {
      const resolved = resolveMessageEditorSelectionFromNative(root, messagesRef.current, registry, selection);
      if (resolved) {
        return resolved;
      }
    }

    const saved = savedSelectionRef.current;
    if (!saved) {
      return null;
    }

    const resolved = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, saved.range);
    return resolved;
  }, [crossBlockSelection, registry, savedSelectionRef]);

  const crossBlockSelectionText = useMemo(() => {
    return crossBlockSelection
      ? getMessageEditorSelectionText(messages, crossBlockSelection.selection)
      : "";
  }, [crossBlockSelection, messages]);

  const activateTextPoint = useCallback((point: MessageEditorSelectionPoint | null) => {
    if (!point) {
      return;
    }

    clearSelectionInteractionState();
    const focusTarget = {
      blockId: point.blockId,
      caret: point.offset,
    };
    applyFocusTarget(focusTarget);
    window.requestAnimationFrame(() => {
      restorePendingSelection(focusTarget);
    });
  }, [applyFocusTarget, clearSelectionInteractionState, restorePendingSelection]);

  const activateBlockSelection = useCallback((selection: MessageEditorSelection | null) => {
    if (!selection) {
      return;
    }

    if (selection.collapsed) {
      activateTextPoint(selection.focus);
      return;
    }

    const focusBlock = blockRefsRef.current.get(selection.focus.blockId)
      ?? blockShellRefsRef.current.get(selection.focus.blockId)
      ?? blockRefsRef.current.get(selection.end.blockId)
      ?? blockShellRefsRef.current.get(selection.end.blockId);
    const bounds = focusBlock?.getBoundingClientRect();
    commitCrossBlockSelection(selection, bounds
      ? {
          x: bounds.left + bounds.width / 2,
          y: bounds.top,
        }
      : { x: 0, y: 0 });
  }, [activateTextPoint, commitCrossBlockSelection]);

  const commitSelectionBoundaryCollapse = useCallback((selection: MessageEditorSelection, direction: -1 | 1) => {
    activateTextPoint(direction < 0 ? selection.start : selection.end);
  }, [activateTextPoint]);

  const commitSelectionFocusExtension = useCallback((anchor: MessageEditorSelectionPoint, nextFocus: MessageEditorSelectionPoint | null) => {
    if (!nextFocus) {
      return;
    }

    activateBlockSelection(createMessageEditorSelectionFromDocument(selectionDocument, registry, anchor, nextFocus));
  }, [activateBlockSelection, registry, selectionDocument]);

  const applySelectionEditResult = useCallback((
    result: MessageEditorSelectionTextResult | null,
    options: { restoreExpandedSelection?: boolean } = {},
  ) => {
    if (!result) {
      return false;
    }

    if (options.restoreExpandedSelection) {
      const nextSelection = createMessageEditorSelection(
        result.messages,
        registry,
        result.selection.start,
        result.selection.end,
      );
      if (nextSelection && !nextSelection.collapsed) {
        commitRestoredDocumentSelection(nextSelection);
        return true;
      }
    }

    if (!result.focus) {
      clearEditorInteractionState();
      return true;
    }

    activateTextPoint({
      blockId: result.focus.blockId,
      offset: result.focus.caret,
    });
    return true;
  }, [activateTextPoint, clearEditorInteractionState, commitRestoredDocumentSelection, registry]);

  const executeFocusAction = useCallback((
    action: (actions: MessageEditorActions) => MessageEditorEditTransaction<{ blockId: string; caret: number } | null> | null,
    options: { clearWhenMissing?: boolean; hideToolbar?: boolean } = {},
  ) => {
    const actions = actionsRef.current;
    const transaction = actions ? action(actions) : null;
    const focus = transaction ? commitEditorTransaction(transaction) : null;
    return commitCommandFocusResult(focus, options);
  }, [commitCommandFocusResult, commitEditorTransaction]);

  const executeSelectionEditAction = useCallback((
    action: (actions: MessageEditorActions) => MessageEditorEditTransaction<MessageEditorSelectionTextResult> | null,
    options: { restoreExpandedSelection?: boolean } = {},
  ) => {
    const actions = actionsRef.current;
    const transaction = actions ? action(actions) : null;
    const result = transaction ? commitEditorTransaction(transaction) : null;
    return applySelectionEditResult(result, options);
  }, [applySelectionEditResult, commitEditorTransaction]);

  const executeMutationAction = useCallback((
    action: (actions: MessageEditorActions) => MessageEditorEditTransaction<void>,
  ) => {
    const actions = actionsRef.current;
    if (!actions) {
      return false;
    }
    commitEditorTransaction(action(actions));
    return true;
  }, [commitEditorTransaction]);

  const executeInsertBlockAction = useCallback((
    action: (actions: MessageEditorActions) => MessageEditorEditTransaction<MessageEditorInsertBlockResult> | null,
  ) => {
    const actions = actionsRef.current;
    const transaction = actions ? action(actions) : null;
    const result = transaction ? commitEditorTransaction(transaction) : null;
    if (!result) {
      return null;
    }

    clearSelectionInteractionState();
    commitCommandFocusResult(result.focus);
    return result;
  }, [clearSelectionInteractionState, commitCommandFocusResult, commitEditorTransaction]);

  const commitBlockReorder = useCallback((reorder: MessageEditorDragState) => {
    const currentMessages = ensureMessageEditorMessages(messagesRef.current);
    const sourceIndex = currentMessages.findIndex(message => getMessageEditorBlockId(message) === reorder.draggedBlockId);
    const targetIndex = currentMessages.findIndex(message => getMessageEditorBlockId(message) === reorder.targetBlockId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return false;
    }

    let nextIndex = targetIndex + (reorder.position === "after" ? 1 : 0);
    if (sourceIndex < nextIndex) {
      nextIndex -= 1;
    }

    const didMove = executeMutationAction(actions => actions.reorderBlock(reorder.draggedBlockId, nextIndex));
    if (!didMove) {
      return false;
    }

    const draggedMessage = currentMessages[sourceIndex];
    const focus = draggedMessage && registry.isTextBlock(draggedMessage)
      ? (() => {
          const selection = resolveEditorSelection();
          const preferredOffset = selection && !selection.multiBlock && selection.focus.blockId === reorder.draggedBlockId
            ? selection.focus.offset
            : normalizeMessageEditorContent(draggedMessage.content).length;
          return {
            blockId: reorder.draggedBlockId,
            caret: preferredOffset,
          };
        })()
      : null;
    commitCommandFocusResult(focus, { clearWhenMissing: true });
    return true;
  }, [commitCommandFocusResult, executeMutationAction, registry, resolveEditorSelection]);

  const restoreHistoryEntry = useCallback((entry: MessageEditorHistoryEntry) => {
    commitDocumentSnapshot(entry.messages);
    if (entry.focus) {
      activateTextPoint({
        blockId: entry.focus.blockId,
        offset: entry.focus.caret,
      });
      return;
    }
    clearEditorInteractionState();
  }, [activateTextPoint, clearEditorInteractionState, commitDocumentSnapshot]);

  const performHistoryAction = useCallback((action: "redo" | "undo") => {
    const actions = actionsRef.current;
    const transaction = action === "undo" ? actions?.undo() : actions?.redo();
    if (!transaction) {
      return false;
    }

    restoreHistoryEntry(transaction.entry);
    return true;
  }, [restoreHistoryEntry]);

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

  const commitSelectionTextReplacement = useCallback((selection: MessageEditorSelection, replacement: string) => {
    executeSelectionEditAction(actions => actions.editSelection(selection, replacement));
  }, [executeSelectionEditAction]);

  const replaceDocumentSelectionTextAsBlocks = useCallback((selection: MessageEditorSelection, replacement: string) => {
    executeSelectionEditAction(actions => actions.pasteContent(selection, replacement));
  }, [executeSelectionEditAction]);

  const commitTextBlocksReplacement = useCallback((
    selection: MessageEditorSelection,
    replacement: string,
    interactionBlockId = selection.focus.blockId,
  ) => {
    commitTextInputInteraction(interactionBlockId);
    replaceDocumentSelectionTextAsBlocks(selection, replacement);
  }, [commitTextInputInteraction, replaceDocumentSelectionTextAsBlocks]);

  const requestImportTextPaste = useCallback((text: string, insertAsPlainText: () => void) => {
    if (!isRoomDocument || !onRequestImportTextPaste || !isMessageEditorImportablePasteText(text)) {
      return false;
    }
    onRequestImportTextPaste(text, insertAsPlainText);
    return true;
  }, [isRoomDocument, onRequestImportTextPaste]);

  const handleTextStyleInsert = useCallback((replacement: string, selectedText: string, options?: { transform?: (selectedPart: string) => string }) => {
    const selection = crossBlockSelection?.selection ?? resolveEditorSelection(true) ?? resolveEditorSelection(false);
    if (!selection || selection.collapsed) {
      return false;
    }

    return executeSelectionEditAction(
      actions => actions.applyTextStyle(selection, {
        replacement,
        selectedText,
        transform: options?.transform,
      }),
      { restoreExpandedSelection: true },
    );
  }, [crossBlockSelection, executeSelectionEditAction, resolveEditorSelection]);

  const registerBlockRef = useCallback((blockId: string, node: HTMLDivElement | null) => {
    if (node) {
      blockRefsRef.current.set(blockId, node);
      return;
    }
    blockRefsRef.current.delete(blockId);
  }, []);

  const registerEditorRootRef = useCallback((node: HTMLDivElement | null) => {
    editorRootRef.current = node;
    setEditorScrollRoot(previous => previous === node ? previous : node);
  }, []);

  const registerBlockShellRef = useCallback((blockId: string, node: HTMLDivElement | null) => {
    if (node) {
      blockShellRefsRef.current.set(blockId, node);
      return;
    }
    blockShellRefsRef.current.delete(blockId);
  }, []);

  const registerBlockSlotRef = useCallback((blockId: string, node: HTMLDivElement | null) => {
    if (node) {
      blockSlotRefsRef.current.set(blockId, node);
      return;
    }
    blockSlotRefsRef.current.delete(blockId);
  }, []);

  // ==== 命令菜单与文本输入 ====
  const speakerRoles = useMemo(() => resolveMessageEditorSpeakerRoles({
    roomAllRoles: roomContext.roomAllRoles,
    roomRolesThatUserOwn: roomContext.roomRolesThatUserOwn,
  }), [roomContext.roomAllRoles, roomContext.roomRolesThatUserOwn]);

  const activeTextMessage = useMemo(() => {
    if (!activeBlockId) {
      return null;
    }
    const message = messageByBlockId.get(activeBlockId);
    return message && registry.isTextBlock(message) ? message : null;
  }, [activeBlockId, messageByBlockId, registry]);

  const slashMenuState = useMemo(() => {
    if (!activeTextMessage) {
      return null;
    }

    return resolveMessageEditorSlashMenuState({
      activeBlockId,
      content: activeTextMessage.content,
      dismissedSlashKey,
      readOnly,
    });
  }, [activeBlockId, activeTextMessage, dismissedSlashKey, readOnly]);

  const speakerMenuState = useMemo<MessageEditorSpeakerMenuState | null>(() => {
    if (readOnly || !activeBlockId || !activeTextMessage) {
      return null;
    }

    const commandMatch = extractMessageEditorSpeakerCommandMatch(normalizeMessageEditorContent(activeTextMessage.content));
    if (!commandMatch) {
      return null;
    }

    if (slashMenuState) {
      return null;
    }

    const query = commandMatch.command.query.trim();
    const { roleQuery } = splitMessageEditorSpeakerCommandQuery(query);
    const commandKey = `${activeBlockId}:${commandMatch.command.prefix}:${query.toLowerCase()}`;
    if (dismissedSpeakerKey === commandKey) {
      return null;
    }

    const items = buildMessageEditorSpeakerMenuItems({
      hasSelectedSpeaker: hasMessageEditorSpeaker(activeTextMessage),
      query: roleQuery,
      roles: speakerRoles,
      selectedRoleId: typeof activeTextMessage.roleId === "number" ? activeTextMessage.roleId : undefined,
    });
    if (items.length === 0) {
      return null;
    }

    return {
      blockId: activeBlockId,
      commandKey,
      items,
      prefix: commandMatch.command.prefix,
      query,
      remainder: commandMatch.remainder,
    };
  }, [activeBlockId, activeTextMessage, dismissedSpeakerKey, readOnly, slashMenuState, speakerRoles]);

  const speakerAvatarRoleId = speakerAvatarMenuState?.roleId ?? 0;
  const speakerAvatarRoleAvatarsQuery = useGetRoleAvatarsQuery(speakerAvatarRoleId, {
    enabled: Boolean(
      speakerAvatarMenuState?.roleId
      && speakerAvatarMenuState.roleId > 0
      && !speakerAvatarMenuState.clearSpeaker,
    ),
  });
  const speakerAvatarMenuItems = useMemo(() => {
    if (!speakerAvatarMenuState) {
      return [];
    }

    if (speakerAvatarMenuState.clearSpeaker) {
      return buildMessageEditorSpeakerAvatarClearMenuItems({
        roleId: speakerAvatarMenuState.roleId,
        selected: !hasMessageEditorSpeaker(activeTextMessage ?? {}),
      });
    }

    const avatars = speakerAvatarRoleAvatarsQuery.data?.data ?? [];
    if (speakerAvatarRoleAvatarsQuery.isLoading && avatars.length === 0) {
      return [];
    }

    return buildMessageEditorSpeakerAvatarMenuItems({
      avatars,
      query: speakerAvatarSearchQuery,
      roleId: speakerAvatarMenuState.roleId,
      selectedAvatarId: typeof activeTextMessage?.avatarId === "number" ? activeTextMessage.avatarId : undefined,
    });
  }, [
    activeTextMessage,
    speakerAvatarMenuState,
    speakerAvatarRoleAvatarsQuery.data,
    speakerAvatarRoleAvatarsQuery.isLoading,
    speakerAvatarSearchQuery,
  ]);

  const activeSlashSelectionIndex = slashMenuState
    ? Math.max(0, Math.min(slashSelectionIndex, slashMenuState.items.length - 1))
    : 0;

  const activeSpeakerSelectionIndex = speakerMenuState
    ? Math.max(0, Math.min(speakerSelectionIndex, speakerMenuState.items.length - 1))
    : 0;

  const activeSpeakerAvatarSelectionIndex = speakerAvatarMenuState
    ? Math.max(0, Math.min(speakerAvatarSelectionIndex, speakerAvatarMenuItems.length - 1))
    : 0;

  useEffect(() => {
    resetSpeakerCommandSelection();
  }, [resetSpeakerCommandSelection, speakerMenuState?.commandKey]);

  useEffect(() => {
    if (!speakerAvatarMenuState) {
      return;
    }

    resetSpeakerAvatarCommandSelection();
  }, [resetSpeakerAvatarCommandSelection, speakerAvatarMenuState?.commandKey, speakerAvatarMenuState]);

  const commitSlashCommandSelection = useCallback((state: MessageEditorSlashMenuState, kind: MessageEditorInsertableBlockKind) => {
    resetSlashCommandMenu();
    executeFocusAction(actions => actions.insertBlock(state.blockId, kind), {
      clearWhenMissing: true,
      hideToolbar: true,
    });
  }, [executeFocusAction, resetSlashCommandMenu]);

  const handleSelectSlashItem = useCallback((kind: MessageEditorInsertableBlockKind) => {
    if (!slashMenuState) {
      return;
    }

    commitSlashCommandSelection(slashMenuState, kind);
  }, [commitSlashCommandSelection, slashMenuState]);

  const commitSpeakerRoleCommandSelection = useCallback((state: MessageEditorSpeakerMenuState, item: MessageEditorSpeakerMenuItem) => {
    const blockId = state.blockId;
    const nextContent = state.remainder;
    if (item.kind === "clear") {
      const didUpdate = executeMutationAction(actions => actions.assignSpeaker({
        blockId,
        content: nextContent,
      }));
      if (!didUpdate) {
        return;
      }
      openSpeakerAvatarMenu({
        blockId,
        clearSpeaker: true,
        commandKey: `${state.commandKey}:avatar:clear`,
        remainder: nextContent,
        roleId: 0,
        roleLabel: "无",
      }, "");
    }
    else {
      const didUpdate = executeMutationAction(actions => actions.assignSpeaker({
        avatarId: item.avatarId,
        blockId,
        content: nextContent,
        roleId: item.roleId,
      }));
      if (!didUpdate) {
        return;
      }
      const { avatarQuery } = splitMessageEditorSpeakerCommandQuery(state.query);
      openSpeakerAvatarMenu({
        blockId,
        commandKey: `${state.commandKey}:avatar:${item.roleId}`,
        remainder: nextContent,
        roleId: item.roleId,
        roleLabel: item.label,
      }, avatarQuery);
    }
    commitSpeakerCommandResult(blockId, nextContent);
  }, [commitSpeakerCommandResult, executeMutationAction, openSpeakerAvatarMenu]);

  const handleSelectSpeakerItem = useCallback((item: MessageEditorSpeakerMenuItem) => {
    if (!speakerMenuState) {
      return;
    }

    commitSpeakerRoleCommandSelection(speakerMenuState, item);
  }, [commitSpeakerRoleCommandSelection, speakerMenuState]);

  const commitSpeakerAvatarCommandSelection = useCallback((state: MessageEditorSpeakerAvatarMenuState, item: MessageEditorSpeakerAvatarMenuItem) => {
    const blockId = state.blockId;
    const currentMessage = messagesRef.current.find(message => getMessageEditorBlockId(message) === blockId);
    const didUpdate = executeMutationAction(actions => actions.selectSpeakerAvatar({
      avatarId: item.kind === "avatar" ? item.avatarId : undefined,
      blockId,
      clearSpeaker: Boolean(state.clearSpeaker),
      content: state.remainder,
      roleId: state.roleId,
    }));
    if (!didUpdate) {
      return;
    }
    clearSpeakerAvatarMenu();
    commitCommandFocusResult({
      blockId,
      caret: normalizeMessageEditorContent(currentMessage?.content ?? state.remainder).length,
    });
  }, [clearSpeakerAvatarMenu, commitCommandFocusResult, executeMutationAction]);

  const handleSelectSpeakerAvatarItem = useCallback((item: MessageEditorSpeakerAvatarMenuItem) => {
    if (!speakerAvatarMenuState) {
      return;
    }

    commitSpeakerAvatarCommandSelection(speakerAvatarMenuState, item);
  }, [commitSpeakerAvatarCommandSelection, speakerAvatarMenuState]);

  const handleTextInput = useCallback((blockId: string, nextContent: string) => {
    commitTextInputInteraction(blockId);
    executeMutationAction(actions => actions.inputText(blockId, nextContent));
  }, [commitTextInputInteraction, executeMutationAction]);

  const handleTextBlur = useCallback(() => {
    window.setTimeout(() => {
      if (pointerSelectionSessionRef.current) {
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
      clearEditorInteractionState();
    }, 0);
  }, [clearEditorInteractionState]);

  // ==== Pointer 选区与键盘导航 ====
  const resolveTextSelectionPointFromClientPosition = useCallback((clientX: number, clientY: number, preferredBlockId?: string): MessageEditorSelectionPoint | null => {
    const root = editorRootRef.current;
    if (!root) {
      return null;
    }

    return resolveMessageEditorTextPointFromClientPosition({
      blockRefs: blockRefsRef.current,
      blockShellRefs: blockShellRefsRef.current,
      blockSlotRefs: blockSlotRefsRef.current,
      clientX,
      clientY,
      messageByBlockId,
      messages: messagesRef.current,
      preferredBlockId,
      registry,
      root,
    });
  }, [messageByBlockId, registry]);

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
    pointerSelectionSessionRef.current?.dispose();
    clearSelectionInteractionState();
    setIsPointerSelecting(true);

    const session = new MessageEditorPointerSelectionSession({
      events: {
        onCancel() {
          clearCrossBlockSelection();
        },
        onClick: activateCaret,
        onCommit(state) {
          commitCrossBlockSelection(state.selection, state.position);
        },
        onFinish() {
          if (pointerSelectionSessionRef.current === session) {
            pointerSelectionSessionRef.current = null;
          }
          setIsPointerSelecting(false);
        },
        onPreview(state) {
          commitCrossBlockSelectionPreview(state?.selection ?? null);
        },
      },
      resolveSelectionState(clientX, clientY) {
        const resolvedFocus = resolveTextSelectionPointFromClientPosition(clientX, clientY);
        if (!resolvedFocus) {
          return undefined;
        }

        const selection = createMessageEditorSelectionFromDocument(selectionDocument, registry, anchor, resolvedFocus);
        if (!selection || selection.collapsed) {
          return null;
        }

        const focusBlock = blockRefsRef.current.get(selection.focus.blockId)
          ?? blockShellRefsRef.current.get(selection.focus.blockId);
        if (!focusBlock) {
          return undefined;
        }

        const bounds = focusBlock.getBoundingClientRect();
        return {
          position: {
            x: Math.max(bounds.left, Math.min(clientX, bounds.right)),
            y: bounds.top,
          },
          selection,
        };
      },
      root,
      startPosition: {
        x: event.clientX,
        y: event.clientY,
      },
    });
    pointerSelectionSessionRef.current = session;
    session.start();
  }, [clearCrossBlockSelection, clearSelectionInteractionState, commitCrossBlockSelection, readOnly, registry, resolveTextSelectionPointFromClientPosition, selectionDocument]);

  const handleTextMouseDown = useCallback((blockId: string, event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = resolveTextSelectionPointFromClientPosition(event.clientX, event.clientY, blockId);
    const message = messageByBlockId.get(blockId);
    const focusClickPoint = () => {
      activateTextPoint(resolveMessageEditorTextClickFocusPoint(blockId, anchor));
    };
    if (!anchor) {
      if (!readOnly && event.button === 0) {
        event.preventDefault();
        focusClickPoint();
      }
      return;
    }

    startTextPointerSelection(anchor, event, () => {
      focusClickPoint();
    });
    focusEmptyTextBlockBeforeIme({
      active: activeBlockId === blockId,
      content: message?.content ?? "",
      mouseButton: event.button,
      readOnly,
    }, {
      activate: focusClickPoint,
      focusActiveEditor: () => {
        textStyleInputRef.current?.focus({ moveCursorToEnd: false });
      },
    });
  }, [activateTextPoint, activeBlockId, messageByBlockId, readOnly, resolveTextSelectionPointFromClientPosition, startTextPointerSelection]);

  const handleAtomicBlockMouseDown = useCallback((blockId: string, event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || event.button !== 0 || !shouldStartMessageEditorAtomicBlockSelection(event.target)) {
      return;
    }

    const anchor = resolveTextSelectionPointFromClientPosition(event.clientX, event.clientY, blockId);
    if (!anchor) {
      return;
    }

    startTextPointerSelection(anchor, event, () => {
      activateTextPoint(anchor);
    });
  }, [
    activateTextPoint,
    readOnly,
    resolveTextSelectionPointFromClientPosition,
    startTextPointerSelection,
  ]);

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
      || target.closest("[data-me-speaker-menu]")
      || target.closest("[data-me-speaker-avatar-menu]")
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
        activateTextPoint(anchor);
        return;
      }
      executeFocusAction(actions => actions.appendParagraph());
    });
  }, [
    activateTextPoint,
    executeFocusAction,
    readOnly,
    resolveTextSelectionPointFromClientPosition,
    startTextPointerSelection,
  ]);

  useEffect(() => {
    return () => {
      pointerSelectionSessionRef.current?.dispose();
      pointerSelectionSessionRef.current = null;
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
        if (pointerSelectionSessionRef.current || isPointerSelecting || crossBlockSelection) {
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

        commitCrossBlockSelection(resolvedSelection, {
          x: rect.left + rect.width / 2,
          y: rect.top,
        }, { hideToolbar: false });
      }, 0);
    };

    document.addEventListener("mouseup", handleDocumentMouseUp);
    return () => {
      if (mouseUpTimer != null) {
        window.clearTimeout(mouseUpTimer);
      }
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [commitCrossBlockSelection, crossBlockSelection, isPointerSelecting, readOnly, registry]);

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
      if ((event.metaKey || event.ctrlKey) && key === "a") {
        const documentSelection = createMessageEditorDocumentSelectionFromDocument(selectionDocument, registry);
        if (documentSelection && !documentSelection.collapsed) {
          event.preventDefault();
          activateBlockSelection(documentSelection);
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "c") {
        event.preventDefault();
        copySelectionTextToClipboard(selection);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "x") {
        event.preventDefault();
        copySelectionTextToClipboard(selection);
        commitSelectionTextReplacement(selection, "");
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearCrossBlockSelection();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        commitSelectionTextReplacement(selection, "");
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        if (!event.shiftKey) {
          commitSelectionBoundaryCollapse(selection, direction);
          return;
        }

        const nextFocus = moveMessageEditorDocumentPointByCharacter(messagesRef.current, registry, selection.focus, direction);
        commitSelectionFocusExtension(selection.anchor, nextFocus);
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        const direction = event.key === "ArrowUp" ? -1 : 1;
        if (!event.shiftKey) {
          commitSelectionBoundaryCollapse(selection, direction);
          return;
        }

        const nextFocus = getAdjacentMessageEditorDocumentBlockPoint(messagesRef.current, registry, selection.focus, direction, selection.focus.offset);
        commitSelectionFocusExtension(selection.anchor, nextFocus);
        return;
      }

      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        commitSelectionTextReplacement(selection, event.key);
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
    activateTextPoint,
    handleUndoRedoShortcut,
    readOnly,
    registry,
    commitSelectionTextReplacement,
    activateBlockSelection,
  ]);

  useEffect(() => {
    if (readOnly || !crossBlockSelection) {
      return;
    }

    const handleDocumentPaste = (event: ClipboardEvent) => {
      if (shouldIgnoreDocumentSelectionEventTarget(event.target)) {
        return;
      }

      if (getMessageEditorClipboardFiles(event.clipboardData).length > 0) {
        return;
      }

      const text = event.clipboardData?.getData("text/plain");
      if (!text) {
        return;
      }

      event.preventDefault();
      const normalizedText = normalizeEditableText(text);
      if (requestImportTextPaste(normalizedText, () => {
        commitTextBlocksReplacement(crossBlockSelection.selection, normalizedText);
      })) {
        return;
      }
      commitTextBlocksReplacement(crossBlockSelection.selection, normalizedText);
    };

    document.addEventListener("paste", handleDocumentPaste);
    return () => {
      document.removeEventListener("paste", handleDocumentPaste);
    };
  }, [commitTextBlocksReplacement, crossBlockSelection, readOnly, requestImportTextPaste]);

  const handleTextKeyDown = useCallback((blockId: string, event: React.KeyboardEvent<HTMLDivElement>) => {
    const root = editorRootRef.current;
    const selection = window.getSelection();
    const blockElement = blockRefsRef.current.get(blockId);
    if (!root || !selection || selection.rangeCount === 0 || !blockElement) {
      return;
    }

    const range = selection.getRangeAt(0);
    const editorSelection = resolveMessageEditorSelectionFromNative(root, messagesRef.current, registry, selection);
    if (!editorSelection) {
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      const documentSelection = createMessageEditorDocumentSelectionFromDocument(selectionDocument, registry);
      if (documentSelection && !documentSelection.collapsed) {
        event.preventDefault();
        activateBlockSelection(documentSelection);
      }
      return;
    }

    if (slashMenuState?.blockId === blockId) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSlashCommandSelection(1, slashMenuState.items.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSlashCommandSelection(-1, slashMenuState.items.length);
        return;
      }

      if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        const activeItem = slashMenuState.items[activeSlashSelectionIndex] ?? slashMenuState.items[0];
        if (activeItem) {
          handleSelectSlashItem(activeItem.kind);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        dismissSlashCommandMenu(slashMenuState.slashKey);
        return;
      }
    }

    if (speakerAvatarMenuState?.blockId === blockId) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSpeakerAvatarCommandSelection(1, speakerAvatarMenuItems.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSpeakerAvatarCommandSelection(-1, speakerAvatarMenuItems.length);
        return;
      }

      if (!event.nativeEvent.isComposing && isMessageEditorSpeakerMenuCommitKey(event)) {
        event.preventDefault();
        const activeItem = speakerAvatarMenuItems[activeSpeakerAvatarSelectionIndex] ?? speakerAvatarMenuItems[0];
        if (activeItem) {
          handleSelectSpeakerAvatarItem(activeItem);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearSpeakerAvatarMenu();
        return;
      }

      if (event.key === "Backspace" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        deleteSpeakerAvatarSearchCharacter();
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key.length === 1) {
        event.preventDefault();
        appendSpeakerAvatarSearchCharacter(event.key);
        return;
      }

      event.preventDefault();
      return;
    }

    if (speakerMenuState?.blockId === blockId) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSpeakerCommandSelection(1, speakerMenuState.items.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSpeakerCommandSelection(-1, speakerMenuState.items.length);
        return;
      }

      if (!event.nativeEvent.isComposing && isMessageEditorSpeakerMenuCommitKey(event)) {
        event.preventDefault();
        const activeItem = speakerMenuState.items[activeSpeakerSelectionIndex] ?? speakerMenuState.items[0];
        if (activeItem) {
          handleSelectSpeakerItem(activeItem);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        dismissSpeakerCommandMenu(speakerMenuState.commandKey);
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
          const nextFocus = moveMessageEditorDocumentPointByCharacter(messagesRef.current, registry, editorSelection.focus, direction);
          if (nextFocus) {
            event.preventDefault();
          }
          commitSelectionFocusExtension(editorSelection.anchor, nextFocus);
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
            activateTextPoint(adjacentPoint);
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
        const nextFocus = getAdjacentMessageEditorDocumentBlockPoint(messagesRef.current, registry, editorSelection.focus, direction, editorSelection.focus.offset);
        if (nextFocus) {
          event.preventDefault();
        }
        commitSelectionFocusExtension(editorSelection.anchor, nextFocus);
      }
      return;
    }

    if (event.key === "ArrowUp" && editorSelection.collapsed && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const shouldMove = !contentIsMultiline || isSelectionAtStart(range, blockElement);
      if (shouldMove) {
        event.preventDefault();
        const adjacentPoint = getAdjacentMessageEditorDocumentBlockPoint(
          messagesRef.current,
          registry,
          editorSelection.focus,
          -1,
          Number.MAX_SAFE_INTEGER,
        );
        if (adjacentPoint) {
          activateTextPoint(adjacentPoint);
        }
      }
      return;
    }

    if (event.key === "ArrowDown" && editorSelection.collapsed && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const shouldMove = !contentIsMultiline || isSelectionAtEnd(range, blockElement);
      if (shouldMove) {
        event.preventDefault();
        const adjacentPoint = getAdjacentMessageEditorDocumentBlockPoint(
          messagesRef.current,
          registry,
          editorSelection.focus,
          1,
          Number.MAX_SAFE_INTEGER,
        );
        if (adjacentPoint) {
          activateTextPoint(adjacentPoint);
        }
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      executeFocusAction(actions => actions.createParagraph(editorSelection));
      return;
    }

    if (event.key === "Backspace" && editorSelection.collapsed && isSelectionAtStart(range, blockElement)) {
      event.preventDefault();
      executeFocusAction(actions => actions.joinPreviousParagraph(blockId));
      return;
    }

    if (event.key === "Delete" && editorSelection.collapsed && isSelectionAtEnd(range, blockElement)) {
      event.preventDefault();
      executeFocusAction(actions => actions.joinNextParagraph(blockId));
    }
  }, [
    activeSlashSelectionIndex,
    activeSpeakerSelectionIndex,
    activeSpeakerAvatarSelectionIndex,
    appendSpeakerAvatarSearchCharacter,
    activateTextPoint,
    deleteSpeakerAvatarSearchCharacter,
    dismissSlashCommandMenu,
    dismissSpeakerCommandMenu,
    clearSpeakerAvatarMenu,
    executeFocusAction,
    handleSelectSlashItem,
    handleSelectSpeakerItem,
    handleSelectSpeakerAvatarItem,
    moveSlashCommandSelection,
    moveSpeakerCommandSelection,
    moveSpeakerAvatarCommandSelection,
    registry,
    activateBlockSelection,
    slashMenuState,
    speakerAvatarMenuItems,
    speakerAvatarMenuState,
    speakerMenuState,
  ]);

  const handleAtomicBlockKeyDown = useCallback((blockId: string, event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!shouldHandleMessageEditorAtomicBlockKeyDown({
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      defaultPrevented: event.defaultPrevented,
      key: event.key,
      metaKey: event.metaKey,
      readOnly,
    })) {
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      executeFocusAction(actions => actions.deleteBlock(blockId), {
        clearWhenMissing: true,
        hideToolbar: true,
      });
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowUp" ? -1 : 1;
    const adjacentPoint = getAdjacentMessageEditorDocumentBlockPoint(
      messagesRef.current,
      registry,
      { blockId, offset: direction < 0 ? 0 : 1 },
      direction,
      Number.MAX_SAFE_INTEGER,
    );
    activateTextPoint(adjacentPoint);
  }, [activateTextPoint, executeFocusAction, messagesRef, readOnly, registry]);

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
      clearEditorInteractionState();
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [clearEditorInteractionState, readOnly]);

  // ==== 拖拽、媒体上传与粘贴处理 ====
  const resolveDragTarget = useCallback((clientY: number, eventTarget: EventTarget | null): MessageEditorResolvedDragTarget | null => {
    const root = editorRootRef.current;
    if (!root) {
      return null;
    }

    const directBlockId = resolveMessageEditorBlockIdFromNode(root, eventTarget instanceof Node ? eventTarget : null);
    if (directBlockId) {
      const directNode = blockShellRefsRef.current.get(directBlockId)
        ?? blockSlotRefsRef.current.get(directBlockId);
      if (directNode) {
        return resolveMessageEditorDropTarget(directBlockId, directNode.getBoundingClientRect(), clientY);
      }
    }

    return resolveMessageEditorVisibleDropTarget(
      [...blockSlotRefsRef.current].map(([blockId, node]) => ({
        blockId,
        rect: node.getBoundingClientRect(),
      })),
      clientY,
    );
  }, []);

  const commitResolvedDragTarget = useCallback((nextTarget: MessageEditorResolvedDragTarget | null) => {
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
  }, []);

  const disposeBlockDragSession = useCallback(() => {
    blockDragSessionRef.current?.dispose();
    blockDragSessionRef.current = null;
  }, []);

  const updateBlockDragAutoScroll = useCallback((clientX: number, clientY: number) => {
    blockDragSessionRef.current?.updatePointer(clientX, clientY);
  }, []);

  useEffect(() => disposeBlockDragSession, [disposeBlockDragSession]);

  const handleBlockDragStart = useCallback((blockId: string, event: React.DragEvent<HTMLButtonElement>) => {
    clearSpeakerAvatarMenu();
    disposeBlockDragSession();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
    const root = editorRootRef.current;
    if (root) {
      let session: MessageEditorBlockDragSession;
      session = new MessageEditorBlockDragSession({
        edgeSize: 80,
        maxDelta: 18,
        onAutoScroll(position, eventTarget) {
          commitResolvedDragTarget(resolveDragTarget(position.y, eventTarget));
        },
        onFinish() {
          if (blockDragSessionRef.current === session) {
            blockDragSessionRef.current = null;
          }
          setDragState(null);
        },
        root,
        scrollBy(top) {
          virtualizedBlockListRef.current?.scrollBy(top);
        },
      });
      blockDragSessionRef.current = session;
      session.start();
    }
    setDragState({
      draggedBlockId: blockId,
      targetBlockId: blockId,
      position: "after",
    });
  }, [clearSpeakerAvatarMenu, commitResolvedDragTarget, disposeBlockDragSession, resolveDragTarget]);

  const handleBlockDragEnd = useCallback(() => {
    disposeBlockDragSession();
    setDragState(null);
  }, [disposeBlockDragSession]);

  const renderBlockSpeakerHandle = useCallback((blockId: string, message: MessageEditorMessage, topClassName: string) => {
    const className = [
      MESSAGE_EDITOR_SPEAKER_HANDLE_CLASS,
      topClassName,
      dragState?.draggedBlockId === blockId ? "opacity-80" : "",
    ].join(" ");
    const style = { right: "calc(100% - 1.5rem)" };

    if (readOnly) {
      return (
        <div
          className={`
            ${className}
            cursor-default
          `}
          style={style}
        >
          <MessageEditorSpeakerHeader message={message} />
        </div>
      );
    }

    return (
      <button
        type="button"
        draggable
        data-me-block-handle="true"
        className={className}
        style={style}
        onDragStart={event => handleBlockDragStart(blockId, event)}
        onDragEnd={handleBlockDragEnd}
        aria-label="拖拽排序"
        title="拖拽排序"
      >
        <MessageEditorSpeakerHeader message={message} />
      </button>
    );
  }, [dragState?.draggedBlockId, handleBlockDragEnd, handleBlockDragStart, readOnly]);

  const uploadMediaFileForKind = useCallback(async (kind: MessageEditorInsertableBlockKind, file: File) => {
    if (kind === "image") {
      const [uploadedImage, dimensions] = await Promise.all([
        uploadUtils.uploadDualImage(file),
        readImageDimensions(file),
      ]);
      return {
        fileId: uploadedImage.fileId,
        fileName: file.name,
        mediaType: uploadedImage.mediaType,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
      };
    }

    if (kind === "file") {
      const uploadedFile = await uploadUtils.uploadFileAsset(file);
      return {
        fileId: uploadedFile.fileId,
        fileName: file.name,
        mediaType: uploadedFile.mediaType,
        size: file.size,
      };
    }

    if (kind === "audio") {
      const [uploadedAudio, second] = await Promise.all([
        uploadUtils.uploadAudioAsset(file),
        readMediaDuration(file),
      ]);
      if (second == null) {
        throw new Error("无法读取音频时长，请换用可识别的音频文件后重试。");
      }
      return {
        fileId: uploadedAudio.fileId,
        fileName: file.name,
        mediaType: uploadedAudio.mediaType,
        size: file.size,
        second,
      };
    }

    if (kind === "video") {
      const [uploadedVideo, dimensions, second] = await Promise.all([
        uploadUtils.uploadVideo(file),
        readVideoDimensions(file),
        readMediaDuration(file),
      ]);
      return {
        fileId: uploadedVideo.fileId,
        fileName: file.name,
        mediaType: uploadedVideo.mediaType,
        size: file.size,
        second,
        width: dimensions.width,
        height: dimensions.height,
      };
    }

    throw new Error("不支持该媒体类型");
  }, [uploadUtils]);

  const uploadMediaForBlock = useCallback(async (
    blockId: string,
    kind: MessageEditorInsertableBlockKind,
    file: File,
  ) => {
    const requestId = ++pendingMediaUploadRequestIdRef.current;
    const pendingUpload = { file, requestId } satisfies PendingMessageEditorMediaUpload;
    pendingMediaUploadsRef.current.set(blockId, pendingUpload);
    setPendingMediaUploads(current => new Map(current).set(blockId, pendingUpload));

    try {
      const payload = await uploadMediaFileForKind(kind, file);
      if (pendingMediaUploadsRef.current.get(blockId)?.requestId !== requestId) {
        return;
      }

      executeMutationAction(actions => actions.replaceMedia(blockId, payload));
      pendingMediaUploadsRef.current.delete(blockId);
      setPendingMediaUploads(current => {
        if (!current.has(blockId)) {
          return current;
        }
        const next = new Map(current);
        next.delete(blockId);
        return next;
      });
    } catch (error) {
      if (pendingMediaUploadsRef.current.get(blockId)?.requestId !== requestId) {
        return;
      }

      const errorMessage = (error instanceof Error ? error.message : String(error)) || "媒体上传失败";
      const failedUpload = { ...pendingUpload, error: errorMessage } satisfies PendingMessageEditorMediaUpload;
      pendingMediaUploadsRef.current.set(blockId, failedUpload);
      setPendingMediaUploads(current => new Map(current).set(blockId, failedUpload));
      appToast.error(errorMessage);
    }
  }, [executeMutationAction, uploadMediaFileForKind]);

  const handleDeleteAtomicBlock = useCallback((blockId: string) => {
    pendingMediaUploadsRef.current.delete(blockId);
    setPendingMediaUploads(current => {
      if (!current.has(blockId)) {
        return current;
      }
      const next = new Map(current);
      next.delete(blockId);
      return next;
    });
    executeFocusAction(actions => actions.deleteBlock(blockId), {
      clearWhenMissing: true,
      hideToolbar: true,
    });
  }, [executeFocusAction]);

  const handleUploadAtomicBlock = useCallback(async (blockId: string, file: File) => {
    const currentMessage = messagesRef.current.find(message => getMessageEditorBlockId(message) === blockId);
    const kind = getMessageEditorMediaBlockKindForMessage(currentMessage);
    if (!kind) {
      return;
    }

    await uploadMediaForBlock(blockId, kind, file);
  }, [messagesRef, uploadMediaForBlock]);

  const handleResizeAtomicBlock = useCallback((blockId: string, size: { height: number; width: number }) => {
    executeMutationAction(actions => actions.resizeMedia(blockId, size));
  }, [executeMutationAction]);

  const insertMediaFileAtSelection = useCallback((
    file: File,
    selection: MessageEditorSelection,
    options: { createTrailingTextBlock?: boolean } = {},
  ) => {
    const kind = getMessageEditorMediaBlockKindForFile(file);
    const result = executeInsertBlockAction(actions => actions.insertMedia(selection, kind, options));
    if (!result) {
      return;
    }

    void uploadMediaForBlock(result.insertedBlockId, kind, file);
  }, [executeInsertBlockAction, uploadMediaForBlock]);

  const insertMediaFileAtPoint = useCallback((file: File, point: MessageEditorSelectionPoint) => {
    const selection = createMessageEditorSelectionFromDocument(selectionDocument, registry, point, point);
    if (!selection) {
      return;
    }

    insertMediaFileAtSelection(file, selection, { createTrailingTextBlock: false });
  }, [insertMediaFileAtSelection, registry, selectionDocument]);

  const resolveTextInsertionSelection = useCallback((fallbackBlockId: string) => {
    const currentSelection = resolveEditorSelection(true) ?? resolveEditorSelection(false);
    if (currentSelection) {
      return currentSelection;
    }

    const message = messageByBlockId.get(fallbackBlockId);
    const offset = normalizeMessageEditorContent(message?.content).length;
    return createMessageEditorSelectionFromDocument(selectionDocument, registry, {
      blockId: fallbackBlockId,
      offset,
    }, {
      blockId: fallbackBlockId,
      offset,
    });
  }, [messageByBlockId, registry, resolveEditorSelection, selectionDocument]);

  const handleTextPasteFiles = useCallback((blockId: string, files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }

    const selection = resolveTextInsertionSelection(blockId);
    if (selection) {
      insertMediaFileAtSelection(file, selection);
    }
  }, [insertMediaFileAtSelection, resolveTextInsertionSelection]);

  const handleTextPasteText = useCallback((blockId: string, text: string, insertPlainText: () => void) => {
    const normalizedText = normalizeEditableText(text);
    if (requestImportTextPaste(normalizedText, insertPlainText)) {
      return true;
    }
    if (!normalizedText.includes("\n")) {
      return false;
    }

    const selection = resolveTextInsertionSelection(blockId);
    if (selection) {
      commitTextBlocksReplacement(selection, normalizedText, blockId);
      return true;
    }
    return false;
  }, [commitTextBlocksReplacement, requestImportTextPaste, resolveTextInsertionSelection]);

  const handleBlockDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (isMessageEditorFileDrag(event.dataTransfer)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = readOnly ? "none" : "copy";
      if (readOnly) {
        setFileDropTarget(null);
        return;
      }
      const nextTarget = resolveDragTarget(event.clientY, event.target);
      setFileDropTarget((previous) => {
        return previous?.targetBlockId === nextTarget?.targetBlockId && previous?.position === nextTarget?.position
          ? previous
          : nextTarget;
      });
      return;
    }

    setFileDropTarget(null);
    if (!dragState) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    updateBlockDragAutoScroll(event.clientX, event.clientY);
    const nextTarget = resolveDragTarget(event.clientY, event.target);
    commitResolvedDragTarget(nextTarget);
  }, [commitResolvedDragTarget, dragState, readOnly, resolveDragTarget, updateBlockDragAutoScroll]);

  const handleEditorFileDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!fileDropTarget) {
      return;
    }

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    setFileDropTarget(null);
  }, [fileDropTarget]);

  const handleBlockDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    disposeBlockDragSession();
    if (isMessageEditorFileDrag(event.dataTransfer)) {
      event.preventDefault();
      setFileDropTarget(null);
      if (readOnly) {
        return;
      }
      const file = event.dataTransfer.files?.[0];
      if (!file) {
        return;
      }

      const resolvedTarget = resolveDragTarget(event.clientY, event.target) ?? fileDropTarget;
      const point = resolveMessageEditorFileDropPoint(resolvedTarget, messagesRef.current);
      if (point) {
        insertMediaFileAtPoint(file, point);
      }
      return;
    }

    if (!dragState) {
      return;
    }

    event.preventDefault();
    commitBlockReorder(dragState);
    setDragState(null);
  }, [commitBlockReorder, disposeBlockDragSession, dragState, fileDropTarget, insertMediaFileAtPoint, readOnly, resolveDragTarget]);

  const resolveFilePasteTargetBlockId = useCallback(() => {
    const currentMessages = messagesRef.current;
    if (crossBlockSelection?.selection) {
      const selectedSegment = crossBlockSelection.selection.segments.length === 1
        ? crossBlockSelection.selection.segments[0]
        : null;
      const selectedMessage = selectedSegment
        ? currentMessages.find(message => getMessageEditorBlockId(message) === selectedSegment.blockId)
        : null;
      if (
        selectedSegment
        && selectedSegment.start === 0
        && selectedSegment.end > selectedSegment.start
        && isMessageEditorUploadableMediaMessage(selectedMessage ?? undefined)
      ) {
        return selectedSegment.blockId;
      }
    }

    if (!activeBlockId) {
      return null;
    }

    const activeMessage = currentMessages.find(message => getMessageEditorBlockId(message) === activeBlockId);
    return isMessageEditorUploadableMediaMessage(activeMessage ?? undefined) ? activeBlockId : null;
  }, [activeBlockId, crossBlockSelection]);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    const handleDocumentFilePaste = (event: ClipboardEvent) => {
      if (shouldIgnoreDocumentSelectionEventTarget(event.target)) {
        return;
      }

      const files = getMessageEditorClipboardFiles(event.clipboardData);
      if (files.length === 0) {
        return;
      }

      const targetBlockId = resolveFilePasteTargetBlockId();
      if (targetBlockId) {
        event.preventDefault();
        activateBlock(targetBlockId);
        void handleUploadAtomicBlock(targetBlockId, files[0]);
        return;
      }

      const selection = crossBlockSelection?.selection ?? resolveEditorSelection(true) ?? resolveEditorSelection(false);
      if (!selection) {
        return;
      }

      event.preventDefault();
      insertMediaFileAtSelection(files[0], selection);
    };

    document.addEventListener("paste", handleDocumentFilePaste);
    return () => {
      document.removeEventListener("paste", handleDocumentFilePaste);
    };
  }, [
    activateBlock,
    crossBlockSelection,
    handleUploadAtomicBlock,
    insertMediaFileAtSelection,
    readOnly,
    resolveEditorSelection,
    resolveFilePasteTargetBlockId,
  ]);

  // ==== Render 派生状态 ====
  const onAtomicBlockMouseDown = useMessageEditorEventCallback(handleAtomicBlockMouseDown);
  const onAtomicBlockKeyDown = useMessageEditorEventCallback(handleAtomicBlockKeyDown);
  const onDeleteAtomicBlock = useMessageEditorEventCallback(handleDeleteAtomicBlock);
  const onResizeAtomicBlock = useMessageEditorEventCallback(handleResizeAtomicBlock);
  const onTextBlur = useMessageEditorEventCallback(handleTextBlur);
  const onTextInput = useMessageEditorEventCallback(handleTextInput);
  const onTextKeyDown = useMessageEditorEventCallback(handleTextKeyDown);
  const onTextMouseDown = useMessageEditorEventCallback(handleTextMouseDown);
  const onTextPasteFiles = useMessageEditorEventCallback(handleTextPasteFiles);
  const onTextPasteText = useMessageEditorEventCallback(handleTextPasteText);
  const onUploadAtomicBlock = useMessageEditorEventCallback(handleUploadAtomicBlock);
  const renderSpeakerHandle = useMessageEditorEventCallback(renderBlockSpeakerHandle);
  const onFocusTextBlock = useCallback((blockId: string) => {
    activateBlock(blockId, { clearDismissedSlash: true });
  }, [activateBlock]);
  const onFocusAtomicBlock = useCallback((blockId: string) => {
    activateBlock(blockId);
  }, [activateBlock]);

  const atomicMessageCacheRef = useRef(new WeakMap<MessageEditorMessage, {
    blockId: string;
    driver: ReturnType<typeof registry.resolve>;
    estimatedHeight: number;
    message: MessageEditorMessage;
  }>());
  const atomicMessages = useMemo(() => {
    return messages.map((message) => {
      const cached = atomicMessageCacheRef.current.get(message);
      if (cached) {
        return cached;
      }
      const entry = {
        blockId: getMessageEditorBlockId(message),
        message,
        driver: registry.resolve(message),
        estimatedHeight: estimateMessageEditorBlockHeight({
          isTextBlock: registry.isTextBlock(message),
          message,
        }),
      };
      atomicMessageCacheRef.current.set(message, entry);
      return entry;
    });
  }, [messages, registry]);
  const atomicMessageIndexByBlockId = useMemo(() => {
    return new Map(atomicMessages.map((entry, index) => [entry.blockId, index] as const));
  }, [atomicMessages]);

  const activeTextSelection = crossBlockSelectionPreview ?? crossBlockSelection?.selection ?? null;
  const selectionRenderLookup = useMemo(() => {
    return createMessageEditorSelectionRenderLookup(activeTextSelection);
  }, [activeTextSelection]);

  const handleVirtualizedRangeChange = useMessageEditorEventCallback((range: ListRange) => {
    if (composingBlockId) {
      const composingIndex = atomicMessageIndexByBlockId.get(composingBlockId);
      if (composingIndex != null && (composingIndex < range.startIndex || composingIndex > range.endIndex)) {
        virtualizedBlockListRef.current?.scrollBlockIntoView(composingBlockId, {
          align: "center",
          behavior: "auto",
        });
      }
    }
    restorePendingSelection();
  });

  const renderTextBlockCommandMenus = (blockId: string) => {
    const showSlashMenu = slashMenuState?.blockId === blockId && !readOnly;
    const showSpeakerMenu = speakerMenuState?.blockId === blockId && !readOnly;
    const showSpeakerAvatarMenu = speakerAvatarMenuState?.blockId === blockId && !readOnly;
    if (!showSlashMenu && !showSpeakerMenu && !showSpeakerAvatarMenu) {
      return null;
    }

    return (
      <>
        {showSlashMenu && (
          <MessageEditorFloatingCommandMenu>
            <MessageEditorSlashMenu
              visible
              items={slashMenuState.items}
              selectedIndex={activeSlashSelectionIndex}
              onSelect={item => handleSelectSlashItem(item.kind)}
            />
          </MessageEditorFloatingCommandMenu>
        )}
        {showSpeakerMenu && (
          <MessageEditorFloatingCommandMenu>
            <MessageEditorSpeakerMenu
              visible
              items={speakerMenuState.items}
              selectedIndex={activeSpeakerSelectionIndex}
              onSelect={handleSelectSpeakerItem}
            />
          </MessageEditorFloatingCommandMenu>
        )}
        {showSpeakerAvatarMenu && (
          <MessageEditorFloatingCommandMenu>
            <MessageEditorSpeakerAvatarMenu
              visible
              items={speakerAvatarMenuItems}
              loading={speakerAvatarRoleAvatarsQuery.isLoading}
              query={speakerAvatarSearchQuery}
              roleLabel={speakerAvatarMenuState.roleLabel}
              selectedIndex={activeSpeakerAvatarSelectionIndex}
              onSelect={handleSelectSpeakerAvatarItem}
            />
          </MessageEditorFloatingCommandMenu>
        )}
      </>
    );
  };

  const renderMessageEditorBlock = (
    { blockId, message, driver }: (typeof atomicMessages)[number],
    _index: number,
  ) => {
    const selectedSegment = selectionRenderLookup.get(blockId) ?? null;
    const atomicSelected = driver.kind !== "text" && Boolean(selectedSegment && selectedSegment.end > selectedSegment.start);
    const activeDropTarget = dragState ?? fileDropTarget;
    const canShowDropTarget = !dragState || dragState.draggedBlockId !== blockId;
    const showDropBefore = Boolean(activeDropTarget
      && canShowDropTarget
      && activeDropTarget.targetBlockId === blockId
      && activeDropTarget.position === "before");
    const showDropAfter = Boolean(activeDropTarget
      && canShowDropTarget
      && activeDropTarget.targetBlockId === blockId
      && activeDropTarget.position === "after");
    const isDragging = dragState?.draggedBlockId === blockId;
    const hasSyncProblem = roomDocumentProblemBlockIds?.has(blockId) ?? false;
    const shellClassName = `${driver.kind === "text"
      ? getMessageEditorTextBlockShellClassName({
          isDragging,
        })
      : getMessageEditorAtomicBlockShellClassName({
          isActive: activeBlockId === blockId,
          isDragging,
          isSelected: atomicSelected,
          readOnly,
        })}${hasSyncProblem ? " bg-error/10 ring-1 ring-error/30" : ""}`;
    const pendingMediaUpload = pendingMediaUploads.get(blockId);

    return (
      <MessageEditorBlockRow
        active={activeBlockId === blockId}
        blockId={blockId}
        commandMenus={driver.kind === "text" ? renderTextBlockCommandMenus(blockId) : null}
        driverKind={driver.kind}
        localFile={pendingMediaUpload?.file}
        message={message}
        onAtomicMouseDown={onAtomicBlockMouseDown}
        onAtomicKeyDown={onAtomicBlockKeyDown}
        onDeleteAtomicBlock={onDeleteAtomicBlock}
        onFocusAtomicBlock={onFocusAtomicBlock}
        onFocusTextBlock={onFocusTextBlock}
        onResizeAtomicBlock={onResizeAtomicBlock}
        onTextBlur={onTextBlur}
        onTextInput={onTextInput}
        onTextKeyDown={onTextKeyDown}
        onTextMouseDown={onTextMouseDown}
        onTextPasteFiles={onTextPasteFiles}
        onTextPasteText={onTextPasteText}
        onUploadAtomicBlock={onUploadAtomicBlock}
        uploadError={pendingMediaUpload?.error}
        uploading={Boolean(pendingMediaUpload && !pendingMediaUpload.error)}
        placeholder={driver.kind === "text" && atomicMessages.length === 1
          && normalizeMessageEditorContent(message.content).length === 0
          ? "输入内容"
          : ""}
        readOnly={readOnly}
        registerBlockRef={registerBlockRef}
        registerBlockShellRef={registerBlockShellRef}
        renderSpeakerHandle={renderSpeakerHandle}
        selectionSegment={driver.kind === "text" ? selectedSegment : null}
        selected={atomicSelected || activeBlockId === blockId}
        shellClassName={shellClassName}
        syncProblem={hasSyncProblem}
        showDropAfter={showDropAfter}
        showDropBefore={showDropBefore}
        textInputRef={textStyleInputRef}
      />
    );
  };

  // ==== Render 树 ====
  return (
    <div className={`
      ${frameClassName}
      relative overflow-hidden border border-base-300 bg-base-100
    `} onDragLeave={handleEditorFileDragLeave}>
      <div className="flex h-full min-h-0 flex-col">
        <MessageEditorVirtualizedBlockList
          key={resolvedDocId ?? "message-editor"}
          ref={virtualizedBlockListRef}
          blocks={ready ? atomicMessages : []}
          className={getMessageEditorScrollViewportClassName()}
          emptyPlaceholder={(
            <div className="
              flex min-h-[40vh] items-center justify-center text-sm
              text-base-content/50
            ">
              载入中
            </div>
          )}
          footer={ready && !readOnly
            ? (
                // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
                <div
                  data-me-editor-bottom-space="true"
                  className="min-h-20"
                  onMouseDown={handleEditorSurfaceMouseDown}
                />
              )
            : null}
          header={(
            <>
              <MessageEditorHeader
                coverUrl={coverUrl}
                docId={docId}
                readOnly={readOnly}
                ready={ready}
                saveState={saveState}
                roomDocumentSyncState={roomDocumentSyncState}
                roomDocumentSyncProgress={roomDocumentSyncProgress}
                onRequestClearDocument={onRequestClearRoomDocument}
                roomDocumentDeletedCount={roomDocumentDeletedCount}
                tcHeader={tcHeader}
                title={title}
              />
              <div ref={headerVisibilityMarkerRef} aria-hidden="true" className="h-px" />
              <div aria-hidden="true" className="h-5" />
            </>
          )}
          onDragOver={handleBlockDragOver}
          onDrop={handleBlockDrop}
          onCompositionStartCapture={(event) => {
            const target = event.target;
            const root = editorRootRef.current;
            if (!root || !(target instanceof Node)) {
              return;
            }
            const blockId = resolveMessageEditorBlockIdFromNode(root, target);
            if (blockId) {
              setComposingBlockId(blockId);
            }
          }}
          onCompositionEndCapture={() => {
            setComposingBlockId(null);
          }}
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
              || target.closest("[data-me-speaker-menu]")
              || target.closest("[data-me-speaker-avatar-menu]")
              || target.closest("[data-me-block-handle]")
              || target.closest("[data-me-editor-bottom-space]")
            ) {
              return;
            }
            clearEditorInteractionState();
          }}
          onSurfaceMouseDown={handleEditorSurfaceMouseDown}
          onVisibleRangeChange={handleVirtualizedRangeChange}
          registerBlockSlotRef={registerBlockSlotRef}
          registerScrollRoot={registerEditorRootRef}
          renderBlock={renderMessageEditorBlock}
        />
      </div>

      <MessageEditorFloatingHeader
        coverUrl={coverUrl}
        docId={docId}
        readOnly={readOnly}
        ready={ready}
        saveState={saveState}
        roomDocumentSyncState={roomDocumentSyncState}
        roomDocumentSyncProgress={roomDocumentSyncProgress}
        tcHeader={tcHeader}
        title={title}
        visible={showFloatingHeader}
      />

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
          visible={Boolean(activeTextMessage) || Boolean(crossBlockSelection)}
          className="text-style-toolbar"
        />
      )}
    </div>
  );
}

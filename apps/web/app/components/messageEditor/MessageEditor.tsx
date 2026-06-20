import type { ReactNode } from "react";

import { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { buildOptimisticRoomMessagesFromPatch } from "@tuanchat/query/room-message-lifecycle";

import type { RoomMessageStreamPatchOperation } from "@/components/chat/infra/doc/document/roomMessageStreamApi";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import { RoomContext } from "@/components/chat/core/roomContext";
import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotCache";
import { getPersistedDocSnapshot, setPersistedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotPersistence";
import { patchRemoteRoomMessageStream } from "@/components/chat/infra/doc/document/roomMessageStreamApi";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import { parseImportedChatText } from "@/components/chat/utils/importChatText";
import { useFloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import {
  readImageDimensions,
  readMediaDuration,
  readVideoDimensions,
} from "@/utils/mediaMetadata";
import { UploadUtils } from "@/utils/UploadUtils";

import type { Message, UserRole } from "../../../api";
import type { MessageEditorSlashMenuItem } from "./components/MessageEditorSlashMenu";
import type { MessageEditorMessage } from "./messageEditorTypes";
import type { MessageEditorSpeakerMenuItem } from "./model/messageEditorSpeaker";
import type { MessageEditorSpeakerAvatarMenuItem } from "./model/messageEditorSpeakerAvatar";
import type {
  MessageEditorInsertableBlockKind,
  MessageEditorSelectionTextResult,
} from "./model/messageEditorTransforms";
import type { MessageEditorController } from "./runtime/messageEditorController";
import type { MessageEditorSelection, MessageEditorSelectionPoint } from "./runtime/messageEditorSelection";

import { useGetRoleAvatarsQuery } from "../../../api/hooks/RoleAndAvatarHooks";
import { MessageEditorAtomicBlock } from "./components/MessageEditorAtomicBlock";
import { MessageEditorSlashMenu } from "./components/MessageEditorSlashMenu";
import { MessageEditorSpeakerAvatarMenu } from "./components/MessageEditorSpeakerAvatarMenu";
import { MessageEditorSpeakerHeader } from "./components/MessageEditorSpeakerHeader";
import { MessageEditorSpeakerMenu } from "./components/MessageEditorSpeakerMenu";
import { MessageEditorTextBlock } from "./components/MessageEditorTextBlock";
import { createMessageEditorSnapshot, decodeMessageEditorMessages } from "./model/messageEditorCodec";
import {
  buildMessageEditorSpeakerMenuItems,
  extractMessageEditorSpeakerCommandMatch,
  hasMessageEditorSpeaker,
  isMessageEditorSpeakerMenuCommitKey,
  isMessageEditorSpeakerRoleCandidate,
  splitMessageEditorSpeakerCommandQuery,
} from "./model/messageEditorSpeaker";
import { buildMessageEditorSpeakerAvatarClearMenuItems, buildMessageEditorSpeakerAvatarMenuItems } from "./model/messageEditorSpeakerAvatar";
import {
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  mergeMessageEditorMediaLayouts,
  normalizeMessageEditorContent,
  serializeMessageEditorMessages,
  setMessageEditorSpeakerMetadata,
  setMessageEditorUploadedMedia,
  updateMessageEditorMediaSize,
  updateMessageEditorTextContent,
} from "./model/messageEditorTransforms";
import { createMessageEditorController } from "./runtime/messageEditorController";
import { MessageEditorEventBus } from "./runtime/messageEditorEventBus";
import {
  getMessageEditorClipboardFiles,
  getMessageEditorMediaBlockKindForFile,
  getMessageEditorMediaBlockKindForMessage,
  isMessageEditorFileDrag,
  isMessageEditorUploadableMediaMessage,
} from "./runtime/messageEditorFileDrop";
import { resolveMessageEditorTextPointFromClientPosition } from "./runtime/messageEditorHitTest";
import { createMessageEditorRegistry } from "./runtime/messageEditorRegistry";
import {
  createMessageEditorDocumentSelection,
  createMessageEditorSelection,
  getAdjacentMessageEditorDocumentBlockPoint,
  getAdjacentMessageEditorTextBlockPoint,
  getMessageEditorSelectionText,
  moveMessageEditorDocumentPointByCharacter,
  resolveMessageEditorSelectionFromRange,
  restoreMessageEditorSelection,
} from "./runtime/messageEditorSelection";

type MessageEditorProps = {
  className?: string;
  coverUrl?: string;
  docId?: string;
  excerpt?: string;
  initialMessages?: Message[];
  intentPrewarm?: boolean;
  onRequestImportTextPaste?: (text: string, insertAsPlainText: () => void) => void;
  onRemoteMessagesSaved?: (messages: Message[]) => void | Promise<void>;
  readOnly?: boolean;
  remotePatchSourceSurface?: MessageEditorRemotePatchSourceSurface;
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
type MessageEditorRemotePatchSourceSurface = "doc_view" | "message_editor";
const ROOM_DOC_REMOTE_CHANGE_TOAST_ID = "room-doc-remote-change";

type MessageEditorHistoryFocus = {
  blockId: string;
  caret: number;
}

type MessageEditorHistoryEntry = {
  focus: MessageEditorHistoryFocus | null;
  messages: MessageEditorMessage[];
  serialized: string;
}

type MessageEditorHistoryKind = "default" | "typing";

type MessageEditorDragState = {
  draggedBlockId: string;
  position: "before" | "after";
  targetBlockId: string;
}

type MessageEditorResolvedDragTarget = {
  position: "before" | "after";
  targetBlockId: string;
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
const MESSAGE_EDITOR_SPEAKER_HANDLE_CLASS = [
  "absolute z-30 inline-flex cursor-grab transition-opacity duration-150 active:cursor-grabbing",
  "opacity-100",
].join(" ");

export function isMessageEditorImportablePasteText(text: string): boolean {
  return parseImportedChatText(text).messages.length > 0;
}

export function getMessageEditorPatchMutationMeta(sourceSurface: MessageEditorRemotePatchSourceSurface = "message_editor") {
  return {
    operationCause: "normal",
    sourceSurface,
  };
}

function hasMeaningfulMessageEditorContent(messages: MessageEditorMessage[]): boolean {
  return ensureMessageEditorMessages(messages).some((message) => {
    if (message.messageType !== MESSAGE_TYPE.TEXT && message.messageType !== MESSAGE_TYPE.INTRO_TEXT) {
      return true;
    }
    return normalizeMessageEditorContent(message.content).trim().length > 0;
  });
}

function getMessageEditorSnapshotFingerprint(messages: MessageEditorMessage[]): string {
  return stableSerializeMessageEditorValue(ensureMessageEditorMessages(messages));
}

type RuntimeMessageLike = MessageEditorMessage & Partial<Message>;

type RuntimeMessageIdState = "new" | "optimistic" | "persisted";

function isRuntimeOptimisticMessage(message: MessageEditorMessage): boolean {
  const value = (message as RuntimeMessageLike).tcLocalSyncState;
  if (value === "optimistic") {
    return true;
  }
  const runtimeMessageId = (message as RuntimeMessageLike).messageId;
  return typeof runtimeMessageId === "number" && Number.isFinite(runtimeMessageId) && runtimeMessageId < 0;
}

function getRuntimeMessageIdState(message: MessageEditorMessage): RuntimeMessageIdState {
  if (isRuntimeOptimisticMessage(message)) {
    return "optimistic";
  }
  const value = (message as RuntimeMessageLike).messageId;
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
    return "new";
  }
  return "persisted";
}

function getRuntimeMessageId(message: MessageEditorMessage): number | undefined {
  const value = (message as RuntimeMessageLike).messageId;
  return getRuntimeMessageIdState(message) === "persisted" ? value : undefined;
}

function getRuntimePosition(message: MessageEditorMessage, fallback: number): number {
  const value = (message as RuntimeMessageLike).position;
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

function serializeMessageEditorPatchContent(message: MessageEditorMessage): string {
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

function toPatchOptimisticMessageInput(message: MessageEditorMessage): Partial<Message> & { clientId: string } {
  const runtime = message as RuntimeMessageLike;
  return {
    clientId: getMessageEditorBlockId(message),
    ...(typeof runtime.messageId === "number" && Number.isFinite(runtime.messageId) ? { messageId: runtime.messageId } : {}),
    ...(typeof runtime.syncId === "number" && Number.isFinite(runtime.syncId) ? { syncId: runtime.syncId } : {}),
    ...(typeof runtime.roomId === "number" && Number.isFinite(runtime.roomId) ? { roomId: runtime.roomId } : {}),
    ...(typeof runtime.userId === "number" && Number.isFinite(runtime.userId) ? { userId: runtime.userId } : {}),
    ...(typeof message.roleId === "number" ? { roleId: message.roleId } : {}),
    content: normalizeMessageEditorContent(message.content),
    ...(typeof message.customRoleName === "string" ? { customRoleName: message.customRoleName } : {}),
    ...(Array.isArray(message.annotations) ? { annotations: message.annotations } : {}),
    ...(typeof message.avatarId === "number" ? { avatarId: message.avatarId } : {}),
    ...(message.webgal ? { webgal: message.webgal } : {}),
    ...(typeof message.replyMessageId === "number" ? { replyMessageId: message.replyMessageId } : {}),
    ...(typeof runtime.status === "number" && Number.isFinite(runtime.status) ? { status: runtime.status } : {}),
    messageType: message.messageType ?? MESSAGE_TYPE.TEXT,
    position: getRuntimePosition(message, 1),
    ...(message.extra ? { extra: message.extra as Message["extra"] } : {}),
    ...(typeof runtime.createTime === "string" ? { createTime: runtime.createTime } : {}),
    ...(typeof runtime.updateTime === "string" ? { updateTime: runtime.updateTime } : {}),
  };
}

export function buildRoomMessagePatchOperations(
  baselineMessages: MessageEditorMessage[],
  nextMessages: MessageEditorMessage[],
): RoomMessageStreamPatchOperation[] {
  const baselineById = new Map<number, MessageEditorMessage>();
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

export function mergeChangedRoomMessagesIntoEditorMessages(params: {
  changedMessages: Message[];
  currentMessages: MessageEditorMessage[];
  operations: RoomMessageStreamPatchOperation[];
}): MessageEditorMessage[] {
  const insertedByClientId = new Map<string, Message>();
  const changedByMessageId = new Map<number, Message>();
  const deletedMessageIds = new Set<number>();
  params.operations.forEach((operation, index) => {
    const changedMessage = params.changedMessages[index];
    if (!changedMessage) {
      return;
    }
    if (operation.op === "insert" && operation.clientId) {
      insertedByClientId.set(operation.clientId, changedMessage);
      return;
    }
    if (typeof operation.messageId !== "number") {
      return;
    }
    if (operation.op === "delete") {
      deletedMessageIds.add(operation.messageId);
      return;
    }
    changedByMessageId.set(operation.messageId, changedMessage);
  });

  const merged = params.currentMessages
    .filter(message => !deletedMessageIds.has(getRuntimeMessageId(message) ?? Number.NaN))
    .map((message) => {
      const blockId = getMessageEditorBlockId(message);
      const runtimeMessageId = getRuntimeMessageId(message);
      const changedMessage = insertedByClientId.get(blockId)
        ?? (runtimeMessageId !== undefined ? changedByMessageId.get(runtimeMessageId) : undefined);
      if (!changedMessage) {
        return message;
      }
      Object.assign(message, changedMessage);
      return message;
    });

  return merged;
}
const MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS = "px-8 md:px-10";
const MESSAGE_EDITOR_DEFAULT_FRAME_CLASS = "h-[80vh] min-h-0 rounded-md";
const MESSAGE_EDITOR_SCROLL_VIEWPORT_CLASS = "relative min-h-0 flex-1 overflow-auto";
const MESSAGE_EDITOR_TEXT_BLOCK_GAP_CLASS = "mb-2";
const MESSAGE_EDITOR_COMMAND_MENU_LAYER_CLASS = "absolute left-3 right-0 top-full z-50 mt-2";
const MESSAGE_EDITOR_POINTER_SCROLL_EDGE_PX = 72;
const MESSAGE_EDITOR_POINTER_SCROLL_MAX_DELTA_PX = 28;

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

/**
 * 返回命令菜单浮层类名。菜单不能参与正文流式排版。
 */
export function getMessageEditorSlashMenuLayerClassName() {
  return MESSAGE_EDITOR_COMMAND_MENU_LAYER_CLASS;
}

/**
 * 解析文字块外壳类名。
 * 连续文字块之间额外留 4px，区分块间分隔和块内 leading-7 产生的自然换行。
 */
export function getMessageEditorTextBlockShellClassName(options: {
  hasFollowingTextBlock: boolean;
  isDragging: boolean;
}) {
  return [
    `group relative ${MESSAGE_EDITOR_CONTENT_WIDTH_CLASS} ${MESSAGE_EDITOR_BLOCK_GUTTER_CLASS} rounded-md ${MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS} transition`,
    options.hasFollowingTextBlock ? MESSAGE_EDITOR_TEXT_BLOCK_GAP_CLASS : "",
    options.isDragging ? "bg-base-100/80 ring-1 ring-base-300/80" : "",
  ].join(" ");
}

export function resolveMessageEditorPointerAutoScrollDelta(params: {
  clientY: number;
  edgeSize?: number;
  maxDelta?: number;
  viewportBottom: number;
  viewportTop: number;
}) {
  const viewportHeight = params.viewportBottom - params.viewportTop;
  if (viewportHeight <= 0) {
    return 0;
  }

  const edgeSize = Math.max(1, Math.min(params.edgeSize ?? MESSAGE_EDITOR_POINTER_SCROLL_EDGE_PX, viewportHeight / 2));
  const maxDelta = Math.max(1, params.maxDelta ?? MESSAGE_EDITOR_POINTER_SCROLL_MAX_DELTA_PX);
  const topDistance = params.clientY - params.viewportTop;
  if (topDistance < edgeSize) {
    const intensity = Math.min(1, Math.max(0, (edgeSize - topDistance) / edgeSize));
    return -Math.ceil(intensity * maxDelta);
  }

  const bottomDistance = params.viewportBottom - params.clientY;
  if (bottomDistance < edgeSize) {
    const intensity = Math.min(1, Math.max(0, (edgeSize - bottomDistance) / edgeSize));
    return Math.ceil(intensity * maxDelta);
  }

  return 0;
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

export function extractMessageEditorSlashQuery(value: string): string | null {
  const normalized = value.replace(/\r\n?/g, "\n");
  let lineStart = 0;

  // 允许在同一个块的任意一行输入 / 触发块菜单。
  while (lineStart <= normalized.length) {
    const lineEnd = normalized.indexOf("\n", lineStart);
    const rawLine = lineEnd >= 0 ? normalized.slice(lineStart, lineEnd) : normalized.slice(lineStart);
    const trimmedLine = rawLine.trimStart();
    const match = trimmedLine.match(/^\/\s*(\S*)$/);
    if (match) {
      return match[1].toLowerCase();
    }

    if (lineEnd < 0) {
      break;
    }
    lineStart = lineEnd + 1;
  }

  return null;
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
  "IMG",
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
export default function MessageEditor({
  className,
  coverUrl,
  docId,
  excerpt: _excerpt,
  initialMessages,
  onRequestImportTextPaste,
  onRemoteMessagesSaved,
  readOnly = false,
  remotePatchSourceSurface = "message_editor",
  spaceId,
  tcHeader,
  title,
  workspaceId,
}: MessageEditorProps) {
  const roomContext = use(RoomContext);
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
  const isRoomDocument = Boolean(
    resolvedDocRoomId
    && resolvedSpaceId
    && (!resolvedWorkspaceId || resolvedWorkspaceId.startsWith("space:")),
  );
  const shouldUseLocalSnapshot = Boolean(resolvedDocId && !isRoomDocument);
  const initialEditorMessages = useMemo(
    () => isRoomDocument ? normalizedInitialMessages : ensureMessageEditorMessages([]),
    [isRoomDocument, normalizedInitialMessages],
  );
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const blockRefsRef = useRef(new Map<string, HTMLDivElement>());
  const blockShellRefsRef = useRef(new Map<string, HTMLDivElement>());
  const messagesRef = useRef<MessageEditorMessage[]>(initialEditorMessages);
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
  const [messages, setMessages] = useState<MessageEditorMessage[]>(() => initialEditorMessages);
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
  const [speakerSelectionIndex, setSpeakerSelectionIndex] = useState(0);
  const [dismissedSpeakerKey, setDismissedSpeakerKey] = useState<string | null>(null);
  const [speakerAvatarMenuState, setSpeakerAvatarMenuState] = useState<MessageEditorSpeakerAvatarMenuState | null>(null);
  const [speakerAvatarSelectionIndex, setSpeakerAvatarSelectionIndex] = useState(0);
  const [speakerAvatarSearchQuery, setSpeakerAvatarSearchQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [ready, setReady] = useState(!resolvedDocId || isRoomDocument);
  const registry = useMemo(() => createMessageEditorRegistry(), []);
  const eventBus = useMemo(() => new MessageEditorEventBus(), []);
  const lastSavedSerializedRef = useRef(isRoomDocument ? getMessageEditorSnapshotFingerprint(initialEditorMessages) : "");
  const saveGenerationRef = useRef(0);
  const activeRemoteSaveGenerationRef = useRef<number | null>(null);
  const dirtySinceLoadRef = useRef(false);
  const initialMessagesSeedRef = useRef(normalizedInitialMessages);
  const incomingRoomMessagesFingerprintRef = useRef(getMessageEditorSnapshotFingerprint(initialEditorMessages));
  const loadSeedKeyRef = useRef<string | null>(null);
  const baselineMessagesRef = useRef<MessageEditorMessage[]>(isRoomDocument ? initialEditorMessages : []);

  useEffect(() => {
    const loadSeedKey = `${resolvedDocId ?? ""}|${isRoomDocument ? "room" : "local"}`;
    if (loadSeedKeyRef.current !== loadSeedKey) {
      loadSeedKeyRef.current = loadSeedKey;
      initialMessagesSeedRef.current = normalizedInitialMessages;
    }
  }, [isRoomDocument, normalizedInitialMessages, resolvedDocId]);

  useEffect(() => {
    if (!ready || !resolvedDocId || !isRoomDocument) {
      return;
    }

    const nextMessages = mergeMessageEditorMediaLayouts(
      ensureMessageEditorMessages(normalizedInitialMessages),
      messagesRef.current,
    );
    const nextFingerprint = getMessageEditorSnapshotFingerprint(nextMessages);
    if (nextFingerprint === incomingRoomMessagesFingerprintRef.current) {
      return;
    }
    incomingRoomMessagesFingerprintRef.current = nextFingerprint;

    if (dirtySinceLoadRef.current) {
      // 文档自动保存会回写房间消息流；这类自发回流不应提示为外部变更。
      if (activeRemoteSaveGenerationRef.current !== null) {
        return;
      }
      toast("房间里有新的消息变更，保存后会同步到当前文档视图", {
        id: ROOM_DOC_REMOTE_CHANGE_TOAST_ID,
      });
      return;
    }

    const currentFingerprint = getMessageEditorSnapshotFingerprint(messagesRef.current);
    if (currentFingerprint === nextFingerprint) {
      return;
    }

    // 未编辑时可以直接接受房间消息的 WebSocket 增量；正在编辑时只提醒，不自动合并。
    baselineMessagesRef.current = nextMessages;
    messagesRef.current = nextMessages;
    lastSavedSerializedRef.current = nextFingerprint;
    setMessages(nextMessages);
  }, [isRoomDocument, normalizedInitialMessages, ready, resolvedDocId]);

  const reconcileRemotePatchMessages = useCallback(async (
    operations: RoomMessageStreamPatchOperation[],
    changedMessages: Message[],
    options: { updateState?: boolean } = {},
  ) => {
    if (operations.length === 0) {
      return false;
    }
    if (changedMessages.length !== operations.length) {
      throw new Error("房间消息变更响应数量不匹配");
    }

    const mergedMessages = mergeChangedRoomMessagesIntoEditorMessages({
      changedMessages,
      currentMessages: messagesRef.current,
      operations,
    });
    const nextFingerprint = getMessageEditorSnapshotFingerprint(mergedMessages);
    baselineMessagesRef.current = mergedMessages;
    messagesRef.current = mergedMessages;
    lastSavedSerializedRef.current = nextFingerprint;
    dirtySinceLoadRef.current = false;
    if (options.updateState !== false) {
      setMessages(mergedMessages);
    }
    await onRemoteMessagesSaved?.(changedMessages);
    return true;
  }, [onRemoteMessagesSaved]);

  const unloadFlushOptionsRef = useRef({
    isRoomDocument,
    onRemoteMessagesSaved,
    readOnly,
    reconcileRemotePatchMessages,
    remotePatchSourceSurface,
    resolvedDocId,
    resolvedDocRoomId,
    shouldUseLocalSnapshot,
  });

  useEffect(() => {
    unloadFlushOptionsRef.current = {
      isRoomDocument,
      onRemoteMessagesSaved,
      readOnly,
      reconcileRemotePatchMessages,
      remotePatchSourceSurface,
      resolvedDocId,
      resolvedDocRoomId,
      shouldUseLocalSnapshot,
    };
  }, [isRoomDocument, onRemoteMessagesSaved, readOnly, reconcileRemotePatchMessages, remotePatchSourceSurface, resolvedDocId, resolvedDocRoomId, shouldUseLocalSnapshot]);

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

  const clearSpeakerAvatarMenu = useCallback(() => {
    setSpeakerAvatarMenuState(null);
    setSpeakerAvatarSelectionIndex(0);
    setSpeakerAvatarSearchQuery("");
  }, []);

  const clearActiveBlock = useCallback(() => {
    setActiveBlockId(null);
    controllerRef.current?.setActiveBlock(null);
    clearCrossBlockSelection();
    clearSpeakerAvatarMenu();
  }, [clearCrossBlockSelection, clearSpeakerAvatarMenu]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const resolveHistoryFocus = useCallback((sourceMessages: MessageEditorMessage[]): MessageEditorHistoryFocus | null => {
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

  const createHistoryEntry = useCallback((sourceMessages: MessageEditorMessage[]): MessageEditorHistoryEntry => {
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

  const setMessagesWithRef = useCallback((updater: (previous: MessageEditorMessage[]) => MessageEditorMessage[], historyKind: MessageEditorHistoryKind = "default") => {
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

    if (isRoomDocument) {
      const nextMessages = ensureMessageEditorMessages(initialMessagesSeedRef.current);
      const nextFingerprint = getMessageEditorSnapshotFingerprint(nextMessages);
      incomingRoomMessagesFingerprintRef.current = nextFingerprint;
      resetHistory();
      dirtySinceLoadRef.current = false;
      baselineMessagesRef.current = nextMessages;
      messagesRef.current = nextMessages;
      lastSavedSerializedRef.current = nextFingerprint;
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
      const localSnapshotDocId = shouldUseLocalSnapshot ? resolvedDocId : undefined;
      const cached = localSnapshotDocId ? getCachedDocSnapshot(localSnapshotDocId) : null;
      const persisted = cached ?? (localSnapshotDocId
        ? await getPersistedDocSnapshot(localSnapshotDocId).catch(() => null)
        : null);

      if (cancelled) {
        return;
      }

      if (localSnapshotDocId && persisted && !cached) {
        setCachedDocSnapshot(localSnapshotDocId, persisted);
      }

      const seededInitialMessages = initialMessagesSeedRef.current;

      const fallback = resolvedDocId
        ? (seededInitialMessages.length > 0 ? seededInitialMessages : [createMessageEditorTextDraft()])
        : (messagesRef.current.length > 0 ? messagesRef.current : [createMessageEditorTextDraft()]);
      const nextMessages = ensureMessageEditorMessages(
        persisted ? decodeMessageEditorMessages(persisted) : fallback,
      );
      resetHistory();
      dirtySinceLoadRef.current = false;
      baselineMessagesRef.current = nextMessages;
      messagesRef.current = nextMessages;
      lastSavedSerializedRef.current = getMessageEditorSnapshotFingerprint(nextMessages);
      setMessages(nextMessages);
      setSaveState("idle");
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [hideToolbar, isRoomDocument, resetHistory, resolvedDocId, shouldUseLocalSnapshot]);

  useEffect(() => {
    if (!ready || readOnly || !resolvedDocId || !dirtySinceLoadRef.current) {
      return;
    }

    const snapshotFingerprint = getMessageEditorSnapshotFingerprint(messages);
    if (snapshotFingerprint === lastSavedSerializedRef.current) {
      return;
    }

    if (isRoomDocument && resolvedDocRoomId && !hasMeaningfulMessageEditorContent(messages)) {
      console.warn("[MessageEditor] skip empty room message-stream sync to avoid clearing content");
      return;
    }

    const timer = window.setTimeout(() => {
      const saveGeneration = saveGenerationRef.current + 1;
      saveGenerationRef.current = saveGeneration;
      activeRemoteSaveGenerationRef.current = saveGeneration;
      setSaveState("saving");
      const snapshot = createMessageEditorSnapshot(messages);
      const persistTask = isRoomDocument && resolvedDocRoomId
        ? (() => {
            const operations = buildRoomMessagePatchOperations(baselineMessagesRef.current, messages);
            if (operations.length === 0) {
              return Promise.resolve();
            }
            return patchRemoteRoomMessageStream({
              mutationMeta: getMessageEditorPatchMutationMeta(remotePatchSourceSurface),
              operations,
              roomId: resolvedDocRoomId,
            }).then(async (changedMessages) => {
              if (!isActiveRemoteSaveGeneration(saveGeneration)) {
                return;
              }
              await reconcileRemotePatchMessages(operations, changedMessages);
            });
          })()
        : shouldUseLocalSnapshot
          ? setPersistedDocSnapshot(resolvedDocId, snapshot).then(() => {
              setCachedDocSnapshot(resolvedDocId, snapshot);
            })
          : Promise.resolve();

      void persistTask
        .then(() => {
          if (saveGenerationRef.current === saveGeneration) {
            const savedBaseline = messagesRef.current;
            lastSavedSerializedRef.current = getMessageEditorSnapshotFingerprint(savedBaseline);
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
    }, isRoomDocument ? MESSAGE_EDITOR_REMOTE_SYNC_DELAY_MS : MESSAGE_EDITOR_LOCAL_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isActiveRemoteSaveGeneration, isRoomDocument, messages, readOnly, ready, reconcileRemotePatchMessages, remotePatchSourceSurface, resolvedDocId, resolvedDocRoomId, shouldUseLocalSnapshot]);

  useEffect(() => {
    return () => {
      const {
        isRoomDocument: currentIsRoomDocument,
        onRemoteMessagesSaved: currentOnRemoteMessagesSaved,
        readOnly: currentReadOnly,
        reconcileRemotePatchMessages: currentReconcileRemotePatchMessages,
        remotePatchSourceSurface: currentRemotePatchSourceSurface,
        resolvedDocId: currentResolvedDocId,
        resolvedDocRoomId: currentResolvedDocRoomId,
        shouldUseLocalSnapshot: currentShouldUseLocalSnapshot,
      } = unloadFlushOptionsRef.current;

      if (currentReadOnly || !currentResolvedDocId || !dirtySinceLoadRef.current) {
        return;
      }

      const snapshotFingerprint = getMessageEditorSnapshotFingerprint(messagesRef.current);
      if (snapshotFingerprint === lastSavedSerializedRef.current) {
        return;
      }

      if (currentIsRoomDocument && currentResolvedDocRoomId && !hasMeaningfulMessageEditorContent(messagesRef.current)) {
        console.warn("[MessageEditor] skip empty room message-stream flush to avoid clearing content");
        return;
      }

      const snapshot = createMessageEditorSnapshot(messagesRef.current);
      if (currentIsRoomDocument && currentResolvedDocRoomId) {
        const operations = buildRoomMessagePatchOperations(baselineMessagesRef.current, messagesRef.current);
        if (operations.length === 0) {
          dirtySinceLoadRef.current = false;
          baselineMessagesRef.current = messagesRef.current;
          return;
        }
        const optimisticMessages = buildOptimisticRoomMessagesFromPatch({
          baselineMessages: baselineMessagesRef.current.map(toPatchOptimisticMessageInput),
          nextMessages: messagesRef.current.map(toPatchOptimisticMessageInput),
          operations,
          roomId: currentResolvedDocRoomId,
        });
        if (optimisticMessages.length > 0) {
          void Promise.resolve(currentOnRemoteMessagesSaved?.(optimisticMessages)).catch((error: unknown) => {
            console.warn("[MessageEditor] optimistic room message stream merge failed", error);
          });
        }
        if (activeRemoteSaveGenerationRef.current !== null) {
          return;
        }

        saveGenerationRef.current += 1;
        const saveGeneration = saveGenerationRef.current;
        activeRemoteSaveGenerationRef.current = saveGeneration;
        lastSavedSerializedRef.current = snapshotFingerprint;
        const persistRemote = patchRemoteRoomMessageStream({
          mutationMeta: getMessageEditorPatchMutationMeta(currentRemotePatchSourceSurface),
          operations,
          roomId: currentResolvedDocRoomId,
        }).then((changedMessages) => {
          if (!isActiveRemoteSaveGeneration(saveGeneration)) {
            return;
          }
          return currentReconcileRemotePatchMessages(operations, changedMessages, { updateState: false });
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

      if (!currentShouldUseLocalSnapshot) {
        return;
      }

      saveGenerationRef.current += 1;
      lastSavedSerializedRef.current = snapshotFingerprint;
      setCachedDocSnapshot(currentResolvedDocId, snapshot);
      void setPersistedDocSnapshot(currentResolvedDocId, snapshot).catch((error) => {
        console.error("[MessageEditor] flush snapshot failed", error);
      });
    };
  }, [isActiveRemoteSaveGeneration, isRoomDocument, resolvedDocId, resolvedDocRoomId]);

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
      ?? blockShellRefsRef.current.get(selection.focus.blockId)
      ?? blockRefsRef.current.get(selection.end.blockId)
      ?? blockShellRefsRef.current.get(selection.end.blockId);
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

  const replaceDocumentSelectionTextAsBlocks = useCallback((selection: MessageEditorSelection, replacement: string) => {
    const result = controllerRef.current?.replaceSelectionTextAsBlocks(selection, replacement) ?? null;
    focusAfterSelectionEdit(result?.focus ?? null);
  }, [focusAfterSelectionEdit]);

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

    if (options?.transform) {
      const result = controllerRef.current?.transformSelectionText(selection, options.transform) ?? null;
      restoreSelectionAfterSelectionEdit(result);
      return Boolean(result);
    }

    const textEnhanceParams = parseWholeTextEnhanceReplacement(replacement, selectedText);
    const result = textEnhanceParams
      ? controllerRef.current?.transformSelectionText(selection, selectedPart => `[${selectedPart}](${textEnhanceParams})`) ?? null
      : controllerRef.current?.replaceSelectionText(selection, replacement) ?? null;
    restoreSelectionAfterSelectionEdit(result);
    return Boolean(result);
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

  const speakerRoles = useMemo(() => {
    const roleMap = new Map<number, UserRole>();
    const roomRoles = roomContext.roomAllRoles && roomContext.roomAllRoles.length > 0
      ? roomContext.roomAllRoles
      : roomContext.roomRolesThatUserOwn;

    for (const role of roomRoles ?? []) {
      if (isMessageEditorSpeakerRoleCandidate(role)) {
        roleMap.set(role.roleId, role);
      }
    }

    return [...roleMap.values()];
  }, [roomContext.roomAllRoles, roomContext.roomRolesThatUserOwn]);

  const activeTextMessage = useMemo(() => {
    if (!activeBlockId) {
      return null;
    }
    const message = messages.find(item => getMessageEditorBlockId(item) === activeBlockId);
    return message && registry.isTextBlock(message) ? message : null;
  }, [activeBlockId, messages, registry]);

  const slashMenuState = useMemo(() => {
    if (readOnly || !activeBlockId) {
      return null;
    }

    if (!activeTextMessage) {
      return null;
    }

    if (extractMessageEditorSpeakerCommandMatch(normalizeMessageEditorContent(activeTextMessage.content))) {
      // speaker 命令优先，正文里输入 / 或 @ 时不要再弹块指令菜单。
      return null;
    }

    const query = extractMessageEditorSlashQuery(normalizeMessageEditorContent(activeTextMessage.content));
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
    activeTextMessage?.avatarId,
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
    setSpeakerSelectionIndex(0);
  }, [speakerMenuState?.commandKey]);

  useEffect(() => {
    if (!speakerAvatarMenuState) {
      return;
    }

    setSpeakerAvatarSelectionIndex(0);
  }, [speakerAvatarMenuState?.commandKey, speakerAvatarMenuState]);

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

  const handleSelectSpeakerItem = useCallback((item: MessageEditorSpeakerMenuItem) => {
    if (!speakerMenuState) {
      return;
    }

    const blockId = speakerMenuState.blockId;
    const nextContent = speakerMenuState.remainder;
    if (item.kind === "clear") {
      controllerRef.current?.updateBlock(blockId, (current) => {
        return updateMessageEditorTextContent(current, nextContent);
      });
      setSpeakerAvatarMenuState({
        blockId,
        clearSpeaker: true,
        commandKey: `${speakerMenuState.commandKey}:avatar:clear`,
        remainder: nextContent,
        roleId: 0,
        roleLabel: "无",
      });
      setSpeakerAvatarSearchQuery("");
      setSpeakerAvatarSelectionIndex(0);
    }
    else {
      controllerRef.current?.updateBlock(blockId, (current) => {
        return updateMessageEditorTextContent(setMessageEditorSpeakerMetadata(current, {
          avatarId: item.avatarId,
          customRoleName: undefined,
          roleId: item.roleId,
        }), nextContent);
      });
      const { avatarQuery } = splitMessageEditorSpeakerCommandQuery(speakerMenuState.query);
      setSpeakerAvatarMenuState({
        blockId,
        commandKey: `${speakerMenuState.commandKey}:avatar:${item.roleId}`,
        remainder: nextContent,
        roleId: item.roleId,
        roleLabel: item.label,
      });
      setSpeakerAvatarSearchQuery(avatarQuery);
      setSpeakerAvatarSelectionIndex(0);
    }
    setDismissedSpeakerKey(null);
    setSpeakerSelectionIndex(0);
    hideToolbar();
    setActiveBlockId(blockId);
    controllerRef.current?.setActiveBlock(blockId);
    restoreSelectionRef.current = {
      blockId,
      caret: normalizeMessageEditorContent(nextContent).length,
    };
  }, [hideToolbar, speakerMenuState]);

  const handleSelectSpeakerAvatarItem = useCallback((item: MessageEditorSpeakerAvatarMenuItem) => {
    if (!speakerAvatarMenuState) {
      return;
    }

    const blockId = speakerAvatarMenuState.blockId;
    const currentMessage = messagesRef.current.find(message => getMessageEditorBlockId(message) === blockId);
    controllerRef.current?.updateBlock(blockId, (current) => {
      if (item.kind === "clear") {
        const nextMessage = setMessageEditorSpeakerMetadata(current, {
          avatarId: undefined,
          customRoleName: speakerAvatarMenuState.clearSpeaker ? undefined : current.customRoleName ?? undefined,
          roleId: speakerAvatarMenuState.clearSpeaker ? undefined : current.roleId ?? speakerAvatarMenuState.roleId,
        });
        return speakerAvatarMenuState.clearSpeaker
          ? updateMessageEditorTextContent(nextMessage, speakerAvatarMenuState.remainder)
          : nextMessage;
      }
      return setMessageEditorSpeakerMetadata(current, {
        avatarId: item.avatarId,
        customRoleName: current.customRoleName ?? undefined,
        roleId: current.roleId ?? speakerAvatarMenuState.roleId,
      });
    });
    clearSpeakerAvatarMenu();
    setActiveBlockId(blockId);
    controllerRef.current?.setActiveBlock(blockId);
    restoreSelectionRef.current = {
      blockId,
      caret: normalizeMessageEditorContent(currentMessage?.content ?? speakerAvatarMenuState.remainder).length,
    };
  }, [clearSpeakerAvatarMenu, speakerAvatarMenuState]);

  const handleTextInput = useCallback((blockId: string, nextContent: string) => {
    clearCrossBlockSelection();
    setDismissedSpeakerKey(null);
    if (speakerAvatarMenuState?.blockId === blockId) {
      clearSpeakerAvatarMenu();
    }
    controllerRef.current?.updateTextContent(blockId, nextContent);
  }, [clearCrossBlockSelection, clearSpeakerAvatarMenu, speakerAvatarMenuState]);

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
    const ownerWindow = documentRef.defaultView ?? window;
    const startPosition = {
      x: event.clientX,
      y: event.clientY,
    };
    let autoScrollFrame: number | null = null;
    let didDrag = false;
    let lastPointerPosition = startPosition;

    const updatePointerSelection = (clientX: number, clientY: number) => {
      const resolvedFocus = resolveTextSelectionPointFromClientPosition(clientX, clientY);
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

      const focusBlock = blockRefsRef.current.get(selection.focus.blockId)
        ?? blockShellRefsRef.current.get(selection.focus.blockId);
      if (!focusBlock) {
        return;
      }

      const bounds = focusBlock.getBoundingClientRect();
      const toolbarX = Math.max(bounds.left, Math.min(clientX, bounds.right));
      pointerSelectionRef.current = selection;
      pointerSelectionPositionRef.current = {
        x: toolbarX,
        y: bounds.top,
      };
      setCrossBlockSelectionPreview(selection);
      window.getSelection()?.removeAllRanges();
    };

    const stopAutoScroll = () => {
      if (autoScrollFrame == null) {
        return;
      }
      ownerWindow.cancelAnimationFrame(autoScrollFrame);
      autoScrollFrame = null;
    };

    const tickAutoScroll = () => {
      autoScrollFrame = null;
      if (!didDrag) {
        return;
      }

      const viewport = root.getBoundingClientRect();
      const delta = resolveMessageEditorPointerAutoScrollDelta({
        clientY: lastPointerPosition.y,
        viewportBottom: viewport.bottom,
        viewportTop: viewport.top,
      });
      if (delta === 0) {
        return;
      }

      const previousScrollTop = root.scrollTop;
      const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
      root.scrollTop = Math.max(0, Math.min(previousScrollTop + delta, maxScrollTop));
      if (root.scrollTop !== previousScrollTop) {
        updatePointerSelection(lastPointerPosition.x, lastPointerPosition.y);
      }
      autoScrollFrame = ownerWindow.requestAnimationFrame(tickAutoScroll);
    };

    const scheduleAutoScroll = () => {
      if (autoScrollFrame != null) {
        return;
      }
      autoScrollFrame = ownerWindow.requestAnimationFrame(tickAutoScroll);
    };

    const handleDocumentMouseMove = (moveEvent: MouseEvent) => {
      if ((moveEvent.buttons & 1) === 0) {
        return;
      }

      lastPointerPosition = {
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      };
      if (!didDrag) {
        didDrag = Math.abs(moveEvent.clientX - startPosition.x) > 3
          || Math.abs(moveEvent.clientY - startPosition.y) > 3;
      }
      if (!didDrag) {
        return;
      }

      updatePointerSelection(moveEvent.clientX, moveEvent.clientY);
      scheduleAutoScroll();
    };

    const cleanup = () => {
      stopAutoScroll();
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

  const handleAtomicBlockMouseDown = useCallback((blockId: string, event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || event.button !== 0 || !shouldStartMessageEditorAtomicBlockSelection(event.target)) {
      return;
    }

    const anchor = resolveTextSelectionPointFromClientPosition(event.clientX, event.clientY, blockId);
    if (!anchor) {
      return;
    }

    startTextPointerSelection(anchor, event, () => {
      clearCrossBlockSelection();
      setActiveBlockId(blockId);
      controllerRef.current?.setActiveBlock(blockId);
    });
  }, [
    clearCrossBlockSelection,
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
      if ((event.metaKey || event.ctrlKey) && key === "a") {
        const documentSelection = createMessageEditorDocumentSelection(messagesRef.current, registry);
        if (documentSelection && !documentSelection.collapsed) {
          event.preventDefault();
          showDocumentTextSelection(documentSelection);
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

        const nextFocus = moveMessageEditorDocumentPointByCharacter(messagesRef.current, registry, selection.focus, direction);
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

        const nextFocus = getAdjacentMessageEditorDocumentBlockPoint(messagesRef.current, registry, selection.focus, direction, selection.focus.offset);
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
        replaceDocumentSelectionTextAsBlocks(crossBlockSelection.selection, normalizedText);
      })) {
        return;
      }
      replaceDocumentSelectionTextAsBlocks(crossBlockSelection.selection, normalizedText);
    };

    document.addEventListener("paste", handleDocumentPaste);
    return () => {
      document.removeEventListener("paste", handleDocumentPaste);
    };
  }, [crossBlockSelection, readOnly, replaceDocumentSelectionTextAsBlocks, requestImportTextPaste]);

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
      const documentSelection = createMessageEditorDocumentSelection(messagesRef.current, registry);
      if (documentSelection && !documentSelection.collapsed) {
        event.preventDefault();
        showDocumentTextSelection(documentSelection);
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

    if (speakerAvatarMenuState?.blockId === blockId) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSpeakerAvatarSelectionIndex(previous => Math.min(previous + 1, Math.max(0, speakerAvatarMenuItems.length - 1)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSpeakerAvatarSelectionIndex(previous => Math.max(previous - 1, 0));
        return;
      }

      if (isMessageEditorSpeakerMenuCommitKey(event)) {
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
        setSpeakerAvatarSearchQuery(previous => previous.slice(0, -1));
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key.length === 1) {
        event.preventDefault();
        setSpeakerAvatarSearchQuery(previous => `${previous}${event.key}`);
        setSpeakerAvatarSelectionIndex(0);
        return;
      }

      event.preventDefault();
      return;
    }

    if (speakerMenuState?.blockId === blockId) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSpeakerSelectionIndex(previous => Math.min(previous + 1, speakerMenuState.items.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSpeakerSelectionIndex(previous => Math.max(previous - 1, 0));
        return;
      }

      if (isMessageEditorSpeakerMenuCommitKey(event)) {
        event.preventDefault();
        const activeItem = speakerMenuState.items[activeSpeakerSelectionIndex] ?? speakerMenuState.items[0];
        if (activeItem) {
          handleSelectSpeakerItem(activeItem);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setDismissedSpeakerKey(speakerMenuState.commandKey);
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
        const nextFocus = getAdjacentMessageEditorDocumentBlockPoint(messagesRef.current, registry, editorSelection.focus, direction, editorSelection.focus.offset);
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
  }, [
    activeSlashSelectionIndex,
    activeSpeakerSelectionIndex,
    activeSpeakerAvatarSelectionIndex,
    clearSpeakerAvatarMenu,
    focusTextPoint,
    handleSelectSlashItem,
    handleSelectSpeakerItem,
    handleSelectSpeakerAvatarItem,
    registry,
    showDocumentTextSelection,
    slashMenuState,
    speakerAvatarMenuItems,
    speakerAvatarMenuState,
    speakerMenuState,
    setSpeakerAvatarSelectionIndex,
    setSpeakerAvatarSearchQuery,
  ]);

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
    clearSpeakerAvatarMenu();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
    setDragState({
      draggedBlockId: blockId,
      targetBlockId: blockId,
      position: "after",
    });
  }, [clearSpeakerAvatarMenu]);

  const handleBlockDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

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
    const kind = getMessageEditorMediaBlockKindForMessage(currentMessage);
    if (!kind) {
      return;
    }

    const payload = await uploadMediaFileForKind(kind, file);
    controller.updateBlock(blockId, message => setMessageEditorUploadedMedia(message, payload));
  }, [uploadMediaFileForKind]);

  const handleResizeAtomicBlock = useCallback((blockId: string, size: { height: number; width: number }) => {
    controllerRef.current?.updateBlock(blockId, message => updateMessageEditorMediaSize(message, size));
  }, []);

  const insertMediaFileAtSelection = useCallback((file: File, selection: MessageEditorSelection) => {
    const kind = getMessageEditorMediaBlockKindForFile(file);
    const result = controllerRef.current?.insertBlockAtSelection(selection, kind) ?? null;
    if (!result) {
      return;
    }

    clearCrossBlockSelection();
    hideToolbar();
    setActiveBlockId(result.focus.blockId);
    restoreSelectionRef.current = result.focus;

    void uploadMediaFileForKind(kind, file)
      .then((payload) => {
        controllerRef.current?.updateBlock(result.insertedBlockId, message => setMessageEditorUploadedMedia(message, payload));
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "媒体上传失败");
      });
  }, [clearCrossBlockSelection, hideToolbar, uploadMediaFileForKind]);

  const insertMediaFileAtPoint = useCallback((file: File, point: MessageEditorSelectionPoint) => {
    const selection = createMessageEditorSelection(messagesRef.current, registry, point, point);
    if (!selection) {
      return;
    }

    insertMediaFileAtSelection(file, selection);
  }, [insertMediaFileAtSelection, registry]);

  const handleTextPasteFiles = useCallback((blockId: string, files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }

    const selection = resolveEditorSelection(true) ?? resolveEditorSelection(false);
    if (selection) {
      insertMediaFileAtSelection(file, selection);
      return;
    }

    const message = messagesRef.current.find(item => getMessageEditorBlockId(item) === blockId);
    const offset = normalizeMessageEditorContent(message?.content).length;
    const fallbackSelection = createMessageEditorSelection(messagesRef.current, registry, {
      blockId,
      offset,
    }, {
      blockId,
      offset,
    });
    if (fallbackSelection) {
      insertMediaFileAtSelection(file, fallbackSelection);
    }
  }, [insertMediaFileAtSelection, registry, resolveEditorSelection]);

  const handleTextPasteText = useCallback((blockId: string, text: string, insertPlainText: () => void) => {
    const normalizedText = normalizeEditableText(text);
    if (requestImportTextPaste(normalizedText, insertPlainText)) {
      return true;
    }
    if (!normalizedText.includes("\n")) {
      return false;
    }

    const selection = resolveEditorSelection(true) ?? resolveEditorSelection(false);
    if (selection) {
      replaceDocumentSelectionTextAsBlocks(selection, normalizedText);
      return true;
    }

    const message = messagesRef.current.find(item => getMessageEditorBlockId(item) === blockId);
    const offset = normalizeMessageEditorContent(message?.content).length;
    const fallbackSelection = createMessageEditorSelection(messagesRef.current, registry, {
      blockId,
      offset,
    }, {
      blockId,
      offset,
    });
    if (!fallbackSelection) {
      return false;
    }
    replaceDocumentSelectionTextAsBlocks(fallbackSelection, normalizedText);
    return true;
  }, [registry, replaceDocumentSelectionTextAsBlocks, requestImportTextPaste, resolveEditorSelection]);

  const handleBlockDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (isMessageEditorFileDrag(event.dataTransfer)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      return;
    }

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
    if (isMessageEditorFileDrag(event.dataTransfer)) {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      const root = editorRootRef.current;
      if (!file || !root) {
        return;
      }

      const point = resolveMessageEditorTextPointFromClientPosition({
        blockRefs: blockRefsRef.current,
        blockShellRefs: blockShellRefsRef.current,
        clientX: event.clientX,
        clientY: event.clientY,
        messages: messagesRef.current,
        registry,
        root,
      });
      if (point) {
        insertMediaFileAtPoint(file, point);
      }
      return;
    }

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
  }, [clearActiveBlock, dragState, insertMediaFileAtPoint, registry, resolveEditorSelection]);

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
        clearCrossBlockSelection();
        setActiveBlockId(targetBlockId);
        controllerRef.current?.setActiveBlock(targetBlockId);
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
    clearCrossBlockSelection,
    crossBlockSelection,
    handleUploadAtomicBlock,
    insertMediaFileAtSelection,
    readOnly,
    resolveEditorSelection,
    resolveFilePasteTargetBlockId,
  ]);

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
    <div className={`
      ${frameClassName}
      overflow-hidden border border-base-300 bg-base-100
    `}>
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
              || target.closest("[data-me-speaker-menu]")
              || target.closest("[data-me-speaker-avatar-menu]")
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
                <div className="
                  h-40 w-full shrink-0 overflow-hidden border-b border-base-300
                  bg-base-200
                ">
                  <img className="h-full w-full object-cover" src={resolvedCoverUrl} alt={resolvedTitle} />
                </div>
              )
            : null}

          <div className="border-b border-base-300 py-4">
            <div className={`
              ${MESSAGE_EDITOR_CONTENT_WIDTH_CLASS}
              ${MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS}
              flex items-center justify-between gap-4
            `}>
              <div className="min-w-0">
                <div className="
                  truncate text-lg font-semibold text-base-content
                  md:text-xl
                ">{resolvedTitle}</div>
                {resolvedDocId
                  ? (
                      <div className="
                        truncate font-mono text-xs text-base-content/45
                      ">
                        {resolvedDocId}
                      </div>
                    )
                  : null}
              </div>
              <div className="
                rounded-md border border-base-300 px-2 py-1 text-xs
                text-base-content/55
              ">
                {statusLabel}
              </div>
            </div>
          </div>

          {!ready && (
            <div className="
              flex min-h-[40vh] items-center justify-center text-sm
              text-base-content/45
            ">
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
                {atomicMessages.map(({ blockId, message, driver }, index) => {
                  const nextDriver = atomicMessages[index + 1]?.driver;
                  const activeTextSelection = crossBlockSelectionPreview ?? crossBlockSelection?.selection ?? null;
                  const selectedSegment = activeTextSelection?.segments.find(item => item.blockId === blockId) ?? null;
                  const atomicSelected = driver.kind !== "text" && Boolean(selectedSegment && selectedSegment.end > selectedSegment.start);
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
                        className={getMessageEditorTextBlockShellClassName({
                          hasFollowingTextBlock: nextDriver?.kind === "text",
                          isDragging: dragState?.draggedBlockId === blockId,
                        })}
                      >
                        {showDropBefore && (
                          <div className="
                            pointer-events-none absolute inset-x-10 top-0 h-0.5
                            rounded-full bg-primary
                          " />
                        )}
                        {showDropAfter && (
                          <div className="
                            pointer-events-none absolute inset-x-10 bottom-0
                            h-0.5 rounded-full bg-primary
                          " />
                        )}
                        {renderBlockSpeakerHandle(blockId, message, "top-0")}
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
                          onPasteFiles={handleTextPasteFiles}
                          onPasteText={handleTextPasteText}
                        />
                        {slashMenuState?.blockId === blockId && !readOnly && (
                          <MessageEditorFloatingCommandMenu>
                            <MessageEditorSlashMenu
                              visible
                              items={slashMenuState.items}
                              selectedIndex={activeSlashSelectionIndex}
                              onSelect={item => handleSelectSlashItem(item.kind)}
                            />
                          </MessageEditorFloatingCommandMenu>
                        )}
                        {speakerMenuState?.blockId === blockId && !readOnly && (
                          <MessageEditorFloatingCommandMenu>
                            <MessageEditorSpeakerMenu
                              visible
                              items={speakerMenuState.items}
                              selectedIndex={activeSpeakerSelectionIndex}
                              onSelect={handleSelectSpeakerItem}
                            />
                          </MessageEditorFloatingCommandMenu>
                        )}
                        {speakerAvatarMenuState?.blockId === blockId && !readOnly && (
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
                      </div>
                    );
                  }

                  return (
                    <div
                      key={blockId}
                      ref={node => registerBlockShellRef(blockId, node)}
                      className={[
                        `group relative ${MESSAGE_EDITOR_CONTENT_WIDTH_CLASS} ${MESSAGE_EDITOR_BLOCK_GUTTER_CLASS} rounded-md ${MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS} py-1 transition`,
                        dragState?.draggedBlockId === blockId
                          ? "bg-base-100/80 ring-1 ring-base-300/80"
                          : "",
                        atomicSelected
                          ? "bg-sky-200/10 ring-1 ring-sky-300/80"
                          : activeBlockId === blockId && !readOnly ? "bg-base-200/20" : "",
                      ].join(" ")}
                    >
                      {showDropBefore && (
                        <div className="
                          pointer-events-none absolute inset-x-10 top-0 h-0.5
                          rounded-full bg-primary
                        " />
                      )}
                      {showDropAfter && (
                        <div className="
                          pointer-events-none absolute inset-x-10 bottom-0 h-0.5
                          rounded-full bg-primary
                        " />
                      )}
                      {renderBlockSpeakerHandle(blockId, message, "top-1")}
                      <div
                        data-me-block-id={blockId}
                        className="
                          select-none
                          [&_[contenteditable='true']]:select-text
                          [&_input]:select-text
                          [&_select]:select-text
                          [&_textarea]:select-text
                        "
                        onMouseDown={event => handleAtomicBlockMouseDown(blockId, event)}
                      >
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
                          onUpdate={(nextBlockId, updater) => {
                            controllerRef.current?.updateBlock(nextBlockId, updater);
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
          visible={Boolean(activeTextMessage) || Boolean(crossBlockSelection)}
          className="text-style-toolbar"
        />
      )}
    </div>
  );
}

import type { RoomMessageStreamPatchOperation } from "@/components/chat/infra/doc/document/roomMessageStreamApi";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { Message } from "../../../../api";
import type { MessageEditorMessage } from "../messageEditorTypes";

import {
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  inheritMessageEditorRuntimeBlockId,
  normalizeMessageEditorContent,
} from "./messageEditorTransforms";

export type MessageEditorRemotePatchSourceSurface = "doc_view" | "message_editor";

export type MessageEditorPersistenceTarget =
  | { kind: "local"; docId: string }
  | { kind: "none" }
  | { kind: "remote"; roomId: number };

export type MessageEditorPersistenceContext = {
  localSnapshotDocId?: string;
  persistenceTarget: MessageEditorPersistenceTarget;
};

/** 一次持久化提交的纯数据执行计划。 */
export type MessageEditorPersistenceCommitPlan =
  | { kind: "local"; docId: string }
  | { kind: "none" }
  | { kind: "remote"; operations: RoomMessageStreamPatchOperation[]; roomId: number };

export type MessageEditorPersistenceChangeSet = {
  baselineByBlockId: ReadonlyMap<string, MessageEditorMessage>;
  currentByBlockId: ReadonlyMap<string, MessageEditorMessage>;
  currentIndexByBlockId: ReadonlyMap<string, number>;
  dirtyBlockIds: ReadonlySet<string>;
  structureChanged: boolean;
};

const MESSAGE_EDITOR_LOCAL_SAVE_DELAY_MS = 500;
const MESSAGE_EDITOR_REMOTE_SYNC_DELAY_MS = 2000;

type RuntimeMessageLike = MessageEditorMessage & Partial<Message>;

type RuntimeMessageIdState = "new" | "optimistic" | "persisted";

const MESSAGE_EDITOR_RUNTIME_FIELD_KEYS = [
  "messageId",
  "syncId",
  "roomId",
  "userId",
  "status",
  "replyMessageId",
  "position",
  "createTime",
  "updateTime",
] as const satisfies readonly (keyof MessageEditorMessage)[];

/** 返回远端房间消息流 patch 的 mutation 来源标记。 */
export function getMessageEditorPatchMutationMeta(sourceSurface: MessageEditorRemotePatchSourceSurface = "message_editor") {
  return {
    operationCause: "normal",
    sourceSurface,
  };
}

/** 解析本地快照读写使用的文档 ID，房间文档不会写入本地快照。 */
export function resolveMessageEditorLocalSnapshotDocId(params: {
  docId?: string;
  shouldUseLocalSnapshot: boolean;
}) {
  return params.shouldUseLocalSnapshot ? params.docId : undefined;
}

/** 解析当前保存应提交到本地快照、远端房间消息流，还是跳过。 */
export function resolveMessageEditorPersistenceTarget(params: {
  isRoomDocument: boolean;
  localSnapshotDocId?: string;
  roomId?: number;
}): MessageEditorPersistenceTarget {
  if (params.isRoomDocument && typeof params.roomId === "number" && Number.isFinite(params.roomId)) {
    return {
      kind: "remote",
      roomId: params.roomId,
    };
  }
  if (params.localSnapshotDocId) {
    return {
      docId: params.localSnapshotDocId,
      kind: "local",
    };
  }
  return { kind: "none" };
}

/**
 * 解析当前编辑器持久化上下文。
 *
 * 将本地快照 docId 解析与最终持久化目标放在同一处，避免 MessageEditor 在
 * load/save/flush 三条链路里重复拼装相同判定分支。
 */
export function resolveMessageEditorPersistenceContext(params: {
  docId?: string;
  isRoomDocument: boolean;
  roomId?: number;
  shouldUseLocalSnapshot: boolean;
}): MessageEditorPersistenceContext {
  const localSnapshotDocId = resolveMessageEditorLocalSnapshotDocId({
    docId: params.docId,
    shouldUseLocalSnapshot: params.shouldUseLocalSnapshot,
  });

  return {
    localSnapshotDocId,
    persistenceTarget: resolveMessageEditorPersistenceTarget({
      isRoomDocument: params.isRoomDocument,
      localSnapshotDocId,
      roomId: params.roomId,
    }),
  };
}

/**
 * 解析一次持久化提交需要执行的纯数据计划，不负责 IO 或运行时状态更新。
 */
export function resolveMessageEditorPersistenceCommitPlan(params: {
  baselineMessages: MessageEditorMessage[];
  changeSet?: MessageEditorPersistenceChangeSet;
  docId?: string;
  isRoomDocument: boolean;
  messages: MessageEditorMessage[];
  roomId?: number;
  shouldUseLocalSnapshot: boolean;
}): MessageEditorPersistenceCommitPlan {
  const { persistenceTarget } = resolveMessageEditorPersistenceContext({
    docId: params.docId,
    isRoomDocument: params.isRoomDocument,
    roomId: params.roomId,
    shouldUseLocalSnapshot: params.shouldUseLocalSnapshot,
  });

  if (persistenceTarget.kind !== "remote") {
    return persistenceTarget;
  }

  return {
    ...persistenceTarget,
    operations: params.changeSet && !params.changeSet.structureChanged
      ? buildIncrementalRoomMessagePatchOperations(params.changeSet)
      : buildRoomMessagePatchOperations(params.baselineMessages, params.messages),
  };
}

/** 解析不同文档类型对应的自动保存延迟。 */
export function resolveMessageEditorPersistenceDelayMs(params: {
  isRoomDocument: boolean;
}) {
  return params.isRoomDocument ? MESSAGE_EDITOR_REMOTE_SYNC_DELAY_MS : MESSAGE_EDITOR_LOCAL_SAVE_DELAY_MS;
}

/** 解析持久化加载失败或无缓存时使用的消息兜底。 */
export function resolveMessageEditorLoadFallback(params: {
  currentMessages: MessageEditorMessage[];
  docId?: string;
  seededInitialMessages: MessageEditorMessage[];
}) {
  if (params.docId) {
    return params.seededInitialMessages.length > 0
      ? params.seededInitialMessages
      : [createMessageEditorTextDraft()];
  }

  return params.currentMessages.length > 0
    ? params.currentMessages
    : [createMessageEditorTextDraft()];
}

/** 空房间消息流同步会删除远端内容，编辑器在这种情况下直接跳过。 */
export function shouldSkipEmptyRoomMessageStreamSync(messages: MessageEditorMessage[]): boolean {
  return !hasMeaningfulMessageEditorContent(messages);
}

/** 判断当前 persistence 流程是否应跳过空房间消息流同步。 */
export function shouldSkipMessageEditorRoomStreamPersistence(params: {
  isRoomDocument: boolean;
  messages: MessageEditorMessage[];
  roomId?: number;
}) {
  return params.isRoomDocument
    && typeof params.roomId === "number"
    && Number.isFinite(params.roomId)
    && shouldSkipEmptyRoomMessageStreamSync(params.messages);
}

/** 判断消息列表中是否存在应被视为正文内容的块。 */
export function hasMeaningfulMessageEditorContent(messages: MessageEditorMessage[]): boolean {
  return ensureMessageEditorMessages(messages).some((message) => {
    if (message.messageType !== MESSAGE_TYPE.TEXT && message.messageType !== MESSAGE_TYPE.INTRO_TEXT) {
      return true;
    }
    return normalizeMessageEditorContent(message.content).trim().length > 0;
  });
}

/** 生成用于 dirty/save 判断的稳定快照指纹。 */
export function getMessageEditorSnapshotFingerprint(messages: MessageEditorMessage[]): string {
  return stableSerializeMessageEditorValue(ensureMessageEditorMessages(messages));
}

/** 判断保存请求发出后，当前工作副本是否又发生了变化。 */
export function didMessageEditorSnapshotChangeAfterSave(params: {
  currentMessages: MessageEditorMessage[];
  submittedMessages: MessageEditorMessage[];
}) {
  return getMessageEditorSnapshotFingerprint(params.currentMessages)
    !== getMessageEditorSnapshotFingerprint(params.submittedMessages);
}

/**
 * 解析一次已完成保存应提交的 current / baseline 状态。
 *
 * 保存成功只能证明 submittedMessages 已落盘；若 current 已继续变化，必须保留
 * 当前工作副本并继续保持 dirty。
 */
export function resolveMessageEditorCompletedSaveState(params: {
  currentMessages: MessageEditorMessage[];
  savedMessages: MessageEditorMessage[];
  submittedMessages: MessageEditorMessage[];
}) {
  const savedMessages = ensureMessageEditorMessages(params.savedMessages);
  const currentChangedAfterSubmit = didMessageEditorSnapshotChangeAfterSave({
    currentMessages: params.currentMessages,
    submittedMessages: params.submittedMessages,
  });
  const nextMessages = currentChangedAfterSubmit
    ? ensureMessageEditorMessages(params.currentMessages)
    : savedMessages;
  const savedFingerprint = getMessageEditorSnapshotFingerprint(savedMessages);

  return {
    currentChangedAfterSubmit,
    dirtySinceSave: getMessageEditorSnapshotFingerprint(nextMessages) !== savedFingerprint,
    nextMessages,
    savedFingerprint,
    savedMessages,
  };
}

/**
 * 同一房间的外部快照回流时，按持久化 messageId 保留当前 runtime blockId。
 * 新插入的远端块仍获得新 ID，文档切换初始化不应调用此策略。
 */
export function reconcileMessageEditorRuntimeBlockIds(params: {
  currentMessages: MessageEditorMessage[];
  incomingMessages: MessageEditorMessage[];
}) {
  const currentByMessageId = new Map<number, MessageEditorMessage>();
  params.currentMessages.forEach((message) => {
    const messageId = getRuntimeMessageId(message);
    if (messageId !== undefined) {
      currentByMessageId.set(messageId, message);
    }
  });

  return ensureMessageEditorMessages(params.incomingMessages).map((incomingMessage) => {
    const messageId = getRuntimeMessageId(incomingMessage);
    const currentMessage = messageId !== undefined ? currentByMessageId.get(messageId) : undefined;
    return currentMessage
      ? inheritMessageEditorRuntimeBlockId(currentMessage, incomingMessage)
      : incomingMessage;
  });
}

function isRuntimeOptimisticMessage(message: MessageEditorMessage): boolean {
  if (message.tcMessageEditorDraft === true) {
    return false;
  }
  const value = (message as RuntimeMessageLike).tcLocalSyncState;
  if (value === "optimistic") {
    return true;
  }
  const runtimeMessageId = (message as RuntimeMessageLike).messageId;
  return typeof runtimeMessageId === "number" && Number.isFinite(runtimeMessageId) && runtimeMessageId < 0;
}

function getRuntimeMessageIdState(message: MessageEditorMessage): RuntimeMessageIdState {
  if (message.tcMessageEditorDraft === true) {
    return "new";
  }
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

function isFiniteMediaNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

/** 未上传完成的新媒体块只存在于编辑器本地，不能进入远端消息校验。 */
function isPendingMessageEditorMediaInsert(message: MessageEditorMessage) {
  if (getRuntimeMessageId(message) !== undefined) {
    return false;
  }

  if (message.messageType === MESSAGE_TYPE.IMG) {
    const image = message.extra?.imageMessage;
    return !image?.source
      || !isFiniteMediaNumber(image.width)
      || !isFiniteMediaNumber(image.height);
  }
  if (message.messageType === MESSAGE_TYPE.FILE) {
    const file = message.extra?.fileMessage;
    return !isFiniteMediaNumber(file?.fileId)
      || !isFiniteMediaNumber(file?.size)
      || typeof file?.fileName !== "string"
      || typeof file?.mediaType !== "string";
  }
  if (message.messageType === MESSAGE_TYPE.SOUND) {
    const sound = message.extra?.soundMessage;
    return !sound?.source || !isFiniteMediaNumber(sound.second);
  }
  if (message.messageType === MESSAGE_TYPE.VIDEO) {
    return !message.extra?.videoMessage?.source;
  }
  return false;
}

function buildRemotePatchMessage(message: MessageEditorMessage, position: number) {
  if (message.messageType !== MESSAGE_TYPE.IMG || !message.extra?.imageMessage) {
    return { ...message, position };
  }

  return {
    ...message,
    extra: {
      ...message.extra,
      imageMessage: {
        ...message.extra.imageMessage,
        background: message.extra.imageMessage.background ?? false,
      },
    },
    position,
  };
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

/** 转换成房间消息流乐观更新所需的输入结构。 */
export function toPatchOptimisticMessageInput(message: MessageEditorMessage): Partial<Message> & { clientId: string } {
  const runtime = message as RuntimeMessageLike;
  const persistedMessageId = getRuntimeMessageId(message);
  return {
    clientId: getMessageEditorBlockId(message),
    ...(persistedMessageId !== undefined ? { messageId: persistedMessageId } : {}),
    ...(persistedMessageId !== undefined && typeof runtime.syncId === "number" && Number.isFinite(runtime.syncId)
      ? { syncId: runtime.syncId }
      : {}),
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

/**
 * 为内容级编辑生成 patch。结构变化会影响一段 position，调用方应改走完整 order diff。
 */
export function buildIncrementalRoomMessagePatchOperations(
  changeSet: MessageEditorPersistenceChangeSet,
): RoomMessageStreamPatchOperation[] {
  const operations: RoomMessageStreamPatchOperation[] = [];
  for (const blockId of changeSet.dirtyBlockIds) {
    const baseline = changeSet.baselineByBlockId.get(blockId);
    const message = changeSet.currentByBlockId.get(blockId);

    if (!message) {
      const messageId = baseline ? getRuntimeMessageId(baseline) : undefined;
      if (messageId !== undefined) {
        operations.push({ op: "delete", messageId });
      }
      continue;
    }

    const messageIdState = getRuntimeMessageIdState(message);
    if (messageIdState === "optimistic") {
      continue;
    }
    if (isPendingMessageEditorMediaInsert(message)) {
      continue;
    }
    const messageId = getRuntimeMessageId(message);
    const index = changeSet.currentIndexByBlockId.get(blockId) ?? 0;
    const position = getRuntimePosition(message, index + 1);
    if (!baseline || messageIdState === "new" || messageId === undefined) {
      operations.push({
        clientId: blockId,
        message: buildRemotePatchMessage(message, position),
        op: "insert",
        position,
      });
      continue;
    }

    if (serializeMessageEditorPatchContent(baseline) !== serializeMessageEditorPatchContent(message)) {
      operations.push({
        message: buildRemotePatchMessage(message, position),
        messageId,
        op: "update",
        position,
      });
    }
  }
  return operations;
}

/** 比较 baseline 与下一版编辑器消息，生成房间消息流 patch 操作。 */
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
    if (isPendingMessageEditorMediaInsert(message)) {
      return;
    }
    if (messageIdState === "new") {
      operations.push({
        op: "insert",
        clientId: getMessageEditorBlockId(message),
        message: buildRemotePatchMessage(message, position),
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
        message: buildRemotePatchMessage(message, position),
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
        message: buildRemotePatchMessage(message, position),
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

/** 将远端 patch 响应合并回编辑器消息，保留未变更块的运行时对象引用。 */
export function mergeChangedRoomMessagesIntoEditorMessages(params: {
  changedMessages: Message[];
  currentMessages: MessageEditorMessage[];
  operations: RoomMessageStreamPatchOperation[];
}): MessageEditorMessage[] {
  const { insertedByClientId, changedByMessageId } = matchRoomPatchResponseMessages(params);
  const deletedMessageIds = new Set<number>();
  params.operations.forEach((operation) => {
    if (typeof operation.messageId !== "number") return;
    if (operation.op === "delete") {
      deletedMessageIds.add(operation.messageId);
    }
  });

  const merged = params.currentMessages
    .filter(message => !deletedMessageIds.has(getRuntimeMessageId(message) ?? Number.NaN))
    .map((message) => {
      const blockId = getMessageEditorBlockId(message);
      const runtimeMessageId = getRuntimeMessageId(message);
      const insertedMessage = insertedByClientId.get(blockId);
      const changedMessage = insertedMessage
        ?? (runtimeMessageId !== undefined ? changedByMessageId.get(runtimeMessageId) : undefined);
      if (!changedMessage) {
        return message;
      }
      const nextMessage = inheritMessageEditorRuntimeBlockId(message, {
        ...message,
        ...changedMessage,
      });
      if (insertedMessage) {
        delete nextMessage.tcLocalSyncState;
        delete nextMessage.tcMessageEditorDraft;
      }
      return nextMessage;
    });

  return merged;
}

/**
 * current 在远端保存期间继续变化时，只把服务端身份与同步字段合并回来。
 * 正文、角色、媒体配置等用户可编辑字段始终以最新 current 为准。
 */
export function mergeChangedRoomMessageRuntimeIntoEditorMessages(params: {
  changedMessages: Message[];
  currentMessages: MessageEditorMessage[];
  operations: RoomMessageStreamPatchOperation[];
}): MessageEditorMessage[] {
  const { insertedByClientId, changedByMessageId } = matchRoomPatchResponseMessages(params);
  const deletedMessageIds = new Set<number>();
  params.operations.forEach((operation) => {
    if (typeof operation.messageId !== "number") {
      return;
    }
    if (operation.op === "delete") {
      deletedMessageIds.add(operation.messageId);
      return;
    }
  });

  return ensureMessageEditorMessages(params.currentMessages).map((message) => {
    const runtimeMessageId = getRuntimeMessageId(message);
    if (runtimeMessageId !== undefined && deletedMessageIds.has(runtimeMessageId)) {
      const nextMessage = { ...message } as MessageEditorMessage;
      for (const key of MESSAGE_EDITOR_RUNTIME_FIELD_KEYS) {
        delete nextMessage[key];
      }
      return nextMessage;
    }

    const insertedMessage = insertedByClientId.get(getMessageEditorBlockId(message));
    const changedMessage = insertedMessage
      ?? (runtimeMessageId !== undefined ? changedByMessageId.get(runtimeMessageId) : undefined);
    if (!changedMessage) {
      return message;
    }

    const nextMessage = { ...message } as MessageEditorMessage;
    for (const key of MESSAGE_EDITOR_RUNTIME_FIELD_KEYS) {
      if (key in changedMessage) {
        Object.assign(nextMessage, { [key]: changedMessage[key] });
      }
    }
    if (insertedMessage) {
      delete nextMessage.tcLocalSyncState;
      delete nextMessage.tcMessageEditorDraft;
    }
    return nextMessage;
  });
}

/**
 * 批量接口不承诺响应数组顺序。已有 messageId 的操作按 ID 对应；insert 仅接受
 * 在响应中可由提交内容唯一识别的结果，避免按下标把 A 块的服务端身份交给 B 块。
 */
function matchRoomPatchResponseMessages(params: {
  changedMessages: Message[];
  operations: RoomMessageStreamPatchOperation[];
}) {
  const changedByMessageId = new Map<number, Message>();
  const unmatched = new Set(params.changedMessages);
  params.changedMessages.forEach((message) => {
    if (typeof message.messageId === "number") changedByMessageId.set(message.messageId, message);
  });
  const insertedByClientId = new Map<string, Message>();
  const insertCount = params.operations.filter(operation => operation.op === "insert" && operation.clientId && operation.message).length;
  for (const operation of params.operations) {
    if (operation.op !== "insert" || !operation.clientId || !operation.message) continue;
    const candidates = [...unmatched].filter((message) => {
      return message.messageType === operation.message?.messageType
        && message.content === operation.message?.content
        && message.position === operation.position;
    });
    const matched = candidates.length === 1
      ? candidates[0]
      // 单一 insert 的唯一未消费响应不存在串块风险；服务端可能规范化正文。
      : insertCount === 1 && unmatched.size === 1
        ? [...unmatched][0]
        : undefined;
    if (!matched) {
      throw new Error("插入消息响应无法唯一确认");
    }
    insertedByClientId.set(operation.clientId, matched);
    unmatched.delete(matched);
  }
  return { changedByMessageId, insertedByClientId };
}

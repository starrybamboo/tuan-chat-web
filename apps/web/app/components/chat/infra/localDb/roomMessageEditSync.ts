import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { mergeRoomMessages } from "@tuanchat/query/room-message";

import type { ChatMessageResponse, Message } from "../../../../../api";
import type { RoomMessageStreamPatchOperation } from "../doc/document/roomMessageStreamApi";

type RoomMessageRuntime = Message & {
  tcLocalRenderKey?: string;
  tcLocalSyncState?: "optimistic";
  tcMessageEditorDraft?: boolean;
};

export type RoomMessageEditOperation = {
  baseMessage?: RoomMessageRuntime;
  clientId?: string;
  localMessageId?: number;
  message?: RoomMessageRuntime;
  messageId?: number;
  op: "insert" | "update" | "delete" | "move";
  position?: number;
};

export type RoomMessageEditSyncStatus = {
  phase: "idle" | "editing" | "cloudSaving" | "synced" | "error";
  problemClientIds: readonly string[];
  state: "clean" | "syncing" | "error";
};

export type RoomMessageEditProtection = {
  deletedMessageIds: ReadonlySet<number>;
  dirtyMessageIds: ReadonlySet<number>;
};

export type RoomMessageEditScheduler = {
  clear(timer: unknown): void;
  schedule(callback: () => void, delayMs: number): unknown;
};

export type RoomMessageEditSyncDependencies = {
  addPendingMessages(messages: ChatMessageResponse[]): Promise<void>;
  getQueryMessages(): ChatMessageResponse[];
  onPersistenceError?(error: unknown): void;
  onStatus(status: RoomMessageEditSyncStatus): void;
  patch(operations: RoomMessageStreamPatchOperation[]): Promise<Message[]>;
  prepareConfirmedMessage?(confirmed: Message, optimistic?: Message): Message;
  promotePendingMessage(localMessageId: number, confirmed: ChatMessageResponse): Promise<void>;
  registerMessageAlias(localMessageId: number, confirmedMessageId: number): void;
  replaceConfirmedMessages(messages: ChatMessageResponse[]): Promise<void>;
  replaceQueryMessages(updater: (messages: ChatMessageResponse[]) => ChatMessageResponse[]): void;
  rollbackPendingMessages(pendingMessageIds: number[]): Promise<void>;
  scheduler: RoomMessageEditScheduler;
  setProtection(protection: RoomMessageEditProtection): void;
};

const EDITABLE_MESSAGE_KEYS = [
  "annotations",
  "avatarId",
  "content",
  "customRoleName",
  "extra",
  "messageType",
  "replyMessageId",
  "roleId",
  "webgal",
] as const satisfies readonly (keyof Message)[];

const CONFIRMED_RUNTIME_KEYS = [
  "messageId",
  "syncId",
  "roomId",
  "userId",
  "createTime",
  "updateTime",
] as const satisfies readonly (keyof Message)[];

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getOperationIdentity(operation: RoomMessageEditOperation): number | undefined {
  return operation.localMessageId ?? operation.messageId;
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

function editableFingerprint(message: RoomMessageRuntime): string {
  return stableSerialize(Object.fromEntries(EDITABLE_MESSAGE_KEYS.map(key => [key, message[key] ?? null])));
}

function hasFiniteMediaNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function isSubmittableInsert(message: RoomMessageRuntime): boolean {
  if (message.messageType === MESSAGE_TYPE.TEXT || message.messageType === MESSAGE_TYPE.INTRO_TEXT) {
    return String(message.content ?? "").trim().length > 0;
  }
  if (message.messageType === MESSAGE_TYPE.IMG) {
    const image = message.extra?.imageMessage;
    return Boolean(image?.source) && hasFiniteMediaNumber(image?.width) && hasFiniteMediaNumber(image?.height);
  }
  if (message.messageType === MESSAGE_TYPE.FILE) {
    const file = message.extra?.fileMessage;
    return hasFiniteMediaNumber(file?.fileId)
      && hasFiniteMediaNumber(file?.size)
      && typeof file?.fileName === "string"
      && typeof file?.mediaType === "string";
  }
  if (message.messageType === MESSAGE_TYPE.SOUND) {
    const sound = message.extra?.soundMessage;
    return Boolean(sound?.source) && hasFiniteMediaNumber(sound?.second);
  }
  if (message.messageType === MESSAGE_TYPE.VIDEO) {
    return Boolean(message.extra?.videoMessage?.source);
  }
  return true;
}

function createChangeOperation(previous: RoomMessageRuntime | undefined, next: RoomMessageRuntime): RoomMessageEditOperation | null {
  const messageId = next.messageId;
  const position = next.position;
  if (messageId < 0) {
    const wasSubmittable = previous ? isSubmittableInsert(previous) : false;
    const isSubmittable = isSubmittableInsert(next);
    if (!isSubmittable) {
      return wasSubmittable
        ? { localMessageId: messageId, op: "delete" }
        : null;
    }
    if (!previous || !wasSubmittable) {
      return {
        clientId: next.tcLocalRenderKey ?? `room-message:${messageId}`,
        localMessageId: messageId,
        message: next,
        op: "insert",
        position,
      };
    }
    const contentChanged = editableFingerprint(previous) !== editableFingerprint(next);
    const positionChanged = previous.position !== position;
    if (contentChanged) {
      return { localMessageId: messageId, message: next, op: "update", position };
    }
    return positionChanged ? { localMessageId: messageId, op: "move", position } : null;
  }

  if (!previous) {
    return { message: next, messageId, op: "update", position };
  }
  const contentChanged = editableFingerprint(previous) !== editableFingerprint(next);
  const positionChanged = previous.position !== position;
  if (contentChanged) {
    return { baseMessage: previous, message: next, messageId, op: "update", position };
  }
  return positionChanged
    ? { baseMessage: previous, messageId, op: "move", position }
    : null;
}

/** 从一次 Query 编辑事务的前后状态临时生成 operations，不保留完整消息快照。 */
export function deriveRoomMessageEditOperations(
  previousMessages: ChatMessageResponse[],
  nextMessages: ChatMessageResponse[],
): RoomMessageEditOperation[] {
  const previousById = new Map(previousMessages.map(item => [
    item.message.messageId,
    item.message as RoomMessageRuntime,
  ]));
  const nextIds = new Set<number>();
  const operations: RoomMessageEditOperation[] = [];

  for (const item of nextMessages) {
    const message = item.message as RoomMessageRuntime;
    const messageId = toFiniteNumber(message.messageId);
    if (messageId === undefined || messageId === 0) continue;
    nextIds.add(messageId);
    const operation = createChangeOperation(previousById.get(messageId), message);
    if (operation) operations.push(operation);
  }

  for (const item of previousMessages) {
    const message = item.message as RoomMessageRuntime;
    const messageId = toFiniteNumber(message.messageId);
    if (messageId === undefined || messageId === 0 || nextIds.has(messageId)) continue;
    if (messageId < 0 && !isSubmittableInsert(message)) continue;
    operations.push(messageId < 0
      ? { localMessageId: messageId, op: "delete" }
      : { baseMessage: message, messageId, op: "delete" });
  }
  return operations;
}

function operationMatchesBase(operation: RoomMessageEditOperation): boolean {
  const base = operation.baseMessage;
  if (!base || operation.op === "delete" || operation.op === "insert") return false;
  const positionMatches = operation.position === undefined || operation.position === base.position;
  if (operation.op === "move") return positionMatches;
  return operation.message !== undefined
    && positionMatches
    && editableFingerprint(operation.message) === editableFingerprint(base);
}

function mergeOperations(
  previous: RoomMessageEditOperation,
  incoming: RoomMessageEditOperation,
): RoomMessageEditOperation | null {
  const baseMessage = previous.baseMessage ?? incoming.baseMessage;
  if (previous.op === "insert") {
    if (incoming.op === "delete") return null;
    const nextMessage = incoming.message ?? previous.message;
    return {
      ...previous,
      message: nextMessage,
      position: incoming.position ?? nextMessage?.position ?? previous.position,
    };
  }
  if (incoming.op === "delete") {
    return {
      baseMessage,
      localMessageId: previous.localMessageId ?? incoming.localMessageId,
      messageId: previous.messageId ?? incoming.messageId,
      op: "delete",
    };
  }
  const op = previous.op === "update" || incoming.op === "update" ? "update" : "move";
  const merged: RoomMessageEditOperation = {
    baseMessage,
    localMessageId: previous.localMessageId ?? incoming.localMessageId,
    message: incoming.message ?? previous.message,
    messageId: previous.messageId ?? incoming.messageId,
    op,
    position: incoming.position ?? previous.position,
  };
  return operationMatchesBase(merged) ? null : merged;
}

/** 将同一身份的连续动作压缩成最终待提交意图，并保持首次出现顺序。 */
export function compactRoomMessageEditOperations(
  current: readonly RoomMessageEditOperation[],
  incoming: readonly RoomMessageEditOperation[],
): RoomMessageEditOperation[] {
  const result = [...current];
  for (const operation of incoming) {
    const identity = getOperationIdentity(operation);
    if (identity === undefined) continue;
    const existingIndex = result.findIndex(item => getOperationIdentity(item) === identity);
    if (existingIndex < 0) {
      if (!operationMatchesBase(operation)) result.push(operation);
      continue;
    }
    const merged = mergeOperations(result[existingIndex], operation);
    if (merged) result[existingIndex] = merged;
    else result.splice(existingIndex, 1);
  }
  return result;
}

function toRemoteOperation(operation: RoomMessageEditOperation): RoomMessageStreamPatchOperation {
  if (operation.op !== "insert" && typeof operation.messageId !== "number") {
    throw new Error("待提交 operation 尚未完成服务端身份回填");
  }
  return {
    op: operation.op,
    ...(operation.op === "insert" && operation.clientId ? { clientId: operation.clientId } : {}),
    ...(operation.op !== "insert" ? { messageId: operation.messageId } : {}),
    ...(operation.message ? { message: operation.message } : {}),
    ...(typeof operation.position === "number" ? { position: operation.position } : {}),
  };
}

function rewriteOperationIdentity(
  operation: RoomMessageEditOperation,
  localMessageId: number,
  confirmedMessageId: number,
): RoomMessageEditOperation {
  if (getOperationIdentity(operation) !== localMessageId) return operation;
  const message = operation.message
    ? { ...operation.message, messageId: confirmedMessageId, syncId: operation.message.syncId === localMessageId ? confirmedMessageId : operation.message.syncId }
    : undefined;
  return {
    ...operation,
    localMessageId: undefined,
    message,
    messageId: confirmedMessageId,
  };
}

function mergeConfirmedRuntime(current: RoomMessageRuntime, confirmed: Message): RoomMessageRuntime {
  const next = { ...current };
  for (const key of CONFIRMED_RUNTIME_KEYS) {
    if (confirmed[key] !== undefined) Object.assign(next, { [key]: confirmed[key] });
  }
  delete next.tcLocalSyncState;
  delete next.tcMessageEditorDraft;
  return next;
}

function preserveLocalRenderIdentity(current: RoomMessageRuntime | undefined, confirmed: Message): RoomMessageRuntime {
  if (!current?.tcLocalRenderKey) return confirmed;
  return {
    ...confirmed,
    tcLocalRenderKey: current.tcLocalRenderKey,
  };
}

function operationProblemClientIds(operations: readonly RoomMessageEditOperation[]): string[] {
  return operations.flatMap(operation => operation.clientId ? [operation.clientId] : []);
}

function applyEditorTransactionToQuery(
  currentMessages: ChatMessageResponse[],
  previousMessages: ChatMessageResponse[],
  nextMessages: ChatMessageResponse[],
): ChatMessageResponse[] {
  const previousById = new Map(previousMessages.map(item => [item.message.messageId, item.message as RoomMessageRuntime]));
  const nextById = new Map(nextMessages.map(item => [item.message.messageId, item.message as RoomMessageRuntime]));
  const nextResult = currentMessages
    .filter(item => item.message.status !== 1)
    .filter(item => !previousById.has(item.message.messageId) || nextById.has(item.message.messageId))
    .map(item => ({ message: item.message as RoomMessageRuntime }));

  for (const item of nextMessages) {
    const next = item.message as RoomMessageRuntime;
    const previous = previousById.get(next.messageId);
    const currentIndex = nextResult.findIndex(current => current.message.messageId === next.messageId);
    if (currentIndex < 0 || !previous || next.messageId < 0) {
      if (currentIndex < 0) nextResult.push({ message: next });
      else nextResult[currentIndex] = { message: next };
      continue;
    }

    const current = nextResult[currentIndex].message;
    const editableChanged = editableFingerprint(previous) !== editableFingerprint(next);
    const positionChanged = previous.position !== next.position;
    if (!editableChanged && !positionChanged) continue;
    const replacement = { ...current } as RoomMessageRuntime;
    if (editableChanged) {
      for (const key of EDITABLE_MESSAGE_KEYS) {
        Object.assign(replacement, { [key]: next[key] });
      }
    }
    if (positionChanged) replacement.position = next.position;
    nextResult[currentIndex] = { message: replacement };
  }

  return mergeRoomMessages(nextResult);
}

function operationMatchesCurrentMessage(
  operation: RoomMessageEditOperation,
  current: RoomMessageRuntime | undefined,
): boolean {
  if (operation.op === "delete") return current === undefined;
  if (!current) return false;
  const positionMatches = operation.position === undefined || current.position === operation.position;
  if (operation.op === "move") return positionMatches;
  return positionMatches
    && operation.message !== undefined
    && editableFingerprint(current) === editableFingerprint(operation.message);
}

/**
 * 房间消息编辑同步协调器只拥有 revision、压缩 operations、防抖和在途批次。
 * Query 与 SQLite 内容均通过依赖端口读写，不在协调器内保存第二份消息数组。
 */
export class RoomMessageEditSyncCoordinator {
  private activeBatch: { operations: RoomMessageEditOperation[]; revision: number } | null = null;
  private failed = false;
  private generation = 0;
  private operations: RoomMessageEditOperation[] = [];
  private persistedPendingIds = new Set<number>();
  private revision = 0;
  private timer: unknown = null;

  constructor(
    private readonly roomId: number,
    private readonly dependencies: RoomMessageEditSyncDependencies,
    private readonly delayMs = 2000,
  ) {}

  edit(nextMessages: ChatMessageResponse[], previousEditorMessages?: ChatMessageResponse[]): number {
    const currentMessages = this.dependencies.getQueryMessages().filter(item => item.message.status !== 1);
    const previousMessages = previousEditorMessages ?? currentMessages;
    this.dependencies.replaceQueryMessages(current => applyEditorTransactionToQuery(
      current,
      previousMessages,
      nextMessages,
    ));
    this.revision += 1;
    this.operations = compactRoomMessageEditOperations(
      this.operations,
      deriveRoomMessageEditOperations(previousMessages, nextMessages),
    );
    this.failed = false;
    this.publishProtection();
    void this.rollbackCancelledPendingMessages();
    if (this.operations.length === 0 && !this.activeBatch) {
      this.clearTimer();
      this.publishStatus("clean", "idle");
      return this.revision;
    }
    this.publishStatus("syncing", "editing");
    this.schedule(this.delayMs);
    return this.revision;
  }

  getPendingOperations(): readonly RoomMessageEditOperation[] {
    return this.operations;
  }

  async flush(): Promise<void> {
    if (this.activeBatch || this.operations.length === 0) return;
    const flushGeneration = this.generation;
    this.clearTimer();
    const batch = { operations: this.operations, revision: this.revision };
    this.operations = [];
    this.activeBatch = batch;
    this.publishProtection();
    this.publishStatus("syncing", "cloudSaving");

    let responseAccepted = false;
    try {
      const pendingMessages = batch.operations.flatMap(operation => (
        operation.op === "insert" && operation.message && typeof operation.localMessageId === "number"
          ? [{ message: operation.message } satisfies ChatMessageResponse]
          : []
      ));
      if (pendingMessages.length > 0) {
        await this.dependencies.addPendingMessages(pendingMessages);
        if (flushGeneration !== this.generation) {
          await this.dependencies.rollbackPendingMessages(pendingMessages.map(item => item.message.messageId));
          return;
        }
        for (const pending of pendingMessages) {
          this.persistedPendingIds.add(pending.message.messageId);
        }
      }

      const changedMessages = await this.dependencies.patch(batch.operations.map(toRemoteOperation));
      if (flushGeneration !== this.generation) return;
      this.validateResponseOrder(batch.operations, changedMessages);
      responseAccepted = true;
      const preparedMessages = changedMessages.map((message, index) => (
        this.dependencies.prepareConfirmedMessage?.(message, batch.operations[index].message) ?? message
      ));
      const idMappings = this.rewriteConfirmedInsertIdentities(batch.operations, preparedMessages);
      if (flushGeneration !== this.generation) return;
      await this.persistConfirmedBatch(batch.operations, preparedMessages).catch((error) => {
        this.dependencies.onPersistenceError?.(error);
      });
      if (flushGeneration !== this.generation) return;
      this.reconcileQuery(
        batch.operations,
        preparedMessages,
        idMappings,
        this.revision > batch.revision,
      );
      this.failed = false;
    }
    catch (error) {
      if (flushGeneration !== this.generation) return;
      if (!responseAccepted) {
        this.operations = compactRoomMessageEditOperations(batch.operations, this.operations);
      }
      this.failed = true;
      this.publishStatus("error", "error", operationProblemClientIds(batch.operations));
      throw error;
    }
    finally {
      if (flushGeneration === this.generation) {
        this.activeBatch = null;
        this.publishProtection();
        await this.rollbackCancelledPendingMessages();
      }
    }

    if (flushGeneration !== this.generation) return;
    if (this.operations.length > 0) {
      this.publishStatus("syncing", "editing");
      this.schedule(this.delayMs);
    }
    else {
      this.publishStatus("clean", "synced");
    }
  }

  reset(): void {
    this.generation += 1;
    this.clearTimer();
    this.activeBatch = null;
    this.failed = false;
    this.operations = [];
    const pendingIds = [...this.persistedPendingIds];
    this.persistedPendingIds.clear();
    if (pendingIds.length > 0) {
      void this.dependencies.rollbackPendingMessages(pendingIds).catch((error) => {
        this.dependencies.onPersistenceError?.(error);
      });
    }
    this.dependencies.setProtection({ deletedMessageIds: new Set(), dirtyMessageIds: new Set() });
    this.publishStatus("clean", "idle");
  }

  private schedule(delayMs: number): void {
    if (this.failed || this.activeBatch || this.operations.length === 0) return;
    this.clearTimer();
    this.timer = this.dependencies.scheduler.schedule(() => {
      this.timer = null;
      void this.flush().catch((error) => {
        console.error("[room-message-edit] patch failed", error);
      });
    }, delayMs);
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    this.dependencies.scheduler.clear(this.timer);
    this.timer = null;
  }

  private validateResponseOrder(operations: RoomMessageEditOperation[], messages: Message[]): void {
    if (messages.length !== operations.length) {
      throw new Error("房间消息变更响应数量不匹配");
    }
    const confirmedIds = new Set<number>();
    operations.forEach((operation, index) => {
      const confirmed = messages[index];
      if (!Number.isInteger(confirmed.messageId) || confirmed.messageId <= 0) {
        throw new Error("房间消息变更响应缺少有效身份");
      }
      if (confirmed.roomId !== this.roomId) {
        throw new Error("房间消息变更响应房间不匹配");
      }
      if (confirmedIds.has(confirmed.messageId)) {
        throw new Error("房间消息变更响应身份重复");
      }
      confirmedIds.add(confirmed.messageId);
      if (operation.op !== "insert" && confirmed.messageId !== operation.messageId) {
        throw new Error("房间消息变更响应身份不匹配");
      }
    });
  }

  private rewriteConfirmedInsertIdentities(operations: RoomMessageEditOperation[], messages: Message[]) {
    const mappings = new Map<number, number>();
    operations.forEach((operation, index) => {
      if (operation.op !== "insert" || typeof operation.localMessageId !== "number") return;
      const confirmedMessageId = messages[index].messageId;
      if (!Number.isInteger(confirmedMessageId) || confirmedMessageId <= 0) {
        throw new Error("插入消息响应缺少服务端身份");
      }
      mappings.set(operation.localMessageId, confirmedMessageId);
      this.dependencies.registerMessageAlias(operation.localMessageId, confirmedMessageId);
      this.operations = this.operations.map(item => rewriteOperationIdentity(
        item,
        operation.localMessageId!,
        confirmedMessageId,
      ));
    });
    return mappings;
  }

  private async persistConfirmedBatch(operations: RoomMessageEditOperation[], messages: Message[]): Promise<void> {
    const confirmedToUpsert: ChatMessageResponse[] = [];
    for (let index = 0; index < operations.length; index += 1) {
      const operation = operations[index];
      const confirmed = { message: messages[index] } satisfies ChatMessageResponse;
      if (operation.op === "insert" && typeof operation.localMessageId === "number") {
        await this.dependencies.promotePendingMessage(operation.localMessageId, confirmed);
        this.persistedPendingIds.delete(operation.localMessageId);
      }
      else {
        confirmedToUpsert.push(confirmed);
      }
    }
    if (confirmedToUpsert.length > 0) {
      await this.dependencies.replaceConfirmedMessages(confirmedToUpsert);
    }
  }

  private reconcileQuery(
    operations: RoomMessageEditOperation[],
    messages: Message[],
    idMappings: ReadonlyMap<number, number>,
    hasNewerRevision: boolean,
  ): void {
    this.dependencies.replaceQueryMessages((currentMessages) => {
      let nextMessages = [...currentMessages];
      operations.forEach((operation, index) => {
        const confirmed = messages[index];
        const localMessageId = operation.localMessageId;
        const confirmedMessageId = confirmed.messageId;
        const pendingOperation = this.operations.find((item) => {
          const identity = getOperationIdentity(item);
          return identity === confirmedMessageId || (localMessageId !== undefined && identity === localMessageId);
        });
        const pendingDelete = pendingOperation?.op === "delete";
        const currentIndex = nextMessages.findIndex((item) => {
          const messageId = item.message.messageId;
          return messageId === confirmedMessageId || (localMessageId !== undefined && messageId === localMessageId);
        });
        const current = currentIndex >= 0
          ? nextMessages[currentIndex].message as RoomMessageRuntime
          : undefined;
        const wasSuperseded = hasNewerRevision || !operationMatchesCurrentMessage(operation, current);

        if (pendingDelete || (wasSuperseded && !current)) {
          nextMessages = nextMessages.filter(item => (
            item.message.messageId !== confirmedMessageId
            && (localMessageId === undefined || item.message.messageId !== localMessageId)
          ));
          return;
        }

        let nextMessage = (pendingOperation || wasSuperseded) && current
          ? mergeConfirmedRuntime(current, confirmed)
          : preserveLocalRenderIdentity(current, confirmed);
        if (localMessageId !== undefined && idMappings.has(localMessageId)) {
          nextMessage = { ...nextMessage, messageId: idMappings.get(localMessageId)! };
        }
        if (currentIndex >= 0) nextMessages[currentIndex] = { message: nextMessage };
        else nextMessages.push({ message: nextMessage });
        nextMessages = nextMessages.filter((item, itemIndex) => (
          itemIndex === (currentIndex >= 0 ? currentIndex : nextMessages.length - 1)
          || (
            item.message.messageId !== nextMessage.messageId
            && (localMessageId === undefined || item.message.messageId !== localMessageId)
          )
        ));
      });
      return mergeRoomMessages(nextMessages);
    });
  }

  private publishProtection(): void {
    const activeOperations = [...(this.activeBatch?.operations ?? []), ...this.operations];
    const dirtyMessageIds = new Set<number>();
    const deletedMessageIds = new Set<number>();
    for (const operation of activeOperations) {
      const identity = getOperationIdentity(operation);
      if (identity === undefined) continue;
      dirtyMessageIds.add(identity);
      if (operation.op === "delete") deletedMessageIds.add(identity);
    }
    this.dependencies.setProtection({ deletedMessageIds, dirtyMessageIds });
  }

  private async rollbackCancelledPendingMessages(): Promise<void> {
    if (this.persistedPendingIds.size === 0) return;
    const referencedIds = new Set(
      [...(this.activeBatch?.operations ?? []), ...this.operations]
        .flatMap(operation => typeof operation.localMessageId === "number" ? [operation.localMessageId] : []),
    );
    const cancelledIds = [...this.persistedPendingIds].filter(messageId => !referencedIds.has(messageId));
    if (cancelledIds.length === 0) return;
    for (const messageId of cancelledIds) this.persistedPendingIds.delete(messageId);
    try {
      await this.dependencies.rollbackPendingMessages(cancelledIds);
    }
    catch (error) {
      for (const messageId of cancelledIds) this.persistedPendingIds.add(messageId);
      this.dependencies.onPersistenceError?.(error);
    }
  }

  private publishStatus(
    state: RoomMessageEditSyncStatus["state"],
    phase: RoomMessageEditSyncStatus["phase"],
    problemClientIds: readonly string[] = [],
  ): void {
    this.dependencies.onStatus({ phase, problemClientIds, state });
  }
}

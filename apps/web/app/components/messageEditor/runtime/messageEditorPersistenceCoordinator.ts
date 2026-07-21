import type { Message } from "../../../../api";
import type { MessageEditorMessage } from "../messageEditorTypes";
import type {
  MessageEditorPersistenceChangeSet,
  MessageEditorPersistenceCommitPlan,
} from "../model/messageEditorPersistencePolicy";

import {
  getMessageEditorSnapshotFingerprint,
  mergeChangedRoomMessageRuntimeIntoEditorMessages,
  resolveMessageEditorPersistenceCommitPlan,
  shouldSkipMessageEditorRoomStreamPersistence,
} from "../model/messageEditorPersistencePolicy";
import {
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  inheritMessageEditorRuntimeBlockId,
} from "../model/messageEditorTransforms";

export type MessageEditorPersistenceContext = {
  docId?: string;
  isRoomDocument: boolean;
  readOnly: boolean;
  ready: boolean;
  roomId?: number;
  shouldUseLocalSnapshot: boolean;
};

export type MessageEditorSaveTransaction = {
  baselineMessages: MessageEditorMessage[];
  generation: number;
  plan: MessageEditorPersistenceCommitPlan;
  submittedRevision: number;
  submittedMessages: MessageEditorMessage[];
};

export type MessageEditorSaveStartResult =
  | { kind: "deferred" }
  | { kind: "skipped"; reason: "empty-room" | "unchanged" }
  | { kind: "started"; transaction: MessageEditorSaveTransaction };

export type MessageEditorPersistenceSaveResult = {
  changedMessages?: Message[];
  operations?: Extract<MessageEditorPersistenceCommitPlan, { kind: "remote" }>["operations"];
  savedMessages: MessageEditorMessage[];
};

type MessageEditorDocumentIndex = {
  byBlockId: Map<string, MessageEditorMessage>;
  indexByBlockId: Map<string, number>;
};

function createMessageEditorDocumentIndex(messages: MessageEditorMessage[]): MessageEditorDocumentIndex {
  const byBlockId = new Map<string, MessageEditorMessage>();
  const indexByBlockId = new Map<string, number>();
  messages.forEach((message, index) => {
    const blockId = getMessageEditorBlockId(message);
    byBlockId.set(blockId, message);
    indexByBlockId.set(blockId, index);
  });
  return { byBlockId, indexByBlockId };
}

/**
 * MessageEditor 持久化事务协调器。
 *
 * 该对象只维护 baseline、dirty、generation 与 deferred-save 不变量；具体本地或
 * 远端 IO 由 persistence strategy 执行。
 */
export class MessageEditorPersistenceCoordinator {
  private activeGeneration: number | null = null;
  private baselineByBlockId: Map<string, MessageEditorMessage>;
  private baselineMessages: MessageEditorMessage[];
  private dirtyRevisionByBlockId = new Map<string, number>();
  private documentRevision = 0;
  private fullDiffRevision = 0;
  private generation = 0;
  private pendingSaveAfterActive = false;
  private structureRevision = 0;

  constructor(initialMessages: MessageEditorMessage[]) {
    this.baselineMessages = ensureMessageEditorMessages(initialMessages);
    this.baselineByBlockId = createMessageEditorDocumentIndex(this.baselineMessages).byBlockId;
  }

  acceptPersistedSnapshot(messages: MessageEditorMessage[]) {
    const normalizedMessages = ensureMessageEditorMessages(messages);
    this.baselineMessages = normalizedMessages;
    this.baselineByBlockId = createMessageEditorDocumentIndex(normalizedMessages).byBlockId;
    this.clearChangeJournal();
    return normalizedMessages;
  }

  /**
   * 将共享 chatHistory 中已确认的非 dirty 消息推进到 baseline。
   *
   * dirty 块仍保留保存前快照；结构修改期间也保留既有 position，避免本地移动
   * 被提前吸收到 baseline。保存进行中由完成事务统一对账，不在这里改写基线。
   */
  rebasePersistedSnapshot(messages: MessageEditorMessage[]) {
    if (this.activeGeneration !== null) {
      return false;
    }

    const normalizedMessages = ensureMessageEditorMessages(messages);
    if (!this.hasJournalChanges()) {
      this.baselineMessages = normalizedMessages;
      this.baselineByBlockId = createMessageEditorDocumentIndex(normalizedMessages).byBlockId;
      return true;
    }

    const currentIndex = createMessageEditorDocumentIndex(normalizedMessages);
    const dirtyBlockIds = this.getDirtyBlockIds(currentIndex.byBlockId);
    const dirtyMessageIds = this.getDirtyMessageIdsFromIndexes(dirtyBlockIds, currentIndex.byBlockId);
    const baselineByMessageId = new Map<number, MessageEditorMessage>();
    this.baselineMessages.forEach((message) => {
      const messageId = getRuntimeMessageId(message);
      if (messageId !== undefined) {
        baselineByMessageId.set(messageId, message);
      }
    });

    const retainedDirtyBaselineBlocks = new Set<string>();
    const rebasedMessages: MessageEditorMessage[] = [];
    normalizedMessages.forEach((message) => {
      const blockId = getMessageEditorBlockId(message);
      const messageId = getRuntimeMessageId(message);
      const baseline = this.baselineByBlockId.get(blockId)
        ?? (messageId !== undefined ? baselineByMessageId.get(messageId) : undefined);
      const isDirty = dirtyBlockIds.has(blockId)
        || (messageId !== undefined && dirtyMessageIds.has(messageId));
      if (isDirty) {
        if (baseline) {
          retainedDirtyBaselineBlocks.add(getMessageEditorBlockId(baseline));
          rebasedMessages.push(baseline);
        }
        return;
      }

      if (this.structureRevision > 0 && baseline && typeof baseline.position === "number") {
        rebasedMessages.push(inheritMessageEditorRuntimeBlockId(message, {
          ...message,
          position: baseline.position,
        }));
        return;
      }
      rebasedMessages.push(message);
    });

    this.baselineMessages.forEach((message) => {
      const blockId = getMessageEditorBlockId(message);
      const messageId = getRuntimeMessageId(message);
      const isDirty = dirtyBlockIds.has(blockId)
        || (messageId !== undefined && dirtyMessageIds.has(messageId));
      if (isDirty && !retainedDirtyBaselineBlocks.has(blockId)) {
        rebasedMessages.push(message);
      }
    });

    this.baselineMessages = rebasedMessages;
    this.baselineByBlockId = createMessageEditorDocumentIndex(rebasedMessages).byBlockId;
    return true;
  }

  markDocumentChanged(
    messages: MessageEditorMessage[],
    ready: boolean,
    options: {
      changedBlockIds?: readonly string[];
      compareImmediately?: boolean;
      structureChanged?: boolean;
    } = {},
  ) {
    if (!ready) {
      return messages;
    }

    this.documentRevision += 1;
    const hasChangeMetadata = options.changedBlockIds !== undefined
      && options.structureChanged !== undefined
      && (options.structureChanged || options.changedBlockIds.length > 0);
    if (!hasChangeMetadata) {
      const changed = options.compareImmediately
        ? getMessageEditorSnapshotFingerprint(messages) !== this.getBaselineFingerprint()
        : true;
      if (!changed) {
        this.clearChangeJournal();
      }
      else {
        this.fullDiffRevision = this.documentRevision;
      }
      return messages;
    }

    for (const blockId of options.changedBlockIds!) {
      this.dirtyRevisionByBlockId.set(blockId, this.documentRevision);
    }
    if (options.structureChanged) {
      this.structureRevision = this.documentRevision;
    }
    return messages;
  }

  hasDirtyChanges() {
    return this.hasJournalChanges();
  }

  /** 返回需要在共享 chatHistory 中保持本地优先的消息 ID。 */
  getDirtyMessageIds(currentMessages: MessageEditorMessage[]) {
    const currentByBlockId = createMessageEditorDocumentIndex(currentMessages).byBlockId;
    return this.getDirtyMessageIdsFromIndexes(this.getDirtyBlockIds(currentByBlockId), currentByBlockId);
  }

  isGenerationActive(generation: number) {
    return this.activeGeneration === generation && this.generation === generation;
  }

  shouldScheduleSave(context: MessageEditorPersistenceContext) {
    return context.ready
      && !context.readOnly
      && Boolean(context.docId)
      && this.hasJournalChanges();
  }

  beginSave(currentMessages: MessageEditorMessage[], context: MessageEditorPersistenceContext): MessageEditorSaveStartResult {
    if (!this.shouldScheduleSave(context)) {
      return { kind: "skipped", reason: "unchanged" };
    }
    if (this.activeGeneration !== null) {
      this.pendingSaveAfterActive = true;
      return { kind: "deferred" };
    }

    const submittedMessages = currentMessages;
    if (this.fullDiffRevision > 0) {
      const submittedFingerprint = getMessageEditorSnapshotFingerprint(submittedMessages);
      if (submittedFingerprint === this.getBaselineFingerprint()) {
        this.clearChangeJournal();
        return { kind: "skipped", reason: "unchanged" };
      }
    }
    if (shouldSkipMessageEditorRoomStreamPersistence({
      isRoomDocument: context.isRoomDocument,
      messages: submittedMessages,
      roomId: context.roomId,
    })) {
      return { kind: "skipped", reason: "empty-room" };
    }

    const changeSet = this.createChangeSet(submittedMessages);
    const plan = resolveMessageEditorPersistenceCommitPlan({
      baselineMessages: this.baselineMessages,
      changeSet,
      docId: context.docId,
      isRoomDocument: context.isRoomDocument,
      messages: submittedMessages,
      roomId: context.roomId,
      shouldUseLocalSnapshot: context.shouldUseLocalSnapshot,
    });
    if (plan.kind === "remote" && plan.operations.length === 0) {
      const submittedFingerprint = getMessageEditorSnapshotFingerprint(submittedMessages);
      if (submittedFingerprint === this.getBaselineFingerprint()) {
        this.clearChangeJournal();
        return { kind: "skipped", reason: "unchanged" };
      }
    }

    const generation = this.generation + 1;
    this.generation = generation;
    this.activeGeneration = generation;
    return {
      kind: "started",
      transaction: {
        baselineMessages: this.baselineMessages,
        generation,
        plan,
        submittedRevision: this.documentRevision,
        submittedMessages,
      },
    };
  }

  completeSave(
    transaction: MessageEditorSaveTransaction,
    result: MessageEditorPersistenceSaveResult,
    currentMessages: MessageEditorMessage[],
  ) {
    if (!this.isGenerationActive(transaction.generation)) {
      return null;
    }

    const currentChangedAfterSubmit = this.documentRevision > transaction.submittedRevision;
    const reconciledCurrentMessages = currentChangedAfterSubmit
      && result.changedMessages
      && result.operations
      ? mergeChangedRoomMessageRuntimeIntoEditorMessages({
          changedMessages: result.changedMessages,
          currentMessages,
          operations: result.operations,
        })
      : currentMessages;
    const savedMessages = ensureMessageEditorMessages(result.savedMessages);
    const nextMessages = currentChangedAfterSubmit ? reconciledCurrentMessages : savedMessages;
    const savedFingerprint = getMessageEditorSnapshotFingerprint(savedMessages);

    this.baselineMessages = savedMessages;
    this.baselineByBlockId = createMessageEditorDocumentIndex(savedMessages).byBlockId;
    this.pruneSubmittedChanges(transaction.submittedRevision);
    return {
      currentChangedAfterSubmit,
      dirtySinceSave: this.hasJournalChanges(),
      nextMessages,
      savedFingerprint,
      savedMessages,
    };
  }

  finishSave(transaction: MessageEditorSaveTransaction) {
    if (!this.isGenerationActive(transaction.generation)) {
      return false;
    }
    this.activeGeneration = null;
    const shouldRequestDeferredSave = this.pendingSaveAfterActive && this.hasJournalChanges();
    this.pendingSaveAfterActive = false;
    return shouldRequestDeferredSave;
  }

  private clearChangeJournal() {
    this.dirtyRevisionByBlockId.clear();
    this.fullDiffRevision = 0;
    this.structureRevision = 0;
  }

  private createChangeSet(currentMessages: MessageEditorMessage[]): MessageEditorPersistenceChangeSet | undefined {
    if (this.fullDiffRevision > 0) {
      return undefined;
    }
    const currentIndex = createMessageEditorDocumentIndex(currentMessages);
    return {
      baselineByBlockId: this.baselineByBlockId,
      currentByBlockId: currentIndex.byBlockId,
      currentIndexByBlockId: currentIndex.indexByBlockId,
      dirtyBlockIds: new Set(this.dirtyRevisionByBlockId.keys()),
      structureChanged: this.structureRevision > 0,
    };
  }

  private hasJournalChanges() {
    return this.fullDiffRevision > 0
      || this.structureRevision > 0
      || this.dirtyRevisionByBlockId.size > 0;
  }

  private pruneSubmittedChanges(submittedRevision: number) {
    for (const [blockId, revision] of this.dirtyRevisionByBlockId) {
      if (revision <= submittedRevision) {
        this.dirtyRevisionByBlockId.delete(blockId);
      }
    }
    if (this.fullDiffRevision <= submittedRevision) {
      this.fullDiffRevision = 0;
    }
    if (this.structureRevision <= submittedRevision) {
      this.structureRevision = 0;
    }
  }

  private getBaselineFingerprint() {
    return getMessageEditorSnapshotFingerprint(this.baselineMessages);
  }

  private getDirtyBlockIds(currentByBlockId: ReadonlyMap<string, MessageEditorMessage>) {
    return this.fullDiffRevision > 0
      ? new Set([...this.baselineByBlockId.keys(), ...currentByBlockId.keys()])
      : new Set(this.dirtyRevisionByBlockId.keys());
  }

  private getDirtyMessageIdsFromIndexes(
    dirtyBlockIds: ReadonlySet<string>,
    currentByBlockId: ReadonlyMap<string, MessageEditorMessage>,
  ) {
    const dirtyMessageIds = new Set<number>();
    for (const blockId of dirtyBlockIds) {
      const message = currentByBlockId.get(blockId) ?? this.baselineByBlockId.get(blockId);
      const messageId = message?.messageId;
      if (typeof messageId === "number" && Number.isFinite(messageId)) {
        dirtyMessageIds.add(messageId);
      }
    }
    return dirtyMessageIds;
  }
}

function getRuntimeMessageId(message: MessageEditorMessage) {
  const messageId = message.messageId;
  return typeof messageId === "number" && Number.isFinite(messageId)
    ? messageId
    : undefined;
}

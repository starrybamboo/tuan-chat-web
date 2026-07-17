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
  private currentByBlockId: Map<string, MessageEditorMessage>;
  private currentIndexByBlockId: Map<string, number>;
  private dirtySinceLoad = false;
  private dirtyRevisionByBlockId = new Map<string, number>();
  private documentRevision = 0;
  private fullDiffRevision = 0;
  private generation = 0;
  private lastSavedFingerprint: string;
  private pendingSaveAfterActive = false;
  private structureRevision = 0;

  constructor(initialMessages: MessageEditorMessage[]) {
    this.baselineMessages = ensureMessageEditorMessages(initialMessages);
    const initialIndex = createMessageEditorDocumentIndex(this.baselineMessages);
    this.baselineByBlockId = initialIndex.byBlockId;
    this.currentByBlockId = new Map(initialIndex.byBlockId);
    this.currentIndexByBlockId = new Map(initialIndex.indexByBlockId);
    this.lastSavedFingerprint = getMessageEditorSnapshotFingerprint(this.baselineMessages);
  }

  acceptPersistedSnapshot(messages: MessageEditorMessage[]) {
    const normalizedMessages = ensureMessageEditorMessages(messages);
    this.baselineMessages = normalizedMessages;
    const nextIndex = createMessageEditorDocumentIndex(normalizedMessages);
    this.baselineByBlockId = nextIndex.byBlockId;
    this.currentByBlockId = new Map(nextIndex.byBlockId);
    this.currentIndexByBlockId = new Map(nextIndex.indexByBlockId);
    this.lastSavedFingerprint = getMessageEditorSnapshotFingerprint(normalizedMessages);
    this.clearChangeJournal();
    this.dirtySinceLoad = false;
    return normalizedMessages;
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
      this.replaceCurrentIndex(messages);
      const changed = options.compareImmediately
        ? getMessageEditorSnapshotFingerprint(messages) !== this.lastSavedFingerprint
        : true;
      if (!changed) {
        this.clearChangeJournal();
      }
      else {
        this.fullDiffRevision = this.documentRevision;
      }
      this.dirtySinceLoad = changed;
      return messages;
    }

    this.updateCurrentIndex(messages, options.changedBlockIds!, options.structureChanged!);
    for (const blockId of options.changedBlockIds!) {
      this.dirtyRevisionByBlockId.set(blockId, this.documentRevision);
    }
    if (options.structureChanged) {
      this.structureRevision = this.documentRevision;
    }
    this.dirtySinceLoad = this.hasJournalChanges();
    return messages;
  }

  hasDirtyChanges() {
    return this.dirtySinceLoad;
  }

  isSaveActive() {
    return this.activeGeneration !== null;
  }

  isGenerationActive(generation: number) {
    return this.activeGeneration === generation && this.generation === generation;
  }

  shouldScheduleSave(context: MessageEditorPersistenceContext) {
    return context.ready
      && !context.readOnly
      && Boolean(context.docId)
      && this.dirtySinceLoad;
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
      if (submittedFingerprint === this.lastSavedFingerprint) {
        this.clearChangeJournal();
        this.dirtySinceLoad = false;
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

    const changeSet = this.createChangeSet();
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
      if (submittedFingerprint === this.lastSavedFingerprint) {
        this.clearChangeJournal();
        this.dirtySinceLoad = false;
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
    this.lastSavedFingerprint = savedFingerprint;
    this.pruneSubmittedChanges(transaction.submittedRevision);
    this.replaceCurrentIndex(nextMessages);
    this.dirtySinceLoad = this.hasJournalChanges();
    return {
      currentChangedAfterSubmit,
      dirtySinceSave: this.dirtySinceLoad,
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
    const shouldRequestDeferredSave = this.pendingSaveAfterActive && this.dirtySinceLoad;
    this.pendingSaveAfterActive = false;
    return shouldRequestDeferredSave;
  }

  private clearChangeJournal() {
    this.dirtyRevisionByBlockId.clear();
    this.fullDiffRevision = 0;
    this.structureRevision = 0;
  }

  private createChangeSet(): MessageEditorPersistenceChangeSet | undefined {
    if (this.fullDiffRevision > 0) {
      return undefined;
    }
    return {
      baselineByBlockId: this.baselineByBlockId,
      currentByBlockId: this.currentByBlockId,
      currentIndexByBlockId: this.currentIndexByBlockId,
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

  private replaceCurrentIndex(messages: MessageEditorMessage[]) {
    const nextIndex = createMessageEditorDocumentIndex(messages);
    this.currentByBlockId = nextIndex.byBlockId;
    this.currentIndexByBlockId = nextIndex.indexByBlockId;
  }

  private updateCurrentIndex(
    messages: MessageEditorMessage[],
    changedBlockIds: readonly string[],
    structureChanged: boolean,
  ) {
    if (structureChanged) {
      this.replaceCurrentIndex(messages);
      return;
    }

    for (const blockId of changedBlockIds) {
      const index = this.currentIndexByBlockId.get(blockId);
      const message = index === undefined ? undefined : messages[index];
      if (!message || getMessageEditorBlockId(message) !== blockId) {
        this.replaceCurrentIndex(messages);
        return;
      }
      this.currentByBlockId.set(blockId, message);
    }
  }
}

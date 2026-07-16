import type { Message } from "../../../../api";
import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorPersistenceCommitPlan } from "../model/messageEditorPersistencePolicy";

import {
  getMessageEditorSnapshotFingerprint,
  mergeChangedRoomMessageRuntimeIntoEditorMessages,
  resolveMessageEditorCompletedSaveState,
  resolveMessageEditorPersistenceCommitPlan,
  shouldSkipMessageEditorRoomStreamPersistence,
} from "../model/messageEditorPersistencePolicy";
import { ensureMessageEditorMessages } from "../model/messageEditorTransforms";

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

/**
 * MessageEditor 持久化事务协调器。
 *
 * 该对象只维护 baseline、dirty、generation 与 deferred-save 不变量；具体本地或
 * 远端 IO 由 persistence strategy 执行。
 */
export class MessageEditorPersistenceCoordinator {
  private activeGeneration: number | null = null;
  private baselineMessages: MessageEditorMessage[];
  private dirtySinceLoad = false;
  private generation = 0;
  private lastSavedFingerprint: string;
  private pendingSaveAfterActive = false;

  constructor(initialMessages: MessageEditorMessage[]) {
    this.baselineMessages = ensureMessageEditorMessages(initialMessages);
    this.lastSavedFingerprint = getMessageEditorSnapshotFingerprint(this.baselineMessages);
  }

  acceptPersistedSnapshot(messages: MessageEditorMessage[]) {
    const normalizedMessages = ensureMessageEditorMessages(messages);
    this.baselineMessages = normalizedMessages;
    this.lastSavedFingerprint = getMessageEditorSnapshotFingerprint(normalizedMessages);
    this.dirtySinceLoad = false;
    return normalizedMessages;
  }

  markDocumentChanged(
    messages: MessageEditorMessage[],
    ready: boolean,
    options: { compareImmediately?: boolean } = {},
  ) {
    if (ready) {
      this.dirtySinceLoad = options.compareImmediately
        ? getMessageEditorSnapshotFingerprint(messages) !== this.lastSavedFingerprint
        : true;
    }
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
    const submittedMessages = ensureMessageEditorMessages(currentMessages);
    if (!this.shouldScheduleSave(context)) {
      return { kind: "skipped", reason: "unchanged" };
    }
    const submittedFingerprint = getMessageEditorSnapshotFingerprint(submittedMessages);
    if (submittedFingerprint === this.lastSavedFingerprint) {
      this.dirtySinceLoad = false;
      return { kind: "skipped", reason: "unchanged" };
    }
    if (shouldSkipMessageEditorRoomStreamPersistence({
      isRoomDocument: context.isRoomDocument,
      messages: submittedMessages,
      roomId: context.roomId,
    })) {
      return { kind: "skipped", reason: "empty-room" };
    }
    if (this.activeGeneration !== null) {
      this.pendingSaveAfterActive = true;
      return { kind: "deferred" };
    }

    const generation = this.generation + 1;
    this.generation = generation;
    this.activeGeneration = generation;
    return {
      kind: "started",
      transaction: {
        baselineMessages: ensureMessageEditorMessages(this.baselineMessages),
        generation,
        plan: resolveMessageEditorPersistenceCommitPlan({
          baselineMessages: this.baselineMessages,
          docId: context.docId,
          isRoomDocument: context.isRoomDocument,
          messages: submittedMessages,
          roomId: context.roomId,
          shouldUseLocalSnapshot: context.shouldUseLocalSnapshot,
        }),
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

    const preliminaryState = resolveMessageEditorCompletedSaveState({
      currentMessages,
      savedMessages: result.savedMessages,
      submittedMessages: transaction.submittedMessages,
    });
    const reconciledCurrentMessages = preliminaryState.currentChangedAfterSubmit
      && result.changedMessages
      && result.operations
      ? mergeChangedRoomMessageRuntimeIntoEditorMessages({
          changedMessages: result.changedMessages,
          currentMessages,
          operations: result.operations,
        })
      : currentMessages;
    const completedState = resolveMessageEditorCompletedSaveState({
      currentMessages: reconciledCurrentMessages,
      savedMessages: result.savedMessages,
      submittedMessages: transaction.submittedMessages,
    });

    this.baselineMessages = completedState.savedMessages;
    this.lastSavedFingerprint = completedState.savedFingerprint;
    this.dirtySinceLoad = completedState.dirtySinceSave;
    return completedState;
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
}

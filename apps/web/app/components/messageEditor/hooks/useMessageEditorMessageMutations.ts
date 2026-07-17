import type { MutableRefObject } from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Message } from "../../../../api";
import type { MessageEditorMessage, MessageEditorSaveState } from "../messageEditorTypes";
import type { MessageEditorRemotePatchSourceSurface } from "../model/messageEditorPersistencePolicy";
import type { MessageEditorEditTransaction } from "../runtime/messageEditorActions";
import type {
  MessageEditorHistoryEntry,
  MessageEditorHistoryManager,
} from "../runtime/messageEditorHistoryManager";
import type {
  MessageEditorPersistenceContext,
  MessageEditorSaveTransaction,
} from "../runtime/messageEditorPersistenceCoordinator";

import {
  reconcileMessageEditorRuntimeBlockIds,
  resolveMessageEditorPersistenceDelayMs,
} from "../model/messageEditorPersistencePolicy";
import { ensureMessageEditorMessages } from "../model/messageEditorTransforms";
import { MessageEditorPersistenceCoordinator } from "../runtime/messageEditorPersistenceCoordinator";
import {
  executeMessageEditorPersistenceStrategy,
  loadMessageEditorPersistedSnapshot,
} from "../runtime/messageEditorPersistenceStrategies";

type MessageEditorMessageMutationsParams = {
  createHistoryEntry: (messages: MessageEditorMessage[]) => MessageEditorHistoryEntry;
  docId?: string;
  historyManager: MessageEditorHistoryManager;
  initialMessages: MessageEditorMessage[];
  isRoomDocument: boolean;
  onRemoteMessagesSaved?: (messages: Message[]) => void | Promise<void>;
  readOnly: boolean;
  ready: boolean;
  remotePatchSourceSurface: MessageEditorRemotePatchSourceSurface;
  roomId?: number;
  shouldUseLocalSnapshot: boolean;
};

type CommitDocumentSnapshotOptions = {
  preserveRuntimeBlockIds?: boolean;
  updateState?: boolean;
};

type RunSaveTransactionOptions = {
  persistenceIdentity: string;
  updateEditorState: boolean;
};

type MessageEditorMessageMutationsResult = {
  acceptPersistedSnapshot: (
    messages: MessageEditorMessage[],
    options?: CommitDocumentSnapshotOptions,
  ) => MessageEditorMessage[];
  commitTransaction: <T>(transaction: MessageEditorEditTransaction<T>) => T;
  getCurrentMessages: () => MessageEditorMessage[];
  hasDirtyChanges: () => boolean;
  isRemoteSaveActive: () => boolean;
  loadPersistedSnapshot: (seededInitialMessages: MessageEditorMessage[]) => Promise<MessageEditorMessage[]>;
  messages: MessageEditorMessage[];
  messagesRef: MutableRefObject<MessageEditorMessage[]>;
  resetSaveState: () => void;
  restoreSnapshot: (messages: MessageEditorMessage[]) => MessageEditorMessage[];
  saveState: MessageEditorSaveState;
};

/**
 * MessageEditor 的消息操作门面。
 *
 * 编辑事务仍由调用方声明；持久化 lifecycle 交给 coordinator，local/room IO 与
 * 乐观缓存补偿交给 strategy，组件本身不感知存储目标和批处理细节。
 */
export default function useMessageEditorMessageMutations({
  createHistoryEntry,
  docId,
  historyManager,
  initialMessages,
  isRoomDocument,
  onRemoteMessagesSaved,
  readOnly,
  ready,
  remotePatchSourceSurface,
  roomId,
  shouldUseLocalSnapshot,
}: MessageEditorMessageMutationsParams): MessageEditorMessageMutationsResult {
  const initialMessagesRef = useRef<MessageEditorMessage[] | null>(null);
  if (!initialMessagesRef.current) {
    initialMessagesRef.current = ensureMessageEditorMessages(initialMessages);
  }
  const [messages, setMessages] = useState<MessageEditorMessage[]>(() => initialMessagesRef.current!);
  const [saveRequestRevision, requestDeferredSave] = useState(0);
  const [saveState, setSaveState] = useState<MessageEditorSaveState>("idle");
  const activeSavePromiseRef = useRef<Promise<void> | null>(null);
  const persistenceIdentityRef = useRef<string | null>(null);
  const persistenceIdentityRevisionRef = useRef(0);
  const mountedRef = useRef(false);
  const messagesRef = useRef<MessageEditorMessage[]>(initialMessagesRef.current);
  const coordinatorRef = useRef<MessageEditorPersistenceCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new MessageEditorPersistenceCoordinator(initialMessagesRef.current);
  }
  const coordinator = coordinatorRef.current;

  const persistenceContext = useMemo<MessageEditorPersistenceContext>(() => ({
    docId,
    isRoomDocument,
    readOnly,
    ready,
    roomId,
    shouldUseLocalSnapshot,
  }), [docId, isRoomDocument, readOnly, ready, roomId, shouldUseLocalSnapshot]);
  const persistenceIdentity = JSON.stringify([docId, isRoomDocument, roomId]);

  const commitCanonicalDocumentSnapshot = useCallback((
    nextMessages: MessageEditorMessage[],
    options: CommitDocumentSnapshotOptions = {},
  ) => {
    messagesRef.current = nextMessages;
    if (options.updateState !== false) {
      setMessages(nextMessages);
    }
    return nextMessages;
  }, []);

  const acceptPersistedSnapshot = useCallback((
    nextMessages: MessageEditorMessage[],
    options: CommitDocumentSnapshotOptions = {},
  ) => {
    const reconciledMessages = options.preserveRuntimeBlockIds
      ? reconcileMessageEditorRuntimeBlockIds({
          currentMessages: messagesRef.current,
          incomingMessages: nextMessages,
        })
      : nextMessages;
    const acceptedMessages = commitCanonicalDocumentSnapshot(
      coordinator.acceptPersistedSnapshot(reconciledMessages),
      options,
    );
    setSaveState("idle");
    return acceptedMessages;
  }, [commitCanonicalDocumentSnapshot, coordinator]);

  const restoreSnapshot = useCallback((nextMessages: MessageEditorMessage[]) => {
    const normalizedMessages = ensureMessageEditorMessages(nextMessages);
    const restoredMessages = commitCanonicalDocumentSnapshot(coordinator.markDocumentChanged(
      normalizedMessages,
      ready,
      { compareImmediately: true },
    ));
    setSaveState(coordinator.hasDirtyChanges() ? "dirty" : "idle");
    return restoredMessages;
  }, [commitCanonicalDocumentSnapshot, coordinator, ready]);

  const commitTransaction = useCallback(<T,>(transaction: MessageEditorEditTransaction<T>) => {
    if (transaction.changed) {
      const previous = messagesRef.current;
      historyManager.pushUndoEntry(
        () => createHistoryEntry(previous),
        transaction.historyKind,
        transaction.historyGroupKey,
      );
      commitCanonicalDocumentSnapshot(coordinator.markDocumentChanged(
        transaction.messages,
        ready,
        {
          changedBlockIds: transaction.changedBlockIds,
          structureChanged: transaction.structureChanged,
        },
      ));
      setSaveState("dirty");
    }
    return transaction.result;
  }, [commitCanonicalDocumentSnapshot, coordinator, createHistoryEntry, historyManager, ready]);

  const getCurrentMessages = useCallback(() => messagesRef.current, []);
  const hasDirtyChanges = useCallback(() => coordinator.hasDirtyChanges(), [coordinator]);
  const isRemoteSaveActive = useCallback(() => coordinator.isSaveActive(), [coordinator]);
  const resetSaveState = useCallback(() => setSaveState("idle"), []);
  const loadPersistedSnapshot = useCallback((seededInitialMessages: MessageEditorMessage[]) => {
    return loadMessageEditorPersistedSnapshot({
      currentMessages: messagesRef.current,
      docId,
      isRoomDocument,
      seededInitialMessages,
      shouldUseLocalSnapshot,
    });
  }, [docId, isRoomDocument, shouldUseLocalSnapshot]);

  const runSaveTransaction = useCallback(async (
    transaction: MessageEditorSaveTransaction,
    options: RunSaveTransactionOptions,
  ) => {
    try {
      const result = await executeMessageEditorPersistenceStrategy(transaction, {
        onRemoteMessagesSaved,
        remotePatchSourceSurface,
      });
      const completedState = coordinator.completeSave(transaction, result, messagesRef.current);
      const canUpdateEditorState = options.updateEditorState
        && mountedRef.current
        && persistenceIdentityRef.current === options.persistenceIdentity;
      if (completedState && canUpdateEditorState) {
        commitCanonicalDocumentSnapshot(completedState.nextMessages);
        setSaveState(completedState.dirtySinceSave ? "dirty" : "saved");
      }
    }
    catch (error) {
      console.error("[MessageEditor] persist snapshot failed", error);
      if (
        coordinator.isGenerationActive(transaction.generation)
        && options.updateEditorState
        && mountedRef.current
        && persistenceIdentityRef.current === options.persistenceIdentity
      ) {
        setSaveState("error");
      }
    }
    finally {
      const shouldRequestDeferredSave = coordinator.finishSave(transaction);
      if (
        shouldRequestDeferredSave
        && options.updateEditorState
        && mountedRef.current
        && persistenceIdentityRef.current === options.persistenceIdentity
      ) {
        requestDeferredSave(previous => previous + 1);
      }
    }
  }, [commitCanonicalDocumentSnapshot, coordinator, onRemoteMessagesSaved, remotePatchSourceSurface]);

  const trackSaveTransaction = useCallback((
    transaction: MessageEditorSaveTransaction,
    options: RunSaveTransactionOptions,
  ) => {
    const savePromise = runSaveTransaction(transaction, options);
    activeSavePromiseRef.current = savePromise;
    void savePromise.finally(() => {
      if (activeSavePromiseRef.current === savePromise) {
        activeSavePromiseRef.current = null;
      }
    });
    return savePromise;
  }, [runSaveTransaction]);

  const unloadOptionsRef = useRef({
    context: persistenceContext,
    onRemoteMessagesSaved,
    remotePatchSourceSurface,
  });
  useEffect(() => {
    unloadOptionsRef.current = {
      context: persistenceContext,
      onRemoteMessagesSaved,
      remotePatchSourceSurface,
    };
  }, [onRemoteMessagesSaved, persistenceContext, remotePatchSourceSurface]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!coordinator.shouldScheduleSave(persistenceContext)) {
      return;
    }

    const timer = window.setTimeout(() => {
      const startResult = coordinator.beginSave(messages, persistenceContext);
      if (startResult.kind === "skipped") {
        if (startResult.reason === "empty-room") {
          console.warn("[MessageEditor] skip empty room message-stream sync to avoid clearing content");
        }
        return;
      }
      if (startResult.kind !== "started") {
        return;
      }

      setSaveState("saving");
      void trackSaveTransaction(startResult.transaction, {
        persistenceIdentity,
        updateEditorState: true,
      });
    }, resolveMessageEditorPersistenceDelayMs({ isRoomDocument }));

    return () => {
      window.clearTimeout(timer);
    };
  }, [coordinator, isRoomDocument, messages, persistenceContext, persistenceIdentity, saveRequestRevision, trackSaveTransaction]);

  useEffect(() => {
    mountedRef.current = true;
    if (persistenceIdentityRef.current !== persistenceIdentity) {
      persistenceIdentityRef.current = persistenceIdentity;
      persistenceIdentityRevisionRef.current += 1;
    }
    const persistenceIdentityRevision = persistenceIdentityRevisionRef.current;

    return () => {
      mountedRef.current = false;
      const flushMessages = ensureMessageEditorMessages(messagesRef.current);
      const flushOptions = unloadOptionsRef.current;

      void (async () => {
        await activeSavePromiseRef.current;
        await Promise.resolve();
        const persistenceIdentityChanged
          = persistenceIdentityRevisionRef.current !== persistenceIdentityRevision;
        // StrictMode 会重建同一持久化身份的 effect；这种开发期探测不应真正保存。
        if (mountedRef.current && !persistenceIdentityChanged) {
          return;
        }

        const { context, onRemoteMessagesSaved: publish, remotePatchSourceSurface: sourceSurface } = flushOptions;
        coordinator.markDocumentChanged(flushMessages, true, { compareImmediately: true });
        const startResult = coordinator.beginSave(flushMessages, {
          ...context,
          ready: true,
        });
        if (startResult.kind === "skipped" && startResult.reason === "empty-room") {
          console.warn("[MessageEditor] skip empty room message-stream flush to avoid clearing content");
          return;
        }
        if (startResult.kind !== "started") {
          return;
        }

        try {
          const result = await executeMessageEditorPersistenceStrategy(startResult.transaction, {
            onRemoteMessagesSaved: publish,
            remotePatchSourceSurface: sourceSurface,
          });
          coordinator.completeSave(startResult.transaction, result, messagesRef.current);
        }
        catch (error) {
          console.warn("[MessageEditor] flush message persistence failed", error);
        }
        finally {
          coordinator.finishSave(startResult.transaction);
        }
      })();
    };
  }, [coordinator, persistenceIdentity]);

  return {
    acceptPersistedSnapshot,
    commitTransaction,
    getCurrentMessages,
    hasDirtyChanges,
    isRemoteSaveActive,
    loadPersistedSnapshot,
    messages,
    messagesRef,
    resetSaveState,
    restoreSnapshot,
    saveState,
  };
}

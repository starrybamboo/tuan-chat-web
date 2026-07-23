import type { MutableRefObject } from "react";

import { useCallback, useEffect, useMemo, useRef } from "react";

import type {
  MessageEditorContentAdapter,
  MessageEditorMessage,
  MessageEditorSaveState,
} from "../messageEditorTypes";
import type { MessageEditorEditTransaction } from "../runtime/messageEditorActions";
import type {
  MessageEditorHistoryEntry,
  MessageEditorHistoryManager,
} from "../runtime/messageEditorHistoryManager";

import { ensureMessageEditorMessages } from "../model/messageEditorTransforms";

type MessageEditorMessageMutationsParams = {
  adapter: MessageEditorContentAdapter;
  createHistoryEntry: (messages: MessageEditorMessage[]) => MessageEditorHistoryEntry;
  historyManager: MessageEditorHistoryManager;
  readOnly: boolean;
};

type MessageEditorMessageMutationsResult = {
  commitTransaction: <T>(transaction: MessageEditorEditTransaction<T>) => T;
  getCurrentMessages: () => MessageEditorMessage[];
  messages: MessageEditorMessage[];
  messagesRef: MutableRefObject<MessageEditorMessage[]>;
  restoreSnapshot: (messages: MessageEditorMessage[]) => MessageEditorMessage[];
  saveState: MessageEditorSaveState;
};

/** MessageEditor 的受控事务门面；内容与保存语义完全由 adapter 持有。 */
export default function useMessageEditorMessageMutations({
  adapter,
  createHistoryEntry,
  historyManager,
  readOnly,
}: MessageEditorMessageMutationsParams): MessageEditorMessageMutationsResult {
  const messages = useMemo(
    () => ensureMessageEditorMessages(adapter.messages),
    [adapter.messages],
  );
  const messagesRef = useRef<MessageEditorMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const applyMessages = useCallback((
    nextMessages: MessageEditorMessage[],
    metadata: { changedBlockIds: readonly string[]; structureChanged: boolean },
  ) => {
    if (readOnly) return messagesRef.current;
    const accepted = adapter.applyChange({
      changedBlockIds: metadata.changedBlockIds,
      messages: nextMessages,
      previousMessages: messagesRef.current,
      structureChanged: metadata.structureChanged,
    });
    messagesRef.current = ensureMessageEditorMessages(accepted);
    return messagesRef.current;
  }, [adapter, readOnly]);

  const commitTransaction = useCallback(<T,>(transaction: MessageEditorEditTransaction<T>) => {
    if (!transaction.changed || readOnly) return transaction.result;
    const previous = messagesRef.current;
    historyManager.pushUndoEntry(
      () => createHistoryEntry(previous),
      transaction.historyKind,
      transaction.historyGroupKey,
    );
    applyMessages(transaction.messages, {
      changedBlockIds: transaction.changedBlockIds,
      structureChanged: transaction.structureChanged,
    });
    return transaction.result;
  }, [applyMessages, createHistoryEntry, historyManager, readOnly]);

  const restoreSnapshot = useCallback((nextMessages: MessageEditorMessage[]) => {
    return applyMessages(nextMessages, {
      changedBlockIds: nextMessages.map(message => String(message.messageId ?? "")),
      structureChanged: true,
    });
  }, [applyMessages]);

  const getCurrentMessages = useCallback(() => messagesRef.current, []);

  return {
    commitTransaction,
    getCurrentMessages,
    messages,
    messagesRef,
    restoreSnapshot,
    saveState: adapter.saveState,
  };
}

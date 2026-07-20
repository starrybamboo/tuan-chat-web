import { buildOptimisticRoomMessagesFromPatch } from "@tuanchat/query/room-message-lifecycle";

import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotCache";
import { getPersistedDocSnapshot, setPersistedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotPersistence";
import { patchRemoteRoomMessageStream } from "@/components/chat/infra/doc/document/roomMessageStreamApi";

import type { Message } from "../../../../api";
import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorRemotePatchSourceSurface } from "../model/messageEditorPersistencePolicy";
import type {
  MessageEditorPersistenceSaveResult,
  MessageEditorSaveTransaction,
} from "./messageEditorPersistenceCoordinator";

import { createMessageEditorSnapshot, decodeMessageEditorMessages } from "../model/messageEditorCodec";
import {
  getMessageEditorPatchMutationMeta,
  mergeChangedRoomMessagesIntoEditorMessages,
  resolveMessageEditorLoadFallback,
  resolveMessageEditorPersistenceContext,
  toPatchOptimisticMessageInput,
} from "../model/messageEditorPersistencePolicy";
import { ensureMessageEditorMessages } from "../model/messageEditorTransforms";

type MessageEditorPersistenceStrategyDependencies = {
  onRemoteMessagesSaved?: (messages: Message[]) => void | Promise<void>;
  publishOptimisticRoomMessages?: boolean;
  remotePatchSourceSurface: MessageEditorRemotePatchSourceSurface;
};

/** 合并一次远端批处理响应，生成该批次真正落盘的编辑器快照。 */
export function mergeMessageEditorRemotePatchSaveResult(params: {
  changedMessages: Message[];
  operations: Parameters<typeof mergeChangedRoomMessagesIntoEditorMessages>[0]["operations"];
  submittedMessages: MessageEditorMessage[];
}) {
  if (params.operations.length === 0) {
    return ensureMessageEditorMessages(params.submittedMessages);
  }
  if (params.changedMessages.length !== params.operations.length) {
    throw new Error("房间消息变更响应数量不匹配");
  }

  return mergeChangedRoomMessagesIntoEditorMessages({
    changedMessages: params.changedMessages,
    currentMessages: ensureMessageEditorMessages(params.submittedMessages),
    operations: params.operations,
  });
}

/**
 * 生成远端失败时的缓存补偿批次：移除本次新增的负 ID 乐观消息，并恢复受影响基线消息。
 */
export function buildMessageEditorOptimisticRollbackMessages(params: {
  baselineMessages: MessageEditorMessage[];
  optimisticMessages: Message[];
  operations: Extract<MessageEditorSaveTransaction["plan"], { kind: "remote" }>["operations"];
  roomId: number;
}) {
  const affectedMessageIds = new Set(params.operations.flatMap((operation) => {
    return typeof operation.messageId === "number" ? [operation.messageId] : [];
  }));
  const optimisticInsertTombstones = params.optimisticMessages
    .filter(message => typeof message.messageId === "number" && message.messageId < 0)
    .map(message => ({
      ...message,
      status: 1,
      updateTime: new Date().toISOString(),
    }));
  const restoredBaselineMessages = ensureMessageEditorMessages(params.baselineMessages)
    .filter((message) => {
      return typeof message.messageId === "number"
        && affectedMessageIds.has(message.messageId)
        && message.roomId === params.roomId;
    })
    .map(message => ({
      ...message,
      status: message.status ?? 0,
    } as Message));

  return [...optimisticInsertTombstones, ...restoredBaselineMessages];
}

async function publishRemoteMessages(
  publish: MessageEditorPersistenceStrategyDependencies["onRemoteMessagesSaved"],
  messages: Message[],
  failureMessage: string,
) {
  if (!publish || messages.length === 0) {
    return;
  }
  try {
    await publish(messages);
  }
  catch (error) {
    console.warn(failureMessage, error);
  }
}

async function executeRoomMessagePersistenceStrategy(
  transaction: MessageEditorSaveTransaction,
  dependencies: MessageEditorPersistenceStrategyDependencies,
): Promise<MessageEditorPersistenceSaveResult> {
  if (transaction.plan.kind !== "remote") {
    throw new Error("远端持久化策略收到非远端执行计划");
  }
  const operations = transaction.plan.operations;
  if (operations.length === 0) {
    return { operations, savedMessages: transaction.submittedMessages };
  }

  const optimisticMessages = buildOptimisticRoomMessagesFromPatch({
    baselineMessages: transaction.baselineMessages.map(toPatchOptimisticMessageInput),
    nextMessages: transaction.submittedMessages.map(toPatchOptimisticMessageInput),
    operations,
    roomId: transaction.plan.roomId,
  });
  if (dependencies.publishOptimisticRoomMessages !== false) {
    await publishRemoteMessages(
      dependencies.onRemoteMessagesSaved,
      optimisticMessages,
      "[MessageEditor] optimistic room message stream merge failed",
    );
  }

  let changedMessages: Message[];
  let savedMessages: MessageEditorMessage[];
  try {
    changedMessages = await patchRemoteRoomMessageStream({
      mutationMeta: getMessageEditorPatchMutationMeta(dependencies.remotePatchSourceSurface),
      operations,
      roomId: transaction.plan.roomId,
    });
    savedMessages = mergeMessageEditorRemotePatchSaveResult({
      changedMessages,
      operations,
      submittedMessages: transaction.submittedMessages,
    });
  }
  catch (error) {
    const rollbackMessages = buildMessageEditorOptimisticRollbackMessages({
      baselineMessages: transaction.baselineMessages,
      optimisticMessages,
      operations,
      roomId: transaction.plan.roomId,
    });
    if (dependencies.publishOptimisticRoomMessages !== false) {
      await publishRemoteMessages(
        dependencies.onRemoteMessagesSaved,
        rollbackMessages,
        "[MessageEditor] rollback optimistic room message stream merge failed",
      );
    }
    throw error;
  }

  await publishRemoteMessages(
    dependencies.onRemoteMessagesSaved,
    changedMessages,
    "[MessageEditor] commit room message stream cache failed",
  );
  return {
    changedMessages,
    operations,
    savedMessages,
  };
}

/** 执行 coordinator 生成的 local/room/none 持久化策略。 */
export async function executeMessageEditorPersistenceStrategy(
  transaction: MessageEditorSaveTransaction,
  dependencies: MessageEditorPersistenceStrategyDependencies,
): Promise<MessageEditorPersistenceSaveResult> {
  if (transaction.plan.kind === "remote") {
    return executeRoomMessagePersistenceStrategy(transaction, dependencies);
  }
  if (transaction.plan.kind === "local") {
    const snapshot = createMessageEditorSnapshot(transaction.submittedMessages);
    const baselineSnapshot = createMessageEditorSnapshot(transaction.baselineMessages);
    setCachedDocSnapshot(transaction.plan.docId, snapshot);
    try {
      await setPersistedDocSnapshot(transaction.plan.docId, snapshot);
    }
    catch (error) {
      setCachedDocSnapshot(transaction.plan.docId, baselineSnapshot);
      throw error;
    }
  }
  return { savedMessages: transaction.submittedMessages };
}

/** 通过当前持久化策略加载本地快照；调用方无需知道 cache/IndexedDB 的选择顺序。 */
export async function loadMessageEditorPersistedSnapshot(params: {
  currentMessages: MessageEditorMessage[];
  docId?: string;
  isRoomDocument: boolean;
  seededInitialMessages: MessageEditorMessage[];
  shouldUseLocalSnapshot: boolean;
}) {
  const { localSnapshotDocId } = resolveMessageEditorPersistenceContext({
    docId: params.docId,
    isRoomDocument: params.isRoomDocument,
    shouldUseLocalSnapshot: params.shouldUseLocalSnapshot,
  });
  const cached = localSnapshotDocId ? getCachedDocSnapshot(localSnapshotDocId) : null;
  const persisted = cached ?? (localSnapshotDocId
    ? await getPersistedDocSnapshot(localSnapshotDocId).catch(() => null)
    : null);
  if (localSnapshotDocId && persisted && !cached) {
    setCachedDocSnapshot(localSnapshotDocId, persisted);
  }
  const fallback = resolveMessageEditorLoadFallback({
    currentMessages: params.currentMessages,
    docId: params.docId,
    seededInitialMessages: params.seededInitialMessages,
  });
  return ensureMessageEditorMessages(
    persisted ? decodeMessageEditorMessages(persisted) : fallback,
  );
}

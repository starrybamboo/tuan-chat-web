import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRoomMessageSyncGapStart,
} from "@tuanchat/query/room-message";
import {
  collectPersistedOptimisticDuplicateIds,
  commitOptimisticRoomMessageInList,
  isLocalRoomMessage,
  markOptimisticRoomMessage,
  mergeRoomMessagesForLocalState,
  rollbackOptimisticRoomMessagesInList,
} from "@tuanchat/query/room-message-lifecycle";
import {
  extractRoomMessagesFromQueryData,
  getRoomMessagesQueryKey,
  type RoomMessagesQueryData,
} from "@tuanchat/query/room-message-query-data";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { mergeMessageEditorMediaLayouts } from "@/components/messageEditor/model/messageEditorTransforms";

import type { ChatMessageResponse } from "../../../../../api";

import { tuanchat } from "../../../../../api/instance";
import { loadChatHistoryDb } from "./chatHistoryDbLoader";
import { logMessageOrderChange } from "./messageOrderDebug";
import {
  getRoomHistoryRuntime,
  getRoomMessagesFromQueryCache,
  updateRoomMessagesQueryCache,
} from "./roomHistoryQueryCache";
import { isRoomMessagesReceivedEvent, ROOM_MESSAGES_RECEIVED_EVENT } from "./roomMessageEvents";

const WS_RECONNECTED_EVENT = "tc:ws-reconnected";
const MESSAGE_ID_ALIAS_MAX_AGE_MS = 10 * 60 * 1000;
const EMPTY_ROOM_MESSAGES: ChatMessageResponse[] = [];

type IncomingRoomMessageGapParams = {
  currentMessages: ChatMessageResponse[];
  incomingMessages: ChatMessageResponse[];
  latestHistorySyncId?: number;
};

function shouldPhysicallyDeleteLocalMessage(messageId: number): boolean {
  return messageId < 0;
}

export function detectIncomingRoomMessageGapStart({
  currentMessages,
  incomingMessages,
  latestHistorySyncId = -1,
}: IncomingRoomMessageGapParams): { missingStartSyncId: number; gapIncomingSyncId: number } | null {
  if (incomingMessages.length === 0) {
    return null;
  }

  const seedMessage = currentMessages[0]?.message ?? incomingMessages[0]?.message;
  const baselineMessages = seedMessage && Number.isFinite(latestHistorySyncId) && latestHistorySyncId >= 0
    ? [{
        message: {
          ...seedMessage,
          messageId: Number.MIN_SAFE_INTEGER,
          syncId: latestHistorySyncId,
        },
      } satisfies ChatMessageResponse]
    : [];
  let knownMessages = mergeRoomMessagesForLocalState(currentMessages, baselineMessages);

  for (const incomingMessage of incomingMessages) {
    const missingStartSyncId = getRoomMessageSyncGapStart(knownMessages, incomingMessage);
    if (missingStartSyncId !== null) {
      return {
        missingStartSyncId,
        gapIncomingSyncId: incomingMessage.message.syncId ?? -1,
      };
    }
    knownMessages = mergeRoomMessagesForLocalState(knownMessages, [incomingMessage]);
  }

  return null;
}

export function getRoomHistoryFetchStartSyncId(localMessages: ChatMessageResponse[]): number {
  const syncIds = Array.from(new Set(
    localMessages
      .map(item => item.message.syncId)
      .filter((syncId): syncId is number => Number.isFinite(syncId) && syncId > 0),
  )).sort((a, b) => a - b);

  if (syncIds.length === 0) {
    return 0;
  }
  if (syncIds[0] > 1) {
    return 1;
  }

  let expectedNextSyncId = syncIds[0] + 1;
  for (let index = 1; index < syncIds.length; index += 1) {
    const syncId = syncIds[index];
    if (syncId > expectedNextSyncId) {
      return expectedNextSyncId;
    }
    expectedNextSyncId = syncId + 1;
  }

  return syncIds[syncIds.length - 1] + 1;
}

export function mergeLoadedRoomHistory(
  roomId: number,
  localHistory: ChatMessageResponse[],
  currentMessages: ChatMessageResponse[],
): ChatMessageResponse[] {
  const currentRoomMessages = currentMessages.filter(message => message.message.roomId === roomId);
  return mergeRoomMessagesForLocalState(localHistory, currentRoomMessages);
}

/** 远端投影缺少编辑器专用布局时，保留同一消息的本地媒体尺寸。 */
function retainIncomingRoomMessageMediaLayouts(
  currentMessages: ChatMessageResponse[],
  incomingMessages: ChatMessageResponse[],
) {
  const currentMessagesById = new Map(currentMessages.map(item => [item.message.messageId, item.message]));
  return incomingMessages.map((item) => {
    const currentMessage = currentMessagesById.get(item.message.messageId);
    if (!currentMessage) {
      return item;
    }
    const [message] = mergeMessageEditorMediaLayouts([item.message], [currentMessage]);
    return message === item.message ? item : { ...item, message: message as ChatMessageResponse["message"] };
  });
}

/** 合并远端增量，同时保护编辑器仍标记为 dirty 的同 ID 消息。 */
export function mergeIncomingRoomMessagesWithEditorWorkingState(
  currentMessages: ChatMessageResponse[],
  incomingMessages: ChatMessageResponse[],
  dirtyMessageIds: ReadonlySet<number>,
) {
  const mergeableMessages = retainIncomingRoomMessageMediaLayouts(
    currentMessages,
    incomingMessages.filter((item) => {
      const messageId = item.message?.messageId;
      return typeof messageId !== "number" || !dirtyMessageIds.has(messageId);
    }),
  );
  return mergeRoomMessagesForLocalState(currentMessages, mergeableMessages);
}

/** 使用编辑器工作副本替换当前房间，其他房间的热态保持不变。 */
export function replaceRoomMessagesWithEditorWorkingState(
  currentMessages: ChatMessageResponse[],
  workingMessages: ChatMessageResponse[],
  roomId: number,
) {
  const retainedMessages = currentMessages.filter(item => item.message.roomId !== roomId);
  return mergeRoomMessagesForLocalState(retainedMessages, workingMessages);
}

/** 服务端确认新增后，按稳定内容特征移除对应的编辑器负 ID 草稿。 */
export function removeCommittedEditorDrafts(
  currentMessages: ChatMessageResponse[],
  committedMessages: ChatMessageResponse[],
) {
  const unmatchedCommitted = [...committedMessages];
  let removedDraft = false;
  const nextMessages = currentMessages.filter((item) => {
    const message = item.message as ChatMessageResponse["message"] & { tcMessageEditorDraft?: boolean };
    if (message.tcMessageEditorDraft !== true) {
      return true;
    }
    const matchedIndex = unmatchedCommitted.findIndex((committed) => {
      const next = committed.message;
      return next.messageId > 0
        && next.roomId === message.roomId
        && next.position === message.position
        && next.messageType === message.messageType
        && next.roleId === message.roleId
        && next.content === message.content;
    });
    if (matchedIndex < 0) {
      return true;
    }
    unmatchedCommitted.splice(matchedIndex, 1);
    removedDraft = true;
    return false;
  });
  return removedDraft ? nextMessages : currentMessages;
}

/** 保存确认先合入非 dirty 消息；dirty 清理由 MessageEditor 完成保存对账后统一发布。 */
export function mergeCommittedEditorMessagesWithWorkingState(
  currentMessages: ChatMessageResponse[],
  committedMessages: ChatMessageResponse[],
  dirtyMessageIds: ReadonlySet<number>,
) {
  return mergeIncomingRoomMessagesWithEditorWorkingState(
    removeCommittedEditorDrafts(currentMessages, committedMessages),
    committedMessages,
    dirtyMessageIds,
  );
}

export type UseChatHistoryReturn = {
  messages: ChatMessageResponse[];
  latestSyncId: number;
  loading: boolean;
  error: Error | null;
  addOrUpdateMessage: (message: ChatMessageResponse) => Promise<void>;
  addOrUpdateMessages: (messages: ChatMessageResponse[]) => Promise<void>;
  commitEditorMessages: (messages: ChatMessageResponse[]) => Promise<void>;
  applyOptimisticMessages: (messages: ChatMessageResponse[]) => ChatMessageResponse[];
  rollbackOptimisticMessages: (
    optimisticMessages: ChatMessageResponse[],
    previousMessages: ChatMessageResponse[],
  ) => void;
  removeMessageById: (messageId: number) => Promise<void>;
  replaceMessageById: (fromMessageId: number, message: ChatMessageResponse) => Promise<void>;
  resolveMessageId: (messageId: number) => number;
  getMessagesByRoomId: (roomId: number) => Promise<ChatMessageResponse[]>;
  clearHistory: () => Promise<void>;
};

/**
 * 用于管理特定房间聊天记录的React Hook
 * @param roomId 要管理的房间ID, 你可以设置为null，然后通过getMessagesByRoomId获取
 */
export function useChatHistory(roomId: number | null): UseChatHistoryReturn {
  const queryClient = useQueryClient();
  const observedRoomId = roomId ?? -1;
  const roomMessagesQuery = useQuery<RoomMessagesQueryData>({
    enabled: false,
    gcTime: Number.POSITIVE_INFINITY,
    initialData: EMPTY_ROOM_MESSAGES,
    // 此查询仅订阅 Query cache，禁用状态下不会主动读取；空值仅作为未写入 cache 时的回退。
    queryFn: () => EMPTY_ROOM_MESSAGES,
    queryKey: getRoomMessagesQueryKey(observedRoomId),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const messagesRaw = useMemo(() => {
    return roomId === null
      ? EMPTY_ROOM_MESSAGES
      : extractRoomMessagesFromQueryData(roomMessagesQuery.data);
  }, [roomId, roomMessagesQuery.data]);
  const messagesWithoutDeletedMessages = useMemo(() => {
    return messagesRaw.filter(msg => msg.message.status !== 1);
  }, [messagesRaw]);
  const latestSyncId = useMemo(() => {
    return (messagesRaw ?? []).reduce((max, item) => {
      const syncId = item.message.syncId;
      return typeof syncId === "number" && Number.isFinite(syncId) ? Math.max(max, syncId) : max;
    }, -1);
  }, [messagesRaw]);
  const [loading, setLoading] = useState(() => roomId !== null && messagesRaw.length === 0);
  const [error, setError] = useState<Error | null>(null);

  // 使用 ref 保存最新的 roomId，避免依赖变化导致回调重新创建
  const roomIdRef = useRef<number | null>(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const getCurrentRoomMessages = useCallback((targetRoomId: number) => {
    return getRoomMessagesFromQueryCache(queryClient, targetRoomId);
  }, [queryClient]);
  const updateRoomMessages = useCallback((
    targetRoomId: number,
    updater: (messages: ChatMessageResponse[]) => ChatMessageResponse[],
  ) => {
    return updateRoomMessagesQueryCache(queryClient, targetRoomId, updater);
  }, [queryClient]);

  const cleanupMessageIdAlias = useCallback(() => {
    const currentRoomId = roomIdRef.current;
    if (currentRoomId === null) {
      return;
    }
    const messageIdAliases = getRoomHistoryRuntime(queryClient, currentRoomId).messageIdAliases;
    const now = Date.now();
    for (const [fromMessageId, alias] of messageIdAliases.entries()) {
      if (now - alias.updatedAt > MESSAGE_ID_ALIAS_MAX_AGE_MS) {
        messageIdAliases.delete(fromMessageId);
      }
    }
  }, [queryClient]);

  const setMessageIdAlias = useCallback((fromMessageId: number, toMessageId: number) => {
    if (!Number.isFinite(fromMessageId) || !Number.isFinite(toMessageId) || fromMessageId === toMessageId) {
      return;
    }
    const currentRoomId = roomIdRef.current;
    if (currentRoomId === null) {
      return;
    }
    cleanupMessageIdAlias();
    getRoomHistoryRuntime(queryClient, currentRoomId).messageIdAliases.set(fromMessageId, {
      toMessageId,
      updatedAt: Date.now(),
    });
  }, [cleanupMessageIdAlias, queryClient]);

  const stripPersistedOptimisticDuplicates = useCallback(async (
    messages: ChatMessageResponse[],
  ): Promise<ChatMessageResponse[]> => {
    const duplicateIds = collectPersistedOptimisticDuplicateIds(messages);
    if (duplicateIds.length === 0) {
      return messages;
    }

    try {
      const db = await loadChatHistoryDb();
      await db.deleteMessagesByIds(duplicateIds);
    }
    catch (err) {
      setError(err as Error);
      console.error(`Failed to cleanup optimistic duplicates for room ${roomIdRef.current}:`, err);
    }

    return messages.filter(item => !duplicateIds.includes(item.message.messageId));
  }, []);

  const resolveMessageId = useCallback((messageId: number): number => {
    if (!Number.isFinite(messageId)) {
      return messageId;
    }
    cleanupMessageIdAlias();
    const currentRoomId = roomIdRef.current;
    if (currentRoomId === null) {
      return messageId;
    }
    const messageIdAliases = getRoomHistoryRuntime(queryClient, currentRoomId).messageIdAliases;
    let currentMessageId = messageId;
    const visited = new Set<number>();
    while (!visited.has(currentMessageId)) {
      visited.add(currentMessageId);
      const alias = messageIdAliases.get(currentMessageId);
      if (!alias) {
        break;
      }
      currentMessageId = alias.toMessageId;
    }
    return currentMessageId;
  }, [cleanupMessageIdAlias, queryClient]);

  /**
   * 批量添加或更新消息到当前房间，并同步更新UI状态
   * @param newMessages 要处理的消息数组
   */
  const addOrUpdateMessages = useCallback(
    async (newMessages: ChatMessageResponse[]) => {
      if (newMessages.length === 0)
        return;

      // 先更新 Query 工作投影
      // 由于获取消息是异步的，这里的roomId可能是过时的，所以要检查一下。
      const currentRoomId = roomIdRef.current;
      const currentRoomMessages = currentRoomId === null ? EMPTY_ROOM_MESSAGES : getCurrentRoomMessages(currentRoomId);
      const messagesWithLocalLayouts = currentRoomId === null
        ? newMessages
        : retainIncomingRoomMessageMediaLayouts(currentRoomMessages, newMessages);
      const roomScopedMessages = messagesWithLocalLayouts.filter(msg => msg.message.roomId === currentRoomId);
      if (currentRoomId !== null && roomScopedMessages.length > 0) {
        updateRoomMessages(currentRoomId, (prevMessages) => {
          const nextMessages = mergeIncomingRoomMessagesWithEditorWorkingState(
            prevMessages,
            roomScopedMessages,
            new Set(),
          );
          if (prevMessages === nextMessages) {
            return prevMessages;
          }

          logMessageOrderChange({
            source: "addOrUpdateMessages",
            roomId: currentRoomId,
            prevMessages,
            nextMessages,
            incomingMessageIds: roomScopedMessages.map(item => item.message.messageId),
          });
          return nextMessages;
        });
      }

      // SQLite 只持久化服务端确认投影与负 ID 发送 pending；编辑、移动、删除的乐观态只留在内存。
      try {
        const db = await loadChatHistoryDb();
        const pendingMessages = messagesWithLocalLayouts.filter(message => isLocalRoomMessage(message.message));
        const confirmedMessages = messagesWithLocalLayouts.filter(message => !isLocalRoomMessage(message.message));
        await db.addPendingRoomMessages(pendingMessages);
        if (confirmedMessages.length > 0) {
          await db.addOrUpdateMessagesBatch(confirmedMessages);
        }
        const duplicateIds = collectPersistedOptimisticDuplicateIds(
          mergeRoomMessagesForLocalState(
            currentRoomId === null ? EMPTY_ROOM_MESSAGES : getCurrentRoomMessages(currentRoomId),
            messagesWithLocalLayouts,
          ),
        );
        if (duplicateIds.length > 0) {
          await db.deleteMessagesByIds(duplicateIds);
        }
      }
      catch (err) {
        setError(err as Error);
        console.error(`Failed to batch save messages for room ${roomIdRef.current}:`, err);
      }
    },
    [getCurrentRoomMessages, queryClient, updateRoomMessages],
  );

  const commitEditorMessages = useCallback(async (newMessages: ChatMessageResponse[]) => {
    const currentRoomId = roomIdRef.current;
    if (currentRoomId === null) {
      return;
    }
    updateRoomMessages(
      currentRoomId,
      currentMessages => mergeCommittedEditorMessagesWithWorkingState(
        currentMessages,
        newMessages,
        new Set(),
      ),
    );
    await addOrUpdateMessages(newMessages);
  }, [addOrUpdateMessages, queryClient, updateRoomMessages]);


  const applyOptimisticMessages = useCallback((newMessages: ChatMessageResponse[]) => {
    const currentRoomId = roomIdRef.current;
    if (currentRoomId === null) {
      return [];
    }
    const roomScopedMessages = newMessages.filter(message => message.message.roomId === currentRoomId);
    if (roomScopedMessages.length === 0) {
      return [];
    }
    const optimisticMessages = roomScopedMessages.map(message => ({
      ...message,
      message: markOptimisticRoomMessage(message.message),
    }));
    updateRoomMessages(
      currentRoomId,
      prevMessages => mergeRoomMessagesForLocalState(prevMessages, optimisticMessages),
    );
    return optimisticMessages;
  }, [updateRoomMessages]);

  const rollbackOptimisticMessages = useCallback((
    optimisticMessages: ChatMessageResponse[],
    previousMessages: ChatMessageResponse[],
  ) => {
    if (optimisticMessages.length === 0) {
      return;
    }
    const currentRoomId = roomIdRef.current;
    if (currentRoomId === null) {
      return;
    }
    updateRoomMessages(currentRoomId, currentMessages => rollbackOptimisticRoomMessagesInList(
      currentMessages,
      optimisticMessages,
      previousMessages,
    ));
  }, [updateRoomMessages]);

  /**
   * 添加或更新单条消息（作为批量操作的便捷封装）
   * @param message 要处理的单条消息
   */
  const addOrUpdateMessage = useCallback(
    async (message: ChatMessageResponse) => {
      if (roomIdRef.current === null)
        return;
      // 调用批量处理函数
      await addOrUpdateMessages([message]);
    },
    [addOrUpdateMessages], // ← 只依赖 addOrUpdateMessages，不依赖 roomId
  );

  /**
   * 删除单条消息（本地状态 + SQLite tombstone）
   */
  const removeMessageById = useCallback(async (messageId: number) => {
    if (!Number.isFinite(messageId))
      return;

    const currentRoomId = roomIdRef.current;
    if (currentRoomId !== null) {
      updateRoomMessages(currentRoomId, (prevMessages) => {
        const nextMessages = prevMessages.filter(msg => msg.message.messageId !== messageId);
        if (nextMessages.length !== prevMessages.length) {
          logMessageOrderChange({
            source: "removeMessageById",
            roomId: currentRoomId,
            prevMessages,
            nextMessages,
            incomingMessageIds: [messageId],
          });
        }
        return nextMessages.length === prevMessages.length ? prevMessages : nextMessages;
      });
    }

    try {
      const db = await loadChatHistoryDb();
      if (shouldPhysicallyDeleteLocalMessage(messageId)) {
        await db.deleteMessagesByIds([messageId]);
      }
      else {
        await db.markMessagesDeletedByIds([messageId]);
      }
    }
    catch (err) {
      setError(err as Error);
      console.error(`Failed to remove message ${messageId} for room ${roomIdRef.current}:`, err);
    }
  }, [updateRoomMessages]);

  /**
   * 使用新消息替换旧 messageId（用于乐观消息回填）
   */
  const replaceMessageById = useCallback(async (fromMessageId: number, message: ChatMessageResponse) => {
    const nextMessage = message?.message;
    if (!nextMessage || !Number.isFinite(fromMessageId)) {
      return;
    }

    const currentRoomId = roomIdRef.current;
    if (fromMessageId !== nextMessage.messageId) {
      setMessageIdAlias(fromMessageId, nextMessage.messageId);
    }
    const shouldRenderNextMessage = nextMessage.roomId === currentRoomId;
    let mergedForDb = message;

    if (currentRoomId !== null) {
      updateRoomMessages(currentRoomId, (prevMessages) => {
        const baselineMessages = shouldRenderNextMessage && fromMessageId !== nextMessage.messageId
          ? commitOptimisticRoomMessageInList(prevMessages, fromMessageId, nextMessage)
          : prevMessages.filter(item => item.message.messageId !== fromMessageId || shouldRenderNextMessage);
        const nextMessages = shouldRenderNextMessage
          ? mergeRoomMessagesForLocalState(baselineMessages, [message])
          : baselineMessages;
        mergedForDb = nextMessages.find(item => item.message.messageId === nextMessage.messageId) ?? message;

        if (prevMessages === nextMessages) {
          return prevMessages;
        }

        logMessageOrderChange({
          source: "replaceMessageById",
          roomId: currentRoomId,
          prevMessages,
          nextMessages,
          incomingMessageIds: [fromMessageId, nextMessage.messageId],
        });
        return nextMessages;
      });
    }

    try {
      const db = await loadChatHistoryDb();
      if (fromMessageId !== nextMessage.messageId) {
        await db.promotePendingRoomMessage(fromMessageId, mergedForDb);
      }
      else {
        await db.addOrUpdateMessagesBatch([mergedForDb]);
      }
    }
    catch (err) {
      setError(err as Error);
      console.error(`Failed to replace message ${fromMessageId} for room ${currentRoomId}:`, err);
    }
  }, [setMessageIdAlias, updateRoomMessages]);

  /**
   * 从服务器全量获取最新的消息
   */
  const fetchNewestMessages = useCallback(async (maxSyncId: number) => {
    if (roomIdRef.current === null)
      return [];

    // 从服务器获取最新消息
    const serverResponse = await tuanchat.chatController.getHistoryMessages({
      roomId: roomIdRef.current,
      syncId: maxSyncId + 1,
    });

    const newMessages = serverResponse.data ?? [];
    if (newMessages.length > 0) {
      await addOrUpdateMessages(newMessages);
    }

    return newMessages;
  }, [addOrUpdateMessages]); // ← 只依赖 addOrUpdateMessages，不依赖 roomId

  const addReceivedRoomMessages = useCallback(async (incomingMessages: ChatMessageResponse[]) => {
    const currentRoomId = roomIdRef.current;
    if (currentRoomId === null || incomingMessages.length === 0) {
      return;
    }

    const roomScopedMessages = incomingMessages.filter(message => message.message.roomId === currentRoomId);
    if (roomScopedMessages.length === 0) {
      return;
    }

    const missingRange = detectIncomingRoomMessageGapStart({
      currentMessages: getCurrentRoomMessages(currentRoomId),
      incomingMessages: roomScopedMessages,
      latestHistorySyncId: latestSyncId,
    });
    if (missingRange) {
      try {
        const missingMessagesRes = await tuanchat.chatController.getHistoryMessages({
          roomId: currentRoomId,
          syncId: missingRange.missingStartSyncId,
        });
        if (missingMessagesRes.data && missingMessagesRes.data.length > 0) {
          await addOrUpdateMessages(missingMessagesRes.data);
        }
      }
      catch (err) {
        setError(err as Error);
        console.error("[useChatHistory] Failed to fetch missing room messages:", err);
      }
    }

    await addOrUpdateMessages(roomScopedMessages);
  }, [addOrUpdateMessages, getCurrentRoomMessages, latestSyncId]);

  /**
   * 按照房间获取消息
   */
  const currentFetchingRoomId = useRef<number | null>(null);
  const getMessagesByRoomId = useCallback(async (roomId: number) => {
    if (currentFetchingRoomId.current === roomId)
      return [];
    currentFetchingRoomId.current = roomId;
    try {
      const db = await loadChatHistoryDb();
      const persistedMessages = await db.getMessagesByRoomId(roomId);
      const messages = await stripPersistedOptimisticDuplicates(persistedMessages);
      if (currentFetchingRoomId.current !== roomId) {
        return [];
      }
      const newMessages = await fetchNewestMessages(getRoomHistoryFetchStartSyncId(messages) - 1);
      if (currentFetchingRoomId.current !== roomId) {
        return [];
      }

      return mergeRoomMessagesForLocalState(messages, newMessages);
    }
    finally {
      if (currentFetchingRoomId.current === roomId) {
        currentFetchingRoomId.current = null;
      }
    }
  }, [fetchNewestMessages, stripPersistedOptimisticDuplicates]);

  /**
   * 清空当前房间的聊天记录
   */
  const clearHistory = useCallback(async () => {
    if (roomId === null)
      return;
    try {
      const db = await loadChatHistoryDb();
      await db.clearMessagesByRoomId(roomId);
      updateRoomMessages(roomId, () => []);
    }
    catch (err) {
      setError(err as Error);
    }
  }, [queryClient, roomId, updateRoomMessages]);

  /**
   * 初始加载聊天记录
   */
  useEffect(() => {
    if (roomId === null) {
      setLoading(false);
      return;
    }

    setLoading(getCurrentRoomMessages(roomId).length === 0);
    let isCancelled = false; // Flag to prevent state updates from stale effects

    const loadAndFetch = async () => {
      try {
        // SQLite 加载本地历史记录
        const db = await loadChatHistoryDb();
        const persistedLocalHistory = await db.getMessagesByRoomId(roomId);
        const localHistory = await stripPersistedOptimisticDuplicates(persistedLocalHistory);
        if (isCancelled)
          return;
        // 读取本地快照后仍经过共享合并，避免旧缓存复活 tombstone 或保留重复乐观消息。
        const sortedLocalHistory = mergeRoomMessagesForLocalState(localHistory, []);
        // SQLite 返回期间可能已经发送了首条消息，合并当前房间热态以保留乐观消息。
        updateRoomMessages(
          roomId,
          currentMessages => mergeLoadedRoomHistory(roomId, sortedLocalHistory, currentMessages),
        );
        // 本地缓存读取完成后立即释放首屏，服务端增量补拉在后台合并进来。
        setLoading(false);
        void fetchNewestMessages(getRoomHistoryFetchStartSyncId(localHistory) - 1).catch((err) => {
          if (!isCancelled) {
            setError(err as Error);
          }
        });
      }
      catch (err) {
        if (!isCancelled) {
          setError(err as Error);
        }
      }
      finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    loadAndFetch();
    return () => {
      isCancelled = true;
    };
  }, [fetchNewestMessages, getCurrentRoomMessages, roomId, stripPersistedOptimisticDuplicates, updateRoomMessages]);

  const refreshNewestMessages = useCallback(() => {
    const currentRoomId = roomIdRef.current;
    const currentMessages = currentRoomId === null ? EMPTY_ROOM_MESSAGES : getCurrentRoomMessages(currentRoomId);
    const maxSyncId = currentMessages.length > 0
      ? Math.max(...currentMessages.map(msg => msg.message.syncId))
      : -1;
    void fetchNewestMessages(maxSyncId).catch((err) => {
      setError(err as Error);
    });
  }, [fetchNewestMessages, getCurrentRoomMessages]);

  useEffect(() => {
    if (roomId === null || typeof window === "undefined") {
      return;
    }

    const handleRoomMessagesReceived = (event: Event) => {
      if (!isRoomMessagesReceivedEvent(event)) {
        return;
      }
      if (event.detail.roomId !== roomIdRef.current) {
        return;
      }
      void addReceivedRoomMessages(event.detail.messages);
    };

    window.addEventListener(ROOM_MESSAGES_RECEIVED_EVENT, handleRoomMessagesReceived);
    return () => {
      window.removeEventListener(ROOM_MESSAGES_RECEIVED_EVENT, handleRoomMessagesReceived);
    };
  }, [addReceivedRoomMessages, roomId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // 当页面从后台切换到前台时
      if (document.visibilityState === "visible") {
        refreshNewestMessages();
      }
    };
    const handleWsReconnected = () => {
      // WS 重连后立即做一次增量补拉，覆盖离线期间产生的消息变更。
      refreshNewestMessages();
    };

    // 添加事件监听
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(WS_RECONNECTED_EVENT, handleWsReconnected);

    // 组件卸载时，清理事件监听器，防止内存泄漏
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(WS_RECONNECTED_EVENT, handleWsReconnected);
    };
  }, [refreshNewestMessages]);

  return {
    messages: messagesWithoutDeletedMessages,
    latestSyncId,
    loading,
    error,
    addOrUpdateMessage, // 用于单条消息
    addOrUpdateMessages, // 用于批量消息
    commitEditorMessages,
    applyOptimisticMessages,
    rollbackOptimisticMessages,
    removeMessageById,
    replaceMessageById,
    resolveMessageId,
    getMessagesByRoomId,
    clearHistory,
  };
}

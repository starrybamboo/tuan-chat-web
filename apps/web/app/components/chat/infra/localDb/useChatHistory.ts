import {
  collectPersistedOptimisticDuplicateIds,
  commitOptimisticRoomMessageInList,
  mergeRoomMessagesForLocalState,
} from "@tuanchat/query/room-message-lifecycle";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessageResponse } from "../../../../../api";

import { tuanchat } from "../../../../../api/instance";
import { loadChatHistoryDb } from "./chatHistoryDbLoader";
import { logMessageOrderChange } from "./messageOrderDebug";

const WS_RECONNECTED_EVENT = "tc:ws-reconnected";
const MESSAGE_ID_ALIAS_MAX_AGE_MS = 10 * 60 * 1000;

export type UseChatHistoryReturn = {
  messages: ChatMessageResponse[];
  latestSyncId: number;
  loading: boolean;
  error: Error | null;
  addOrUpdateMessage: (message: ChatMessageResponse) => Promise<void>;
  addOrUpdateMessages: (messages: ChatMessageResponse[]) => Promise<void>;
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
  const [messagesRaw, setMessages] = useState<ChatMessageResponse[]>([]);
  const messagesWithoutDeletedMessages = useMemo(() => {
    return (messagesRaw ?? []).filter(msg => msg.message.status !== 1);
  }, [messagesRaw]);
  const latestSyncId = useMemo(() => {
    return (messagesRaw ?? []).reduce((max, item) => {
      const syncId = item.message.syncId;
      return typeof syncId === "number" && Number.isFinite(syncId) ? Math.max(max, syncId) : max;
    }, -1);
  }, [messagesRaw]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const messageIdAliasRef = useRef<Map<number, { toMessageId: number; updatedAt: number }>>(new Map());

  // 使用 ref 保存最新的 roomId，避免依赖变化导致回调重新创建
  const roomIdRef = useRef<number | null>(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const messagesRawRef = useRef<ChatMessageResponse[]>([]);
  useEffect(() => {
    messagesRawRef.current = messagesRaw;
  }, [messagesRaw]);

  const cleanupMessageIdAlias = useCallback(() => {
    const now = Date.now();
    for (const [fromMessageId, alias] of messageIdAliasRef.current.entries()) {
      if (now - alias.updatedAt > MESSAGE_ID_ALIAS_MAX_AGE_MS) {
        messageIdAliasRef.current.delete(fromMessageId);
      }
    }
  }, []);

  const setMessageIdAlias = useCallback((fromMessageId: number, toMessageId: number) => {
    if (!Number.isFinite(fromMessageId) || !Number.isFinite(toMessageId) || fromMessageId === toMessageId) {
      return;
    }
    cleanupMessageIdAlias();
    messageIdAliasRef.current.set(fromMessageId, {
      toMessageId,
      updatedAt: Date.now(),
    });
  }, [cleanupMessageIdAlias]);

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
    let currentMessageId = messageId;
    const visited = new Set<number>();
    while (!visited.has(currentMessageId)) {
      visited.add(currentMessageId);
      const alias = messageIdAliasRef.current.get(currentMessageId);
      if (!alias) {
        break;
      }
      currentMessageId = alias.toMessageId;
    }
    return currentMessageId;
  }, [cleanupMessageIdAlias]);

  /**
   * 批量添加或更新消息到当前房间，并同步更新UI状态
   * @param newMessages 要处理的消息数组
   */
  const addOrUpdateMessages = useCallback(
    async (newMessages: ChatMessageResponse[]) => {
      if (newMessages.length === 0)
        return;

      // 先更新状态
      // 由于获取消息是异步的，这里的roomId可能是过时的，所以要检查一下。
      const currentRoomId = roomIdRef.current;
      const roomScopedMessages = newMessages.filter(msg => msg.message.roomId === currentRoomId);
      if (roomScopedMessages.length > 0 && roomScopedMessages[0].message.roomId === currentRoomId) {
        setMessages((prevMessages) => {
          const nextMessages = mergeRoomMessagesForLocalState(prevMessages, roomScopedMessages);
          if (JSON.stringify(prevMessages) === JSON.stringify(nextMessages)) {
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

      // 异步将消息批量存入数据库
      try {
        const db = await loadChatHistoryDb();
        await db.addOrUpdateMessagesBatch(newMessages);
        const duplicateIds = collectPersistedOptimisticDuplicateIds(
          mergeRoomMessagesForLocalState(messagesRawRef.current, newMessages),
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
    [], // ← 移除依赖，使用 ref 代替
  );

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

    setMessages((prevMessages) => {
      const nextMessages = prevMessages.filter(msg => msg.message.messageId !== messageId);
      if (nextMessages.length !== prevMessages.length) {
        logMessageOrderChange({
          source: "removeMessageById",
          roomId: roomIdRef.current,
          prevMessages,
          nextMessages,
          incomingMessageIds: [messageId],
        });
      }
      return nextMessages.length === prevMessages.length ? prevMessages : nextMessages;
    });

    try {
      const db = await loadChatHistoryDb();
      await db.markMessagesDeletedByIds([messageId]);
    }
    catch (err) {
      setError(err as Error);
      console.error(`Failed to remove message ${messageId} for room ${roomIdRef.current}:`, err);
    }
  }, []);

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

    setMessages((prevMessages) => {
      const baselineMessages = shouldRenderNextMessage && fromMessageId !== nextMessage.messageId
        ? commitOptimisticRoomMessageInList(prevMessages, fromMessageId, nextMessage)
        : prevMessages.filter(item => item.message.messageId !== fromMessageId || shouldRenderNextMessage);
      const nextMessages = shouldRenderNextMessage
        ? mergeRoomMessagesForLocalState(baselineMessages, [message])
        : baselineMessages;
      mergedForDb = nextMessages.find(item => item.message.messageId === nextMessage.messageId) ?? message;

      if (JSON.stringify(prevMessages) === JSON.stringify(nextMessages)) {
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

    try {
      const db = await loadChatHistoryDb();
      if (fromMessageId !== nextMessage.messageId) {
        await db.deleteMessagesByIds([fromMessageId]);
      }
      await db.addOrUpdateMessagesBatch([mergedForDb]);
    }
    catch (err) {
      setError(err as Error);
      console.error(`Failed to replace message ${fromMessageId} for room ${currentRoomId}:`, err);
    }
  }, [setMessageIdAlias]);

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
      const maxSyncId = messages.length > 0
        ? Math.max(...messages.map(msg => msg.message.syncId))
        : -1;
      const newMessages = await fetchNewestMessages(maxSyncId);
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
      setMessages([]);
    }
    catch (err) {
      setError(err as Error);
    }
  }, [roomId]);

  /**
   * 初始加载聊天记录
   */
  useEffect(() => {
    if (roomId === null) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessages([]);
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
        setMessages(sortedLocalHistory);
        // 本地缓存读取完成后立即释放首屏，服务端增量补拉在后台合并进来。
        setLoading(false);
        const localMaxSyncId = localHistory.length > 0
          ? Math.max(...localHistory.map(msg => msg.message.syncId))
          : -1;

        void fetchNewestMessages(localMaxSyncId).catch((err) => {
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
  }, [roomId, fetchNewestMessages, stripPersistedOptimisticDuplicates]);

  const refreshNewestMessages = useCallback(() => {
    const maxSyncId = messagesRawRef.current.length > 0
      ? Math.max(...messagesRawRef.current.map(msg => msg.message.syncId))
      : -1;
    void fetchNewestMessages(maxSyncId).catch((err) => {
      setError(err as Error);
    });
  }, [fetchNewestMessages]);

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
    removeMessageById,
    replaceMessageById,
    resolveMessageId,
    getMessagesByRoomId,
    clearHistory,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessageResponse } from "../../../../../api";

import { tuanchat } from "../../../../../api/instance";
import {
  addOrUpdateMessagesBatch as dbAddOrUpdateMessages,
  clearMessagesByRoomId as dbClearMessages,
  getMessagesByRoomId as dbGetMessagesByRoomId,
} from "./chatHistoryDb";

const WS_RECONNECTED_EVENT = "tc:ws-reconnected";

export type UseChatHistoryReturn = {
  messages: ChatMessageResponse[];
  loading: boolean;
  error: Error | null;
  addOrUpdateMessage: (message: ChatMessageResponse) => Promise<void>;
  addOrUpdateMessages: (messages: ChatMessageResponse[]) => Promise<void>;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 使用 ref 保存最新的 roomId，避免依赖变化导致回调重新创建
  const roomIdRef = useRef<number | null>(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

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
      if (newMessages[0].message.roomId === roomIdRef.current) {
        setMessages((prevMessages) => {
          const messageMap = new Map(prevMessages.map(msg => [msg.message.messageId, msg]));
          let hasChanges = false;

          newMessages.filter(msg => msg.message.roomId === roomIdRef.current)
            .forEach((msg) => {
              const existingMsg = messageMap.get(msg.message.messageId);
              // 只有在消息真正变化时才更新
              if (!existingMsg || JSON.stringify(existingMsg) !== JSON.stringify(msg)) {
                messageMap.set(msg.message.messageId, msg);
                hasChanges = true;
              }
            });

          // 如果没有变化，返回原数组以避免不必要的重渲染
          if (!hasChanges) {
            return prevMessages;
          }

          const updatedMessages = Array.from(messageMap.values());
          // 按 position 排序确保顺序
          return updatedMessages.sort((a, b) => a.message.position - b.message.position);
        });
      }

      // 异步将消息批量存入数据库
      try {
        await dbAddOrUpdateMessages(newMessages);
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

    const messages = await dbGetMessagesByRoomId(roomId);
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

    return [...messages, ...newMessages].sort((a, b) => a.message.position - b.message.position);
  }, [fetchNewestMessages]);

  /**
   * 清空当前房间的聊天记录
   */
  const clearHistory = useCallback(async () => {
    if (roomId === null)
      return;
    try {
      await dbClearMessages(roomId);
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
        // IndexedDB 加载本地历史记录
        const localHistory = await dbGetMessagesByRoomId(roomId);
        if (isCancelled)
          return;
        // 按 position 排序后设置消息
        const sortedLocalHistory = localHistory.sort((a, b) => a.message.position - b.message.position);
        setMessages(sortedLocalHistory);
        const localMaxSyncId = localHistory.length > 0
          ? Math.max(...localHistory.map(msg => msg.message.syncId))
          : -1;

        // 有本地缓存时直接展示，服务端增量同步改为后台进行，避免切房间被网络请求阻塞。
        if (sortedLocalHistory.length > 0) {
          setLoading(false);
          void fetchNewestMessages(localMaxSyncId).catch((err) => {
            if (!isCancelled) {
              setError(err as Error);
            }
          });
          return;
        }

        await fetchNewestMessages(localMaxSyncId);
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
  }, [roomId, fetchNewestMessages]);

  // 监听页面状态, 如果重新页面处于可见状态，则尝试重新获取最新消息
  const messagesRawRef = useRef<ChatMessageResponse[]>([]);
  useEffect(() => {
    messagesRawRef.current = messagesRaw;
  }, [messagesRaw]);

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
    loading,
    error,
    addOrUpdateMessage, // 用于单条消息
    addOrUpdateMessages, // 用于批量消息
    getMessagesByRoomId,
    clearHistory,
  };
}

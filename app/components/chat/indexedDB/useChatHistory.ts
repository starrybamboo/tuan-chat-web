import { useCallback, useEffect, useMemo, useState } from "react";

import type { ChatMessageResponse } from "../../../../api";

import { tuanchat } from "../../../../api/instance";
import {
  addOrUpdateMessagesBatch as dbAddOrUpdateMessages,
  clearMessagesByRoomId as dbClearMessages,
  getMessagesByRoomId as dbGetMessagesByRoomId,
} from "./chatHistoryDb";

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
      if (newMessages[0].message.roomId === roomId) {
        setMessages((prevMessages) => {
          const messageMap = new Map(prevMessages.map(msg => [msg.message.messageId, msg]));
          newMessages.filter(msg => msg.message.roomId === roomId)
            .forEach(msg => messageMap.set(msg.message.messageId, msg));
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
        console.error(`Failed to batch save messages for room ${roomId}:`, err);
      }
    },
    [roomId],
  );

  /**
   * 添加或更新单条消息（作为批量操作的便捷封装）
   * @param message 要处理的单条消息
   */
  const addOrUpdateMessage = useCallback(
    async (message: ChatMessageResponse) => {
      if (roomId === null)
        return;
      // 调用批量处理函数
      await addOrUpdateMessages([message]);
    },
    [addOrUpdateMessages, roomId],
  );

  /**
   * 从服务器全量获取最新的消息
   */
  const fetchNewestMessages = useCallback(async (maxSyncId: number) => {
    if (roomId === null)
      return [];
    // 从服务器获取最新消息
    const serverResponse = await tuanchat.chatController.getHistoryMessages({
      roomId,
      syncId: maxSyncId + 1,
    });
    const newMessages = serverResponse.data ?? [];
    if (newMessages.length > 0) {
      await addOrUpdateMessages(newMessages);
    }
    return newMessages;
  }, [addOrUpdateMessages, roomId]);

  /**
   * 按照房间获取消息
   */
  const getMessagesByRoomId = useCallback(async (roomId: number) => {
    const messages = await dbGetMessagesByRoomId(roomId);
    const maxSyncId = messages.length > 0
      ? Math.max(...messages.map(msg => msg.message.syncId))
      : -1;
    const newMessages = await fetchNewestMessages(maxSyncId);
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
        setMessages(localHistory);
        const localMaxSyncId = localHistory.length > 0
          ? Math.max(...localHistory.map(msg => msg.message.syncId))
          : -1;
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
  }, [addOrUpdateMessages, roomId]);

  // 监听页面状态, 如果重新页面处于可见状态，则尝试重新获取最新消息
  useEffect(() => {
    const handleVisibilityChange = () => {
      // 当页面从后台切换到前台时
      if (document.visibilityState === "visible") {
        const maxSyncId = messagesRaw.length > 0
          ? Math.max(...messagesRaw.map(msg => msg.message.syncId))
          : -1;
        fetchNewestMessages(maxSyncId);
      }
    };

    // 添加事件监听
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 组件卸载时，清理事件监听器，防止内存泄漏
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [messagesRaw, fetchNewestMessages]);

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

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ChatMessageResponse, Message } from "../../../../api";

import { tuanchat } from "../../../../api/instance";
import {
  addOrUpdateMessagesBatch as dbAddOrUpdateMessages,
  clearMessagesByRoomId as dbClearMessages,
  getMessagesByRoomId as dbGetMessagesByRoomId,
} from "./chatHistoryDb";

export type UseChatHistoryReturn = {
  messages: ChatMessageResponse[];
  maxSyncId: number;
  loading: boolean;
  error: Error | null;
  addOrUpdateMessage: (message: Message) => Promise<void>;
  addOrUpdateMessages: (messages: Message[]) => Promise<void>;
  clearHistory: () => Promise<void>;
};
/**
 * 用于管理特定房间聊天记录的React Hook
 * @param roomId 要管理的房间ID
 */
export function useChatHistory(roomId: number | null): UseChatHistoryReturn {
  const [messagesRaw, setMessages] = useState<Message[]>([]);
  const messages: ChatMessageResponse[] = useMemo(() =>
    messagesRaw
      .filter(msg => msg.status !== 1)
      .map((msg) => { return { message: msg }; }), [messagesRaw]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 当前本地存储的消息的最大syncId
  const maxSyncId = useMemo(() => {
    if (!messages || messages.length === 0) {
      return -1;
    }
    return Math.max(...messages.map(msg => msg.message.syncId));
  }, [messages, roomId]);

  /**
   * 批量添加或更新消息到当前房间，并同步更新UI状态
   * @param newMessages 要处理的消息数组
   */
  const addOrUpdateMessages = useCallback(
    async (newMessages: Message[]) => {
      if (roomId === null || newMessages.length === 0)
        return;

      // 先更新状态
      setMessages((prevMessages) => {
        const messageMap = new Map(prevMessages.map(msg => [msg.messageID, msg]));
        newMessages.forEach(msg => messageMap.set(msg.messageID, msg));
        const updatedMessages = Array.from(messageMap.values());
        // 按 position 排序确保顺序
        return updatedMessages.sort((a, b) => a.position - b.position);
      });

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
    async (message: Message) => {
      if (roomId === null)
        return;
      // 调用批量处理函数
      await addOrUpdateMessages([message]);
    },
    [addOrUpdateMessages, roomId],
  );

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

  // 初始加载聊天记录
  useEffect(() => {
    if (roomId === null) {
      setMessages([]);
      setLoading(false);
      return;
    };

    setLoading(true);
    let isCancelled = false; // Flag to prevent state updates from stale effects

    const loadAndFetch = async () => {
      try {
        // IndexedDB 加载本地历史记录
        const localHistory = await dbGetMessagesByRoomId(roomId);
        if (isCancelled)
          return;
        setMessages(localHistory);

        const localMaxSyncId = localHistory.length > 0
          ? Math.max(...localHistory.map(msg => msg.syncId))
          : -1;

        // 从服务器获取最新消息
        const serverResponse = await tuanchat.chatController.getHistoryMessages({
          roomId,
          syncId: localMaxSyncId + 1,
        });
        if (isCancelled)
          return;

        const newMessages = serverResponse.data?.map(msg => msg.message) ?? [];
        if (newMessages.length > 0) {
          await addOrUpdateMessages(newMessages);
        }
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

  return {
    messages,
    maxSyncId,
    loading,
    error,
    addOrUpdateMessage, // 用于单条消息
    addOrUpdateMessages, // 用于批量消息
    clearHistory,
  };
}

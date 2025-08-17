import { useCallback, useEffect, useState } from "react";

import type { Message } from "../../../../api";

import {
  addOrUpdateMessagesBatch as dbAddOrUpdateMessages,
  clearMessagesByRoomId as dbClearMessages,
  getMessagesByRoomId as dbGetMessagesByRoomId,
} from "./chatHistoryDb";

export type UseChatHistoryReturn = {
  messages: Message[];
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 初始加载聊天记录
  useEffect(() => {
    if (roomId === null) {
      setMessages([]);
      setLoading(false);
      return;
    };

    let isMounted = true;
    setLoading(true);

    dbGetMessagesByRoomId(roomId)
      .then((history) => {
        if (isMounted)
          setMessages(history);
      })
      .catch((err) => {
        if (isMounted)
          setError(err);
      })
      .finally(() => {
        if (isMounted)
          setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  /**
   * 批量添加或更新消息到当前房间，并同步更新UI状态
   * @param newMessages 要处理的消息数组
   */
  const addOrUpdateMessages = useCallback(
    async (newMessages: Message[]) => {
      if (roomId === null || newMessages.length === 0)
        return;

      // 1. 优化UI更新逻辑
      setMessages((prevMessages) => {
        const messageMap = new Map(prevMessages.map(msg => [msg.messageID, msg]));
        newMessages.forEach(msg => messageMap.set(msg.messageID, msg));
        const updatedMessages = Array.from(messageMap.values());
        // 按 position 排序确保顺序
        return updatedMessages.sort((a, b) => a.position - b.position);
      });

      // 2. 异步将消息批量存入数据库
      try {
        await dbAddOrUpdateMessages(newMessages);
      }
      catch (err) {
        setError(err as Error);
        console.error(`Failed to batch save messages for room ${roomId}:`, err);
        // 可选：添加保存失败的回滚或错误提示逻辑
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

  return {
    messages,
    loading,
    error,
    addOrUpdateMessage, // 用于单条消息
    addOrUpdateMessages, // 用于批量消息
    clearHistory,
  };
}

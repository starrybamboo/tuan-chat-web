import { useEffect, useMemo, useRef } from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/indexedDB/useChatHistory";

import { filterVisibleChatMessages } from "@/components/chat/utils/hiddenDiceVisibility";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../api";

import { tuanchat } from "../../../../api/instance";

export type ChatFrameMessageScope = "main" | "thread";

type UseChatFrameMessagesParams = {
  messagesOverride?: ChatMessageResponse[];
  messageScope?: ChatFrameMessageScope;
  threadRootMessageId?: number | null;
  enableWsSync: boolean;
  roomId: number;
  chatHistory?: UseChatHistoryReturn;
  receivedMessages: ChatMessageResponse[];
  currentUserId?: number | null;
  currentMemberType?: number | null;
};

type UseChatFrameMessagesResult = {
  historyMessages: ChatMessageResponse[];
};

export default function useChatFrameMessages({
  messagesOverride,
  messageScope = "main",
  threadRootMessageId,
  enableWsSync,
  roomId,
  chatHistory,
  receivedMessages,
  currentUserId,
  currentMemberType,
}: UseChatFrameMessagesParams): UseChatFrameMessagesResult {
  const lastReceivedMessagesRef = useRef<Record<number, ChatMessageResponse[]>>({});

  useEffect(() => {
    if (!enableWsSync) {
      return;
    }
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    async function syncMessages() {
      const checkLoading = async (): Promise<void> => {
        if (isCancelled)
          return;

        if (chatHistory?.loading) {
          await new Promise<void>((resolve) => {
            timeoutId = setTimeout(() => {
              if (!isCancelled) {
                resolve();
              }
            }, 30);
          });
          // 递归检查，直到 loading 完成或被取消
          await checkLoading();
        }
      };
      await checkLoading();

      // 如果已取消或 chatHistory 不存在，直接返回
      if (isCancelled || !chatHistory)
        return;
      const previousReceivedMessages = lastReceivedMessagesRef.current[roomId] ?? [];
      if (receivedMessages.length < previousReceivedMessages.length) {
        // WS 缓冲被重置时，先重置本地游标；后续新增消息再按 tail 增量同步。
        lastReceivedMessagesRef.current[roomId] = [...receivedMessages];
        return;
      }

      const changedMessages: ChatMessageResponse[] = [];
      const overlapLength = Math.min(previousReceivedMessages.length, receivedMessages.length);
      for (let index = 0; index < overlapLength; index++) {
        if (previousReceivedMessages[index] !== receivedMessages[index]) {
          changedMessages.push(receivedMessages[index]);
        }
      }

      const appendedMessages = receivedMessages.length > previousReceivedMessages.length
        ? receivedMessages.slice(previousReceivedMessages.length)
        : [];

      const messagesToSync = Array.from(new Map(
        [...changedMessages, ...appendedMessages]
          .map(message => [message.message.messageId, message] as const),
      ).values());

      if (messagesToSync.length === 0) {
        lastReceivedMessagesRef.current[roomId] = [...receivedMessages];
        return;
      }

      // 补洞逻辑只针对真正新增的 tail 消息；同 ID 更新不需要补洞。
      const historyMsgs = chatHistory.messages;
      if (historyMsgs.length > 0 && appendedMessages.length > 0) {
        let maxHistorySyncId = -1;
        const knownMessageIds = new Set<number>();

        for (const msg of historyMsgs) {
          const syncId = msg.message.syncId ?? -1;
          if (syncId > maxHistorySyncId)
            maxHistorySyncId = syncId;
          knownMessageIds.add(msg.message.messageId);
        }

        let maxProcessedSyncId = -1;
        for (const msg of previousReceivedMessages) {
          const syncId = msg.message.syncId ?? -1;
          if (syncId > maxProcessedSyncId)
            maxProcessedSyncId = syncId;
          knownMessageIds.add(msg.message.messageId);
        }

        let maxKnownSyncId = Math.max(maxHistorySyncId, maxProcessedSyncId);
        let missingStartSyncId: number | null = null;
        let gapIncomingSyncId: number | null = null;

        for (const msg of appendedMessages) {
          const syncId = msg.message.syncId ?? -1;
          const messageId = msg.message.messageId;

          if (knownMessageIds.has(messageId)) {
            if (syncId > maxKnownSyncId) {
              maxKnownSyncId = syncId;
            }
            continue;
          }

          if (syncId > maxKnownSyncId + 1) {
            missingStartSyncId = maxKnownSyncId + 1;
            gapIncomingSyncId = syncId;
            break;
          }

          if (syncId > maxKnownSyncId) {
            maxKnownSyncId = syncId;
          }
          knownMessageIds.add(messageId);
        }

        if (missingStartSyncId !== null && gapIncomingSyncId !== null) {
          console.warn(`[ChatFrame] Detected gap from syncId ${missingStartSyncId} before incoming message syncId ${gapIncomingSyncId}. Fetching missing messages...`);
          try {
            const missingMessagesRes = await tuanchat.chatController.getHistoryMessages({
              roomId,
              syncId: missingStartSyncId,
            });
            if (missingMessagesRes.data && missingMessagesRes.data.length > 0) {
              await chatHistory.addOrUpdateMessages(missingMessagesRes.data);
            }
          }
          catch (e) {
            console.error("[ChatFrame] Failed to fetch missing messages:", e);
          }
        }
      }

      await chatHistory.addOrUpdateMessages(messagesToSync);
      lastReceivedMessagesRef.current[roomId] = [...receivedMessages];
    }

    syncMessages();

    // 清理函数：取消异步操作和定时器
    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [chatHistory, enableWsSync, receivedMessages, roomId]);

  const historyMessages: ChatMessageResponse[] = useMemo(() => {
    if (messagesOverride) {
      return filterVisibleChatMessages(messagesOverride, {
        currentUserId,
        memberType: currentMemberType,
      });
    }
    const allMessages = filterVisibleChatMessages(chatHistory?.messages ?? [], {
      currentUserId,
      memberType: currentMemberType,
    });

    if (messageScope === "thread") {
      if (!threadRootMessageId) {
        return [];
      }
      return allMessages.filter(m => m.message.threadId === threadRootMessageId);
    }

    // Discord 风格：Thread 回复不出现在主消息流中，只在 Thread 面板中查看
    // - root：threadId === messageId（显示）
    // - reply：threadId !== messageId（隐藏）
    return allMessages.filter((m) => {
      // Thread Root #0001（不在主消息流中单独显示：改为挂在原消息“下方”的提示）
      if (m.message.messageType === MESSAGE_TYPE.THREAD_ROOT) {
        return false;
      }
      const { threadId, messageId } = m.message;
      if (!threadId) {
        return true;
      }
      return threadId === messageId;
    });
  }, [chatHistory?.messages, currentMemberType, currentUserId, messageScope, messagesOverride, threadRootMessageId]);

  return {
    historyMessages,
  };
}

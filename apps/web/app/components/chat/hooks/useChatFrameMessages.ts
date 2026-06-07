import { useEffect, useMemo, useRef } from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/localDb/useChatHistory";

import { filterVisibleChatMessages } from "@/components/chat/utils/hiddenDiceVisibility";
import { getRoomMessageSyncGapStart, mergeRoomMessages } from "@tuanchat/query/room-message";

import type { ChatMessageResponse } from "../../../../api";

import { tuanchat } from "../../../../api/instance";

type UseChatFrameMessagesParams = {
  messagesOverride?: ChatMessageResponse[];
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

type MissingMessageSyncRangeParams = {
  historyMessages: ChatMessageResponse[];
  previousReceivedMessages: ChatMessageResponse[];
  appendedMessages: ChatMessageResponse[];
  latestHistorySyncId?: number;
};

export function detectMissingMessageSyncRange({
  historyMessages,
  previousReceivedMessages,
  appendedMessages,
  latestHistorySyncId = -1,
}: MissingMessageSyncRangeParams): { missingStartSyncId: number; gapIncomingSyncId: number } | null {
  if (historyMessages.length === 0 || appendedMessages.length === 0) {
    return null;
  }

  const baselineMessages = Number.isFinite(latestHistorySyncId) && latestHistorySyncId >= 0
    ? [{
        message: {
          ...historyMessages[0].message,
          messageId: Number.MIN_SAFE_INTEGER,
          syncId: latestHistorySyncId,
        },
      } satisfies ChatMessageResponse]
    : [];
  let knownMessages = mergeRoomMessages(historyMessages, previousReceivedMessages, baselineMessages);

  for (const msg of appendedMessages) {
    const syncId = msg.message.syncId ?? -1;
    const missingStartSyncId = getRoomMessageSyncGapStart(knownMessages, msg);
    if (missingStartSyncId !== null) {
      return {
        missingStartSyncId,
        gapIncomingSyncId: syncId,
      };
    }
    knownMessages = mergeRoomMessages(knownMessages, [msg]);
  }

  return null;
}

export default function useChatFrameMessages({
  messagesOverride,
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

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
        const missingRange = detectMissingMessageSyncRange({
          historyMessages: historyMsgs,
          previousReceivedMessages,
          appendedMessages,
          latestHistorySyncId: chatHistory.latestSyncId,
        });

        if (missingRange) {
          console.warn(`[ChatFrame] Detected gap from syncId ${missingRange.missingStartSyncId} before incoming message syncId ${missingRange.gapIncomingSyncId}. Fetching missing messages...`);
          try {
            const missingMessagesRes = await tuanchat.chatController.getHistoryMessages({
              roomId,
              syncId: missingRange.missingStartSyncId,
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
    return allMessages;
  }, [chatHistory?.messages, currentMemberType, currentUserId, messagesOverride]);

  return {
    historyMessages,
  };
}

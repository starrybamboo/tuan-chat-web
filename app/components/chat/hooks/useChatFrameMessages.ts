import { useEffect, useMemo, useRef } from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/indexedDB/useChatHistory";

import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../api";

import { tuanchat } from "../../../../api/instance";

export type ThreadHintMeta = {
  rootId: number;
  title: string;
  replyCount: number;
};

type UseChatFrameMessagesParams = {
  messagesOverride?: ChatMessageResponse[];
  enableWsSync: boolean;
  roomId: number;
  chatHistory?: UseChatHistoryReturn;
  receivedMessages: ChatMessageResponse[];
};

type UseChatFrameMessagesResult = {
  historyMessages: ChatMessageResponse[];
  threadHintMetaByMessageId: Map<number, ThreadHintMeta>;
};

export default function useChatFrameMessages({
  messagesOverride,
  enableWsSync,
  roomId,
  chatHistory,
  receivedMessages,
}: UseChatFrameMessagesParams): UseChatFrameMessagesResult {
  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const lastLengthMapRef = useRef<Record<number, number>>({});

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
      const lastLength = lastLengthMapRef.current[roomId] ?? 0;
      if (lastLength < receivedMessages.length) {
        const newMessages = receivedMessages.slice(lastLength);

        // 补洞逻辑：检查新消息的第一条是否与历史消息的最后一条连接
        const historyMsgs = chatHistory.messages;
        if (historyMsgs.length > 0 && newMessages.length > 0) {
          const lastHistoryMsg = historyMsgs[historyMsgs.length - 1];
          const firstNewMsg = newMessages[0];

          if (firstNewMsg.message.syncId > lastHistoryMsg.message.syncId + 1) {
            console.warn(`[ChatFrame] Detected gap between history (${lastHistoryMsg.message.syncId}) and new messages (${firstNewMsg.message.syncId}). Fetching missing messages...`);
            try {
              const missingMessagesRes = await tuanchat.chatController.getHistoryMessages({
                roomId,
                syncId: lastHistoryMsg.message.syncId + 1,
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

        await chatHistory.addOrUpdateMessages(newMessages);
        lastLengthMapRef.current[roomId] = receivedMessages.length;
      }
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
      return messagesOverride;
    }
    const allMessages = chatHistory?.messages ?? [];

    // 子区视图：仅展示当前 thread（包含 thread root 与回复）
    if (composerTarget === "thread" && threadRootMessageId) {
      return allMessages.filter((m) => {
        const threadId = m.message.threadId;
        return !!threadId && threadId === threadRootMessageId;
      });
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
  }, [messagesOverride, chatHistory?.messages, composerTarget, threadRootMessageId]);

  const threadHintMetaByMessageId = useMemo(() => {
    // key: parentMessageId（被创建子区的那条原消息）
    const metaMap = new Map<number, ThreadHintMeta>();
    const all = chatHistory?.messages ?? [];
    if (all.length === 0) {
      return metaMap;
    }

    // rootId -> replyCount
    const replyCountByRootId = new Map<number, number>();
    for (const item of all) {
      const { threadId, messageId } = item.message;
      if (threadId && threadId !== messageId) {
        replyCountByRootId.set(threadId, (replyCountByRootId.get(threadId) ?? 0) + 1);
      }
    }

    // parentMessageId -> latest root
    for (const item of all) {
      const mm = item.message;
      const isRoot = mm.messageType === MESSAGE_TYPE.THREAD_ROOT && mm.threadId === mm.messageId;
      const parentId = mm.replyMessageId;
      if (!isRoot || !parentId) {
        continue;
      }

      const title = (mm.extra as any)?.title || mm.content;
      const next: ThreadHintMeta = {
        rootId: mm.messageId,
        title,
        replyCount: replyCountByRootId.get(mm.messageId) ?? 0,
      };

      const prev = metaMap.get(parentId);
      // 极端情况下可能存在多个 root：取 messageId 更新的那条
      if (!prev || next.rootId > prev.rootId) {
        metaMap.set(parentId, next);
      }
    }

    return metaMap;
  }, [chatHistory?.messages]);

  return {
    historyMessages,
    threadHintMetaByMessageId,
  };
}

import {
  buildDirectMessageRetryRequest,
  findDirectReplyMessage,
  isFailedDirectMessage,
} from "@tuanchat/domain/direct-message";
import { useCallback } from "react";

import { appToast } from "@/components/common/appToast/appToast";
import { useGlobalWebSocket } from "@/components/globalContextProvider";

import type { MessageDirectResponse } from "../../../../api";

import { useScroll } from "../hooks/useScroll";
import { sendDirectMessageWithOptimisticRetention } from "../hooks/usePrivateMessageSender";
import { buildPrivateChatTimelineEntries } from "../utils/privateChatTimeline";
import MessageBubble from "./MessageBubble";
import UserSearch from "./UserSearch";

function isSameSender(previousMessage: MessageDirectResponse | undefined, message: MessageDirectResponse) {
  return previousMessage?.senderId != null && previousMessage.senderId === message.senderId;
}

export default function MessageWindow({
  currentContactUserId,
  allMessages,
  userId,
}: {
  currentContactUserId: number | null;
  allMessages: MessageDirectResponse[];
  userId: number;
}) {
  const webSocketUtils = useGlobalWebSocket();
  // 消息列表滚动hook（消息）
  const { scrollContainerRef, messagesLatestRef } = useScroll({ currentContactUserId, allMessages });
  const timelineEntries = buildPrivateChatTimelineEntries(allMessages);
  const handleRemoveFailedMessage = useCallback((message: MessageDirectResponse) => {
    if (!isFailedDirectMessage(message) || typeof message.messageId !== "number") {
      return;
    }
    webSocketUtils.removeOptimisticDirectMessage(message.messageId);
  }, [webSocketUtils]);
  const handleRetryFailedMessage = useCallback(async (message: MessageDirectResponse) => {
    if (!isFailedDirectMessage(message) || typeof message.messageId !== "number") {
      return;
    }
    const retryRequest = buildDirectMessageRetryRequest(message);
    if (!retryRequest) {
      appToast.error("这条消息暂时无法重新发送");
      return;
    }

    let replacementCreated = false;
    try {
      const sent = await sendDirectMessageWithOptimisticRetention(
        webSocketUtils,
        retryRequest,
        () => {
          replacementCreated = true;
          webSocketUtils.removeOptimisticDirectMessage(message.messageId!);
        },
      );
      if (!replacementCreated) {
        appToast.error("当前无法创建待发送消息，请稍后重试");
      }
      else if (!sent) {
        appToast.error("私聊消息发送失败，可再次重试");
      }
    }
    catch (error) {
      console.error("重新发送私聊消息失败", error);
      appToast.error("私聊消息发送失败，可再次重试");
    }
  }, [webSocketUtils]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 w-full overflow-auto p-4 relative bg-base-100"
    >
      {currentContactUserId
      // 1. 与当前联系人的聊天页面
        ? (
            <div key={currentContactUserId} className="
              private-direct-message-list-entry flex flex-col gap-1 px-1 py-2
            ">
              {/* 消息列表项 */}
              {timelineEntries.map((entry, index) => {
                if (entry.type === "date-divider") {
                  return (
                    <div
                      key={`date-divider-${index}-${entry.label}`}
                      className="
                        flex items-center gap-3 py-3 text-xs
                        text-base-content/50
                      "
                    >
                      <div className="h-px flex-1 bg-base-content/10" />
                      <span className="
                        shrink-0 rounded-full bg-base-200 px-3 py-1 font-medium
                        tracking-wide
                      ">
                        {entry.label}
                      </span>
                      <div className="h-px flex-1 bg-base-content/10" />
                    </div>
                  );
                }

                const groupedWithPrevious = isSameSender(allMessages[entry.messageIndex - 1], entry.message);
                const replyMessage = findDirectReplyMessage(allMessages, entry.message.replyMessageId);
                return (
                  <MessageBubble
                    key={entry.message.messageId}
                    message={entry.message}
                    replyMessage={replyMessage}
                    isOwn={entry.message.senderId === userId}
                    groupedWithPrevious={groupedWithPrevious}
                    onRemoveFailed={() => handleRemoveFailedMessage(entry.message)}
                    onRetryFailed={() => void handleRetryFailedMessage(entry.message)}
                  />
                );
              })}

              {/* 滚动锚点 */}
              <div ref={messagesLatestRef} />
            </div>
          )
        : (
      // 搜索用户
            <UserSearch />
          )}
    </div>
  );
}

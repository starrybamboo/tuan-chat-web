import { useMemo } from "react";

import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { DirectMessageEvent } from "api/wsModels";

import { useGlobalWebSocket } from "@/components/globalContextProvider";
import { mergeDirectMessages } from "@tuanchat/domain/direct-message";
import { useGetUserInfoQuery } from "api/hooks/UserHooks";

export function usePrivateMessageReceiver(userId: number, currentContactUserId: number | null, historyMessages: MessageDirectResponse[]) {
  const webSocketUtils = useGlobalWebSocket();

  // 当前联系人信息
  const currentContactUserInfo = useGetUserInfoQuery(currentContactUserId || -1).data?.data;

  // 当前选中联系人从 WebSocket 接收到的实时消息
  const currentContactMessages = useMemo(() => {
    return getDirectMessagesForConversation(
      webSocketUtils.receivedDirectMessages,
      userId,
      currentContactUserId,
    );
  }, [webSocketUtils.receivedDirectMessages, userId, currentContactUserId]);

  // 合并历史消息和实时消息
  const allMessages = useMemo(() => {
    return mergeConversationMessages(historyMessages, currentContactMessages);
  }, [historyMessages, currentContactMessages]);

  return { currentContactUserId, currentContactUserInfo, allMessages };
}

export function getDirectMessagesForConversation(
  receivedDirectMessages: Record<number, DirectMessageEvent[]>,
  userId: number,
  currentContactUserId: number | null,
): DirectMessageEvent[] {
  if (!currentContactUserId || userId <= 0) {
    return [];
  }

  const channelMessages = receivedDirectMessages[currentContactUserId] ?? [];
  const legacySelfKeyMessages = receivedDirectMessages[userId] ?? [];
  const messages = mergeDirectMessages(channelMessages, legacySelfKeyMessages);
  return messages.filter((msg) => {
    return (
      msg.senderId === userId && msg.receiverId === currentContactUserId
    ) || (
      msg.senderId === currentContactUserId && msg.receiverId === userId
    );
  });
}

export function mergeConversationMessages(
  historyMessages: MessageDirectResponse[],
  currentContactMessages: DirectMessageEvent[],
): Array<MessageDirectResponse | DirectMessageEvent> {
  return mergeDirectMessages(historyMessages, currentContactMessages)
    .filter(msg => msg.messageType !== 10000);
}

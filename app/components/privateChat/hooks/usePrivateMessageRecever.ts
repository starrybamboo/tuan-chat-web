import { useMemo } from "react";

import type { MessageDirectResponse } from "api/models/MessageDirectResponse";
import type { DirectMessageEvent } from "api/wsModels";

import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetUserInfoQuery } from "api/queryHooks";

export function usePrivateMessageReceiver(userId: number, currentContactUserId: number | null, historyMessages: MessageDirectResponse[]) {
  const globalContext = useGlobalContext();
  const webSocketUtils = globalContext.websocketUtils;

  // 当前联系人信息
  const currentContactUserInfo = useGetUserInfoQuery(currentContactUserId || -1).data?.data;

  // 当前选中联系人从 WebSocket 接收到的实时消息
  const currentContactMessages = useMemo(() => {
    if (!currentContactUserId)
      return [];
    const userMessages = webSocketUtils.receivedDirectMessages[userId] || []; // senderId 为 userId
    const contactUserMessages = webSocketUtils.receivedDirectMessages[currentContactUserId] || []; // senderId 为 currentContactUserId
    // 筛选出与当前联系人相关的消息
    const filteredUserMessages = userMessages.filter(msg =>
      msg.receiverId === currentContactUserId, // 用户发给当前联系人的消息
    );
    const filteredContactMessages = contactUserMessages.filter(msg =>
      msg.senderId === currentContactUserId && msg.receiverId === userId, // 当前联系人发给用户的消息
    );
    return [...filteredUserMessages, ...filteredContactMessages];
  }, [webSocketUtils.receivedDirectMessages, userId, currentContactUserId]);

  // 合并历史消息和实时消息
  const allMessages = useMemo(() => {
    return mergeMessages(historyMessages, currentContactMessages);
  }, [historyMessages, currentContactMessages]);

  return { currentContactUserId, currentContactUserInfo, allMessages };
}

function mergeMessages(historyMessages: MessageDirectResponse[], currentContactMessages: DirectMessageEvent[]) {
  const messageMap = new Map<number, MessageDirectResponse>();

  historyMessages.forEach(msg => messageMap.set(msg.messageId || 0, msg));
  currentContactMessages.forEach(msg => messageMap.set(msg.messageId, msg));

  // 按消息位置排序，确保消息显示顺序正确
  const allMessages = Array.from(messageMap.values())
    .sort((a, b) => (a.messageId ?? 0) - (b.messageId ?? 0))
    .filter(msg => msg.messageType !== 10000);

  return allMessages;
}

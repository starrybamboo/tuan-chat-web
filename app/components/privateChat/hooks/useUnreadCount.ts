import { useCallback, useEffect, useMemo, useRef } from "react";

import { useUpdateReadPositionMutation } from "api/hooks/MessageDirectQueryHooks";

import type { MessageDirectType } from "../Left​​ChatList​​";

export function useUnreadCount({ realTimeContacts, sortedRealTimeMessages, userId, urlRoomId }: { realTimeContacts: number[]; sortedRealTimeMessages: [string, MessageDirectType[]][]; userId: number; urlRoomId: string | undefined }) {
  const prevUrlRoomIdRef = useRef<string | undefined>(urlRoomId);

  const unreadMessageNumbers = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const contactId of realTimeContacts) {
      counts[contactId] = getUnreadMessageNumber(sortedRealTimeMessages, contactId, userId);
    }
    return counts;
  }, [realTimeContacts, sortedRealTimeMessages, userId]);

  // 更新未读消息 Readline 位置
  const updateReadPositionMutation = useUpdateReadPositionMutation();

  const updateReadlinePosition = useCallback((contactId: number) => {
    if (contactId !== userId) {
      updateReadPositionMutation.mutate({ targetUserId: contactId });
    }
  }, [updateReadPositionMutation, userId]);

  // 监听 urlRoomId 变化，更新之前的已读位置
  useEffect(() => {
    const prevUrlRoomId = prevUrlRoomIdRef.current;

    if (prevUrlRoomId && prevUrlRoomId !== urlRoomId) {
      const prevContactId = Number.parseInt(prevUrlRoomId);
      updateReadlinePosition(prevContactId);
    }
    prevUrlRoomIdRef.current = urlRoomId;
  }, [urlRoomId, updateReadlinePosition, userId]);

  return { unreadMessageNumbers, updateReadlinePosition };
}

function getUnreadMessageNumber(sortedRealTimeMessages: [string, MessageDirectType[]][], contactId: number, userId: number) {
  const messages = sortedRealTimeMessages.find(([id]) => Number(id) === contactId)?.[1] || [];
  const latestMessageIndex = messages.findIndex(msg => msg.messageType !== 10000 && msg.senderId === contactId);
  const latestMessageSync = messages.find(msg => msg.messageType !== 10000 && msg.senderId === contactId)?.syncId || 0;
  const readlineIndex = messages.findIndex(msg => msg.messageType === 10000 && msg.senderId === userId);
  const readlineSync = messages.find(msg => msg.messageType === 10000 && msg.senderId === userId)?.syncId || 0;

  // 如果没有未读消息
  if (latestMessageSync <= readlineSync) {
    return 0;
  }

  let unreadCount = 0;
  let index = readlineIndex;
  while (index >= latestMessageIndex || index > -1) {
    if (messages[index]?.senderId === contactId && messages[index]?.messageType !== 10000) {
      unreadCount++;
    }
    index--;
  }

  return unreadCount;
}

import { useCallback, useEffect, useMemo, useRef } from "react";

import { useUpdateReadPositionMutation } from "api/hooks/MessageDirectQueryHooks";

import type { MessageDirectType } from "../types/messageDirect";

export function useUnreadCount({ realTimeContacts, sortedRealTimeMessages, userId, urlRoomId, isInboxReady }: { realTimeContacts: number[]; sortedRealTimeMessages: [string, MessageDirectType[]][]; userId: number; urlRoomId: string | undefined; isInboxReady: boolean }) {
  const prevUrlRoomIdRef = useRef<string | undefined>(urlRoomId);
  const stableUnreadRef = useRef<Record<number, number>>({});

  const unreadMessageNumbers = useMemo(() => {
    // 历史数据未就绪时，沿用最近一次稳定结果，避免 readLine 未注入造成误判。
    if (userId <= 0 || !isInboxReady) {
      return stableUnreadRef.current;
    }

    const counts: Record<number, number> = {};
    for (const contactId of realTimeContacts) {
      counts[contactId] = getUnreadMessageNumber(sortedRealTimeMessages, contactId, userId);
    }
    return counts;
  }, [realTimeContacts, sortedRealTimeMessages, userId, isInboxReady]);

  useEffect(() => {
    if (userId > 0 && isInboxReady) {
      stableUnreadRef.current = unreadMessageNumbers;
    }
  }, [unreadMessageNumbers, userId, isInboxReady]);

  useEffect(() => {
    if (userId <= 0) {
      stableUnreadRef.current = {};
    }
  }, [userId]);

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

  // readLine：由服务端写入的“已读标记消息”（messageType === 10000, senderId === userId）
  // 部分会话可能没有 readLine，此时视为 readLineSync = 0。
  const readLineSync = messages.reduce((max, msg) => {
    if (msg?.messageType === 10000 && msg?.senderId === userId) {
      return Math.max(max, msg?.syncId ?? 0);
    }
    return max;
  }, 0);

  // 最新一条来自对方的有效消息 syncId
  const latestIncomingSync = messages.reduce((max, msg) => {
    if (msg?.senderId === contactId && msg?.messageType !== 10000) {
      return Math.max(max, msg?.syncId ?? 0);
    }
    return max;
  }, 0);

  if (latestIncomingSync <= readLineSync) {
    return 0;
  }

  // 未读：对方发送且 syncId > readLineSync 的有效消息数量
  return messages.filter((msg) => {
    return msg?.senderId === contactId
      && msg?.messageType !== 10000
      && (msg?.syncId ?? 0) > readLineSync;
  }).length;
}

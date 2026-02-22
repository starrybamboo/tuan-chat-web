import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useUpdateReadPositionMutation } from "api/hooks/MessageDirectQueryHooks";

import type { MessageDirectType } from "../types/messageDirect";

export function useUnreadCount({ realTimeContacts, sortedRealTimeMessages, userId, urlRoomId, isInboxReady }: { realTimeContacts: number[]; sortedRealTimeMessages: [string, MessageDirectType[]][]; userId: number; urlRoomId: string | undefined; isInboxReady: boolean }) {
  const prevUrlRoomIdRef = useRef<string | undefined>(undefined);
  const stableUnreadRef = useRef<Record<number, number>>({});
  const [optimisticReadSyncMap, setOptimisticReadSyncMap] = useState<Record<number, number>>({});

  const getMessagesByContact = useCallback((contactId: number) => {
    return sortedRealTimeMessages.find(([id]) => Number(id) === contactId)?.[1] || [];
  }, [sortedRealTimeMessages]);

  const markContactAsReadOptimistically = useCallback((contactId: number) => {
    const messages = getMessagesByContact(contactId);
    const latestIncomingSync = getLatestIncomingSync(messages, contactId);

    if (latestIncomingSync <= 0) {
      return;
    }

    setOptimisticReadSyncMap((prev) => {
      const prevSync = prev[contactId] ?? 0;
      if (latestIncomingSync <= prevSync) {
        return prev;
      }
      return {
        ...prev,
        [contactId]: latestIncomingSync,
      };
    });
  }, [getMessagesByContact]);

  const unreadMessageNumbers = useMemo(() => {
    // 历史数据未就绪时，沿用最近一次稳定结果，避免 readLine 未注入造成误判。
    if (userId <= 0 || !isInboxReady) {
      return stableUnreadRef.current;
    }

    const counts: Record<number, number> = {};
    for (const contactId of realTimeContacts) {
      const optimisticReadSync = optimisticReadSyncMap[contactId] ?? 0;
      counts[contactId] = getUnreadMessageNumber(
        sortedRealTimeMessages,
        contactId,
        userId,
        optimisticReadSync,
      );
    }
    return counts;
  }, [realTimeContacts, sortedRealTimeMessages, userId, isInboxReady, optimisticReadSyncMap]);

  useEffect(() => {
    if (userId > 0 && isInboxReady) {
      stableUnreadRef.current = unreadMessageNumbers;
    }
  }, [unreadMessageNumbers, userId, isInboxReady]);

  useEffect(() => {
    if (userId <= 0) {
      stableUnreadRef.current = {};
      setOptimisticReadSyncMap({});
    }
  }, [userId]);

  // 更新未读消息 Readline 位置
  const updateReadPositionMutation = useUpdateReadPositionMutation();

  const updateReadlinePosition = useCallback((contactId: number) => {
    if (userId <= 0 || !Number.isFinite(contactId) || contactId <= 0 || contactId === userId) {
      return;
    }
    markContactAsReadOptimistically(contactId);
    updateReadPositionMutation.mutate({ targetUserId: contactId });
  }, [markContactAsReadOptimistically, updateReadPositionMutation, userId]);

  // 监听 urlRoomId 变化：同时推进离开会话和当前会话的已读位置
  useEffect(() => {
    const prevContactId = parseUrlContactId(prevUrlRoomIdRef.current);
    const currentContactId = parseUrlContactId(urlRoomId);

    if (prevContactId != null && prevContactId !== currentContactId) {
      updateReadlinePosition(prevContactId);
    }

    if (currentContactId != null && currentContactId !== prevContactId) {
      updateReadlinePosition(currentContactId);
    }

    prevUrlRoomIdRef.current = urlRoomId;
  }, [urlRoomId, updateReadlinePosition]);

  return { unreadMessageNumbers, updateReadlinePosition };
}

function getUnreadMessageNumber(
  sortedRealTimeMessages: [string, MessageDirectType[]][],
  contactId: number,
  userId: number,
  optimisticReadSync: number,
) {
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

  const effectiveReadLineSync = Math.max(readLineSync, optimisticReadSync);

  if (latestIncomingSync <= effectiveReadLineSync) {
    return 0;
  }

  // 未读：对方发送且 syncId > effectiveReadLineSync 的有效消息数量
  return messages.filter((msg) => {
    return msg?.senderId === contactId
      && msg?.messageType !== 10000
      && (msg?.syncId ?? 0) > effectiveReadLineSync;
  }).length;
}

function getLatestIncomingSync(messages: MessageDirectType[], contactId: number) {
  return messages.reduce((max, msg) => {
    if (msg?.senderId === contactId && msg?.messageType !== 10000) {
      return Math.max(max, msg?.syncId ?? 0);
    }
    return max;
  }, 0);
}

function parseUrlContactId(rawRoomId: string | undefined): number | null {
  if (!rawRoomId) {
    return null;
  }
  const parsed = Number.parseInt(rawRoomId, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

import { useCallback, useEffect, useMemo, useRef } from "react";

import { useUpdateReadPositionMutation } from "api/hooks/MessageDirectQueryHooks";

import type { MessageDirectType } from "../types/messageDirect";

import { usePrivateUnreadStateStore } from "../privateUnreadStateStore";
import { getLatestIncomingSync, getUnreadMessageCountForMessages } from "../privateUnreadUtils";

export function useUnreadCount({ realTimeContacts, sortedRealTimeMessages, userId, urlRoomId, isInboxReady }: { realTimeContacts: number[]; sortedRealTimeMessages: [string, MessageDirectType[]][]; userId: number; urlRoomId: string | undefined; isInboxReady: boolean }) {
  const prevUrlRoomIdRef = useRef<string | undefined>(undefined);
  const prevUserIdRef = useRef<number | undefined>(undefined);
  const optimisticReadSyncMap = usePrivateUnreadStateStore(state => state.optimisticReadSyncMap);
  const markContactAsRead = usePrivateUnreadStateStore(state => state.markContactAsRead);
  const resetOptimisticReadSync = usePrivateUnreadStateStore(state => state.reset);

  const getMessagesByContact = useCallback((contactId: number) => {
    return sortedRealTimeMessages.find(([id]) => Number(id) === contactId)?.[1] || [];
  }, [sortedRealTimeMessages]);

  const markContactAsReadOptimistically = useCallback((contactId: number) => {
    const messages = getMessagesByContact(contactId);
    const latestIncomingSync = getLatestIncomingSync(messages, contactId);

    if (latestIncomingSync <= 0) {
      return;
    }

    markContactAsRead(contactId, latestIncomingSync);
  }, [getMessagesByContact, markContactAsRead]);

  const unreadMessageNumbers = useMemo(() => {
    if (userId <= 0 || !isInboxReady) {
      return {};
    }

    const counts: Record<number, number> = {};
    for (const contactId of realTimeContacts) {
      const optimisticReadSync = optimisticReadSyncMap[contactId] ?? 0;
      const messages = getMessagesByContact(contactId);
      counts[contactId] = getUnreadMessageCountForMessages(
        messages,
        contactId,
        userId,
        optimisticReadSync,
      );
    }
    return counts;
  }, [realTimeContacts, getMessagesByContact, userId, isInboxReady, optimisticReadSyncMap]);

  useEffect(() => {
    if (prevUserIdRef.current != null && prevUserIdRef.current !== userId) {
      resetOptimisticReadSync();
    }
    prevUserIdRef.current = userId;
  }, [resetOptimisticReadSync, userId]);

  useEffect(() => {
    if (userId <= 0) {
      resetOptimisticReadSync();
    }
  }, [resetOptimisticReadSync, userId]);

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

import { useEffect, useMemo, useRef } from "react";

import type { FriendResponse } from "api/models/FriendResponse";
import type { MessageDirectResponse } from "api/models/MessageDirectResponse";
import type { DirectMessageEvent } from "api/wsModels";

import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useGetFriendListQuery } from "api/hooks/friendQueryHooks";
import { useGetInboxMessagePageQuery } from "api/hooks/MessageDirectQueryHooks";

import type { MessageDirectType } from "../types/messageDirect";

export function usePrivateMessageList({ globalContext, userId }: { globalContext: any; userId: number }) {
  const webSocketUtils = globalContext.websocketUtils;

  // 好友列表
  const friendListQuery = useGetFriendListQuery({ pageNo: 1, pageSize: 100 });
  const friendUserInfos: FriendResponse[] = useMemo(
    () => (Array.isArray(friendListQuery.data?.data) ? friendListQuery.data.data : []),
    [friendListQuery.data],
  );

  // 从消息信箱获取私聊列表
  const inboxQuery = useGetInboxMessagePageQuery();
  // 私聊列表应优先展示（头像/昵称可以逐步补齐），避免好友列表接口变慢导致左侧一直卡 loading
  const isLoading = inboxQuery.isLoading;
  const isInboxReady = inboxQuery.isSuccess;
  const inboxMessages: MessageDirectResponse[] = useMemo(() => Array.isArray(inboxQuery.data?.data) ? inboxQuery.data.data : [], [inboxQuery.data]);
  // 格式化私聊消息，按联系人分组
  const sortedInboxMessages = useMemo(() => {
    const contacts = new Map<number, MessageDirectResponse[]>();
    for (const msg of inboxMessages) {
      // 本条消息的联系人
      const contactId = (msg.senderId === msg.userId ? msg.receiverId : msg.senderId) || -1;
      if (!contacts.has(contactId)) {
        contacts.set(contactId, []);
      }
      contacts.get(contactId)?.push(msg);
    }
    return Object.fromEntries(contacts);
  }, [inboxMessages]);

  // 删除私聊列表项
  const [deletedContactIds, setDeletedContactIds] = useLocalStorage<number[]>("deletedContactIds", []);
  function deletedThisContactId(contactId: number) {
    if (deletedContactIds.length === 0) {
      setDeletedContactIds([contactId]);
      return;
    }
    if (!deletedContactIds.includes(contactId)) {
      setDeletedContactIds([...deletedContactIds, contactId]);
    }
  }

  // 加入从 WebSocket 接收到的实时消息
  const wsMessages = webSocketUtils.receivedDirectMessages;

  const prevWsMessagesRef = useRef<Record<number, DirectMessageEvent[]>>({});

  useEffect(() => {
    Object.keys(wsMessages).forEach((key) => {
      const contactId = Number(key);
      const currentMessages = wsMessages[Number(key)];
      const prevMessages = prevWsMessagesRef.current[contactId] || [];

      // 只有当消息数量增加时，才从删除列表中恢复
      if (deletedContactIds.includes(contactId) && currentMessages.length > prevMessages.length) {
        // 检查新增的消息是否为非已读标记消息
        const newMessages = currentMessages.slice(prevMessages.length);
        const hasNewValidMessages = newMessages.some((msg: { messageType: number }) => msg.messageType !== 10000);

        if (hasNewValidMessages) {
          setDeletedContactIds(prev => prev.filter(id => id !== contactId));
        }
      }
    });

    // 更新引用
    prevWsMessagesRef.current = { ...wsMessages };
  }, [wsMessages, deletedContactIds, setDeletedContactIds]);

  const sortedWsMessages = useMemo(() => {
    const sorted: Record<number, DirectMessageEvent[]> = {};
    // 遍历每个联系人的消息
    Object.entries(wsMessages).forEach(([contactId, messages]) => {
      const msgArray = Array.isArray(messages) ? messages : [];
      sorted[Number(contactId)] = [...msgArray].sort((a, b) => {
        return b.syncId - a.syncId;
      });
    });
    return sorted;
  }, [wsMessages]);

  const realTimeMessages = useMemo(() => mergeMessages(sortedInboxMessages, sortedWsMessages, userId), [sortedInboxMessages, sortedWsMessages, userId]);
  // 按最新消息时间排列，数组
  const sortedRealTimeMessages = useMemo(() => {
    let realTimeMsg = Object.entries(realTimeMessages);

    // 先过滤掉只有 messageType === 10000 的联系人
    realTimeMsg = realTimeMsg.filter(([, messages]) => {
      return messages.filter(m => m.messageType !== 10000).length > 0;
    });

    realTimeMsg = realTimeMsg.sort(([, messagesA], [, messagesB]) => {
      const validMessagesA = messagesA.filter(m => m.messageType !== 10000);
      const validMessagesB = messagesB.filter(m => m.messageType !== 10000);

      const latestA = new Date(validMessagesA[0]?.createTime ?? 0).getTime();
      const latestB = new Date(validMessagesB[0]?.createTime ?? 0).getTime();
      return latestB - latestA;
    });
    return realTimeMsg;
  }, [realTimeMessages]);

  // 实时的联系人
  const realTimeContacts = useMemo(() => {
    const allContacts = sortedRealTimeMessages.map(([contactId]) => Number.parseInt(contactId));
    const needContacts = allContacts.filter(contactId => !deletedContactIds.includes(contactId));
    return needContacts;
  }, [sortedRealTimeMessages, deletedContactIds]);

  return {
    isLoading,
    isInboxReady,
    friendUserInfos,
    realTimeContacts,
    sortedRealTimeMessages,
    deletedThisContactId,
  };
}

function mergeMessages(
  sortedMessages: Record<number, MessageDirectResponse[]>,
  wsMessages: Record<number, DirectMessageEvent[]>,
  userId: number,
): Record<string, MessageDirectType[]> {
  const mergedMessages = new Map<number, MessageDirectType[]>();

  // 获取所有联系人ID
  const contactIds = new Set<number>([
    ...Object.keys(wsMessages).map(Number),
    ...Object.keys(sortedMessages).map(Number),
  ]);

  contactIds.delete(userId);

  for (const contactId of contactIds) {
    const wsContactMessages = wsMessages[contactId] || [];
    const historyMessages = sortedMessages[contactId] || [];

    // 使用 Map 进行去重，key 为 messageId
    const messageMap = new Map<number, MessageDirectType>();

    wsContactMessages.forEach((msg) => {
      if (msg.messageId) {
        messageMap.set(msg.messageId, msg);
      }
    });

    historyMessages.forEach((msg) => {
      if (msg.messageId && !messageMap.has(msg.messageId)) {
        messageMap.set(msg.messageId, msg);
      }
    });

    // 将 Map 转化为数组
    const messageArray = Array.from(messageMap.values())
      .sort((a, b) => (b?.syncId ?? 0) - (a?.syncId ?? 0));

    if (messageArray.length > 0) {
      mergedMessages.set(contactId, messageArray);
    }
  }

  return Object.fromEntries(mergedMessages);
}

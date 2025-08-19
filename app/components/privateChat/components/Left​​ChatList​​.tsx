import type { MessageDirectResponse } from "api/models/MessageDirectResponse";
import type { DirectMessageEvent } from "api/wsModels";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetInboxMessagePageQuery, useUpdateReadPositionMutation } from "api/hooks/MessageDirectQueryHooks";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router";
import FriendItem from "./FriendItem";

interface MessageDirectType {
  messageId?: number;
  userId?: number;
  syncId?: number;
  senderId?: number;
  receiverId?: number;
  content?: string;
  messageType?: number;
  replyMessageId?: number;
  status?: number;
  extra?: Record<string, any>;
  createTime?: string;
  updateTime?: string;
}

export default function LeftChatList({ setIsOpenLeftDrawer }: { setIsOpenLeftDrawer: (isOpen: boolean) => void }) {
  // 设置自定义样式
  const customScrollbarStyle: React.CSSProperties = {
    overflowY: "auto",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  };

  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const webSocketUtils = globalContext.websocketUtils;
  const { targetUserId: urlTargetUserId, roomId: urlRoomId } = useParams();
  const prevUrlRoomIdRef = useRef<string | undefined>(urlRoomId);
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : (urlTargetUserId ? Number.parseInt(urlTargetUserId) : null);

  // 从消息信箱获取私聊列表
  const inboxQuery = useGetInboxMessagePageQuery();
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

  // 加入从 WebSocket 接收到的实时消息
  const wsMessages = webSocketUtils.receivedDirectMessages;
  const sortedWsMessages = useMemo(() => {
    const sorted: Record<number, DirectMessageEvent[]> = {};
    // 遍历每个联系人的消息
    Object.entries(wsMessages).forEach(([contactId, messages]) => {
      const sortedMessages = [...messages].sort((a, b) => {
        return b.syncId - a.syncId;
      });
      sorted[Number(contactId)] = sortedMessages;
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
    return sortedRealTimeMessages.map(([contactId]) => Number.parseInt(contactId));
  }, [sortedRealTimeMessages]);

  // 未读消息数
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

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* 私聊列表 */}
      <div
        className="flex-1 w-full"
        style={customScrollbarStyle} // 应用自定义滚动条样式
      >
        <div className="w-full h-8 font-bold flex items-start justify-center border-b border-base-300">
          <span className="text-lg transform -translate-y-0.5">私信</span>
        </div>
        {false
          ? (
              <div className="flex items-center justify-center h-32">
                <span className="loading loading-spinner loading-md"></span>
                <span className="ml-2">加载私聊列表...</span>
              </div>
            )
          : realTimeContacts.length === 0
            ? (
                // 私聊列表为空
                <div className="flex flex-col items-center justify-center h-32 text-base-content/70">
                  <span>暂无私聊列表</span>
                  <span className="text-sm">快去聊天吧</span>
                </div>
              )
            : (
                // 显示私聊列表
                <div className="p-2 pt-4 flex flex-col gap-2">
                  {
                    realTimeContacts.map(contactId => (
                      <FriendItem
                        key={contactId}
                        id={contactId}
                        unreadMessageNumber={unreadMessageNumbers[contactId] || 0}
                        currentContactUserId={currentContactUserId}
                        setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                        updateReadlinePosition={updateReadlinePosition}
                      />
                    ))
                  }
                </div>
              )}
      </div>
    </div>
  );
}

function mergeMessages(
  sortedMessages: Record<number, MessageDirectResponse[]>,
  wsMessages: Record<number, DirectMessageEvent[]>,
  userId: number,
): Record<number, MessageDirectType[]> {
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

    // mergedMessages.set(contactId, [...wsContactMessages, ...historyMessages]);

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
    const messageArray = Array.from(messageMap.values());

    mergedMessages.set(contactId, messageArray);
  }

  return Object.fromEntries(mergedMessages);
}

function getUnreadMessageNumber(sortedRealTimeMessages: Array<[string, MessageDirectResponse[]]>, contactId: number, userId: number) {
  const targetArray = sortedRealTimeMessages.find(([id]) => Number.parseInt(id) === contactId);
  const messages = targetArray ? targetArray[1] : [];
  const latestMessageIndex = messages.findIndex(msg => msg.messageType !== 10000 && msg.senderId === contactId);
  const latestMessageSync = messages.find(msg => msg.messageType !== 10000 && msg.senderId === contactId)?.syncId || 0;
  const readlineIndex = messages.findIndex(msg => msg.messageType === 10000 && msg.senderId === userId);
  const readlineSync = messages.find(msg => msg.messageType === 10000 && msg.senderId === userId)?.syncId || 0;
  let unreadCount = 0;
  let index = readlineIndex;
  while (index >= latestMessageIndex || index > -1) {
    if (messages[index]?.senderId === contactId && messages[index]?.messageType !== 10000) {
      unreadCount++;
    }
    index--;
  }
  if (latestMessageSync < readlineSync) {
    return 0;
  }

  return unreadCount > 0 ? unreadCount : 0;
}

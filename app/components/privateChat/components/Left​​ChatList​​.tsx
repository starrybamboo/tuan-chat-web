import type { MessageDirectResponse } from "api/models/MessageDirectResponse";
import type { UserFollowResponse } from "api/models/UserFollowResponse";
import type { DirectMessageEvent } from "api/wsModels";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useGlobalContext } from "@/components/globalContextProvider";
import { MemberIcon, XMarkICon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useGetFriendsUserInfoQuery, useGetInboxMessagePageQuery, useUpdateReadPositionMutation } from "api/hooks/MessageDirectQueryHooks";
import { useGetUserFriendsQuery } from "api/hooks/userFollowQueryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import ChatItem from "./ChatItem";

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
  const navigate = useNavigate();

  // 好友列表
  const followingQuery = useGetUserFriendsQuery(userId, { pageNo: 1, pageSize: 100 });
  const friends: UserFollowResponse[] = useMemo(() => Array.isArray(followingQuery.data?.data?.list) ? followingQuery.data.data.list : [], [followingQuery.data]);
  const friendUserQueries = useGetFriendsUserInfoQuery(friends.map(f => f.userId));
  const friendUserInfos = friendUserQueries.map(f => f.data?.data);

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
        const hasNewValidMessages = newMessages.some(msg => msg.messageType !== 10000);

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
    const allContacts = sortedRealTimeMessages.map(([contactId]) => Number.parseInt(contactId));
    const needContacts = allContacts.filter(contactId => !deletedContactIds.includes(contactId));
    return needContacts;
  }, [sortedRealTimeMessages, deletedContactIds]);

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

  // 是否展示删除按钮
  const [isDeleteContats, setIsDeleteContacts] = useState(false);
  // 移动端是否展示好友列表
  const [isShowFriendsList, setIsShowFriendsList] = useState(false);

  // 屏幕大小
  const isSmallScreen = getScreenSize() === "sm";

  // 图标点击事件
  function handleMemberClick() {
    if (isSmallScreen) {
      setIsShowFriendsList(!isShowFriendsList);
    }
    else {
      if (currentContactUserId) {
        navigate("/chat/private");
      }
    }
  }

  function handleXMarkClick() {
    setIsDeleteContacts(!isDeleteContats);
  }

  // 移动端样式
  if (isSmallScreen) {
    return (
      <div className="flex flex-col h-full bg-base-100">
        <div
          className="flex-1 w-full"
          style={customScrollbarStyle}
        >
          <div className="w-full h-8 font-bold flex items-start justify-center border-b border-base-300">
            <span className="text-lg transform -translate-y-0.5">
              {isShowFriendsList ? "好友" : "私信"}
            </span>
          </div>
          {isShowFriendsList
            // 1.显示好友列表
            ? (
                <div className="p-2 pt-4 flex flex-col gap-2">
                  <button
                    className="btn btn-ghost flex justify-center w-full gap-2"
                    type="button"
                    onClick={handleMemberClick}
                  >
                    <MemberIcon />
                  </button>
                  {
                    friendUserInfos.map((friend, index) => (
                      <button
                        key={friend?.userId || index}
                        className="btn btn-ghost flex justify-start w-full gap-2"
                        type="button"
                        onClick={() => {
                          navigate(`/chat/private/${friend?.userId}`);
                          updateReadlinePosition(friend?.userId || -1);
                          setTimeout(() => {
                            setIsOpenLeftDrawer(false);
                          }, 0);
                        }}
                      >
                        <div className="indicator">
                          <div className="avatar mask mask-squircle w-8">
                            <img
                              src={friend?.avatar}
                              alt={friend?.username}
                            />
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-1 justify-center min-w-0 relative">
                          <div className="flex items-center ">
                            <span className="truncate">
                              {friend?.username || `用户${friend?.userId}`}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  }
                </div>
              )
            // 2.显示私聊列表
            : (
                <div className="p-2 pt-4 flex flex-col gap-2">
                  <div className="flex">
                    <button
                      className="btn btn-ghost flex justify-center w-1/2 gap-2"
                      type="button"
                      onClick={handleMemberClick}
                    >
                      <MemberIcon />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm flex justify-center w-1/2 gap-2"
                      type="button"
                      onClick={handleXMarkClick}
                    >
                      <XMarkICon />
                    </button>
                  </div>
                  {
                    realTimeContacts.length === 0
                      ? (
                          <>
                            <span>暂无私聊列表</span>
                            <span className="text-sm">快去聊天吧</span>
                          </>
                        )
                      : (
                          realTimeContacts.map(contactId => (
                            <ChatItem
                              key={contactId}
                              id={contactId}
                              isDeleteContats={isDeleteContats}
                              unreadMessageNumber={unreadMessageNumbers[contactId] || 0}
                              currentContactUserId={currentContactUserId}
                              setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                              updateReadlinePosition={updateReadlinePosition}
                              deletedContactId={deletedThisContactId}
                            />
                          ))
                        )
                  }
                </div>
              )}
        </div>
      </div>
    );
  }

  // 大屏样式
  return (
    <div className="flex flex-col h-full bg-base-100">
      <div
        className="flex-1 w-full"
        style={customScrollbarStyle}
      >
        <div className="w-full h-8 font-bold flex items-start justify-center border-b border-base-300">
          <span className="text-lg transform -translate-y-0.5">
            {isShowFriendsList ? "好友" : "私信"}
          </span>
        </div>
        {inboxQuery.isLoading
          ? (
              <div className="flex items-center justify-center h-32">
                <span className="loading loading-spinner loading-md"></span>
                <span className="ml-2">加载私聊列表...</span>
              </div>
            )
          : realTimeContacts.length === 0
            // 私聊列表为空
            ? (
                <div className="flex flex-col items-center justify-center text-base-content/70 px-4 py-2">
                  <button
                    className="btn btn-ghost flex justify-center w-full gap-2"
                    type="button"
                    onClick={handleMemberClick}
                  >
                    <MemberIcon />
                  </button>
                  <>
                    <span>暂无私聊列表</span>
                    <span className="text-sm">快去聊天吧</span>
                  </>
                </div>
              )
            // 私聊列表不为空
            : (
                <div className="p-2 pt-4 flex flex-col gap-2">
                  <div className="flex">
                    <button
                      className="btn btn-ghost flex justify-center items-center h-8 w-1/2 gap-2"
                      type="button"
                      onClick={handleMemberClick}
                    >
                      <MemberIcon />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm flex justify-center items-center h-8 w-1/2 gap-2"
                      type="button"
                      onClick={handleXMarkClick}
                    >
                      <XMarkICon />
                    </button>
                  </div>
                  {
                    realTimeContacts.map(contactId => (
                      <ChatItem
                        key={contactId}
                        id={contactId}
                        isDeleteContats={isDeleteContats}
                        unreadMessageNumber={unreadMessageNumbers[contactId] || 0}
                        currentContactUserId={currentContactUserId}
                        setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                        updateReadlinePosition={updateReadlinePosition}
                        deletedContactId={deletedThisContactId}
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
    const messageArray = Array.from(messageMap.values());

    if (messageArray.length > 0) {
      mergedMessages.set(contactId, messageArray);
    }
  }

  return Object.fromEntries(mergedMessages);
}

function getUnreadMessageNumber(sortedRealTimeMessages: Array<[string, MessageDirectType[]]>, contactId: number, userId: number) {
  const targetArray = sortedRealTimeMessages.find(([id]) => Number.parseInt(id) === contactId);
  const messages = targetArray ? targetArray[1] : [];
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

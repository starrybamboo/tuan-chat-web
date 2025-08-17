import type { MessageDirectResponse } from "api/models/MessageDirectResponse";
import type { UserFollowResponse } from "api/models/UserFollowResponse";
import type { DirectMessageEvent } from "api/wsModels";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetInboxMessagePageQuery } from "api/hooks/MessageDirectQueryHooks";
import { useGetUserFriendsQuery } from "api/hooks/userFollowQueryHooks";
import { useMemo } from "react";
import { useParams } from "react-router";
import FriendItem from "./FriendItem";

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
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : (urlTargetUserId ? Number.parseInt(urlTargetUserId) : null);

  // 获取并缓存好友列表
  const followingQuery = useGetUserFriendsQuery(userId, { pageNo: 1, pageSize: 100 });
  const friends: UserFollowResponse[] = useMemo(() => Array.isArray(followingQuery.data?.data?.list) ? followingQuery.data.data.list : [], [followingQuery.data]);

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
  const realTimeMessages = useMemo(() => mergeMessages(sortedInboxMessages, wsMessages), [sortedInboxMessages, wsMessages]);

  // 按最新消息时间排列，数组
  const sortedRealTimeMessages = useMemo(() => {
    let sortedMessages = Object.entries(realTimeMessages);
    sortedMessages = sortedMessages.sort(([, messagesA], [, messagesB]) => {
      const latestA = new Date(messagesA[0]?.createTime ?? 0).getTime();
      const latestB = new Date(messagesB[0]?.createTime ?? 0).getTime();
      return latestB - latestA;
    });
    return sortedMessages;
  }, [realTimeMessages]);

  // 实时的联系人
  const realTimeContacts = useMemo(() => {
    return sortedRealTimeMessages.map(([contactId]) => Number.parseInt(contactId));
  }, [sortedRealTimeMessages]);

  // 更新未读消息 Readline 位置
  function updateReadlinePosition() {

  }

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
                <span className="ml-2">加载好友列表...</span>
              </div>
            )
          : friends.length === 0
            ? (
          // 没有好友
                <div className="flex flex-col items-center justify-center h-32 text-base-content/70">
                  <span>暂无好友</span>
                  <span className="text-sm">快去添加一些好友吧</span>
                </div>
              )
            : (
                <>
                  {/* 显示私聊列表 */}
                  <div className="p-2 pt-4 flex flex-col gap-2">
                    {
                      realTimeContacts.map(contactId => (
                        <FriendItem
                          key={contactId}
                          id={contactId}
                          unreadMessageNumber={getUnreadMessageNumber(sortedRealTimeMessages, contactId)}
                          currentContactUserId={currentContactUserId}
                          setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                          updateReadlinePosition={updateReadlinePosition}
                        />
                      ))
                    }
                  </div>

                  {/* 显示静态的好友列表，不会有消息提示 */}
                  好友列表
                  <div className="p-2 pt-4 flex flex-col gap-2">
                    {
                      friends.map(friend => (
                        <FriendItem
                          key={friend.userId}
                          id={friend.userId || -1}
                          unreadMessageNumber={0}
                          currentContactUserId={currentContactUserId}
                          setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                          updateReadlinePosition={updateReadlinePosition}
                        />
                      ))
                    }
                  </div>
                </>
              )}
      </div>
    </div>
  );
}

function mergeMessages(
  sortedMessages: Record<number, MessageDirectResponse[]>,
  wsMessages: Record<number, DirectMessageEvent[]>,
): Record<number, MessageDirectResponse[]> {
  const mergedMessages = new Map<number, MessageDirectResponse[]>();

  // 获取所有联系人ID
  const contactIds = new Set<number>([
    ...Object.keys(sortedMessages).map(Number),
    ...Object.keys(wsMessages).map(Number),
  ]);

  for (const contactId of contactIds) {
    const historyMessages = sortedMessages[contactId] || [];
    const wsContactMessages = wsMessages[contactId] || [];
    mergedMessages.set(contactId, [...historyMessages, ...wsContactMessages]);
  }
  return Object.fromEntries(mergedMessages);
}

function getUnreadMessageNumber(sortedRealTimeMessages: Array<[string, MessageDirectResponse[]]>, contactId: number) {
  const targetArray = sortedRealTimeMessages.find(([id]) => Number.parseInt(id) === contactId);
  const messages = targetArray ? targetArray[1] : [];
  const targetMessages = messages.filter(msg => msg.senderId !== contactId);
  const unreadCount = targetMessages.findIndex(msg => msg.messageType === 10000);
  return unreadCount > 0 ? unreadCount : 0;
}

import type { DirectMessageEvent } from "api/wsModels";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetMessageDirectPageQueries } from "api/hooks/MessageDirectQueryHooks";
import { useGetUserFollowingsQuery } from "api/hooks/userFollowQueryHooks";
import { useMemo } from "react";
import { useParams } from "react-router";
import FriendItem from "./FriendItem";

interface contactInfo {
  userId: number;
  status: number;
  latestMessage: string;
  latestMessageTime: string | undefined;
}

export default function LeftChatList({ setIsOpenLeftDrawer }: { setIsOpenLeftDrawer: (isOpen: boolean) => void }) {
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const webSocketUtils = globalContext.websocketUtils;
  const { targetUserId: urlTargetUserId, roomId: urlRoomId } = useParams();
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : (urlTargetUserId ? Number.parseInt(urlTargetUserId) : null);

  // 好友列表
  const followingQuery = useGetUserFollowingsQuery(userId ?? -1, { pageNo: 1, pageSize: 100 });
  const friendsRaw = followingQuery.data?.data?.list?.filter(user => user.status === 2) ?? [];
  const friends = friendsRaw.map(friend => ({
    userId: friend.userId || -1,
    status: friend.status || 0,
  }));

  // 计算所有好友的从 WebSocket 接收到的实时消息
  const allReceivedMessages = useMemo(() => {
    const allMessages: DirectMessageEvent[] = [];

    Object.values(webSocketUtils.receivedDirectMessages).forEach((messages) => {
      messages.forEach((msg) => {
        if (msg.receiverId === userId || msg.senderId === userId) {
          allMessages.push(msg);
        }
      });
    });
    return allMessages;
  }, [webSocketUtils.receivedDirectMessages, userId]);

  // 获取每个好友的最新私聊消息
  const messageQueries = useGetMessageDirectPageQueries(friends);
  const latestMessages = messageQueries.map(query => query.data?.data?.list?.[0] || null);
  // 合并messageQueries的latestMessages消息和allReceivedMessages
  const mergedLatestMessages = useMemo(() => {
    return mergeLatestMessages(latestMessages, allReceivedMessages);
  }, [latestMessages, allReceivedMessages]);
  // 将好友信息和最新消息合并
  const friendInfos = mapFriendInfos(friends, mergedLatestMessages);
  // 根据最新消息时间排序好友列表
  const sortedFriendInfos = sortFriendInfos(friendInfos);

  // 消息信箱
  // const inboxQuery = useGetInboxMessagePageQuery({
  //   cursor: 999,
  //   pageSize: 96,
  // });

  // const inboxMessages = useMemo(() => inboxQuery.data?.data?.list ?? [], [inboxQuery.data]);
  // const allContactors = useMemo(() => {
  //   const contactors = new Set<number>();
  //   inboxMessages.forEach((msg) => {
  //     if (msg.senderId !== userId) {
  //       contactors.add(msg.senderId || -1);
  //     }
  //     if (msg.receiverId !== userId) {
  //       contactors.add(msg.receiverId || -1);
  //     }
  //   });
  //   return Array.from(contactors);
  // }, [inboxMessages, userId]);

  // const inboxUnreadCount = inboxMessages.filter(msg => msg.receiverId === userId && !msg.isRead).length;

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* 私聊列表 */}
      <div className="flex-1 w-full overflow-auto">
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
              // 显示好友列表
                <div className="p-2 pt-4 flex flex-col gap-2">
                  {
                    sortedFriendInfos.map(friend => (
                      <FriendItem
                        key={friend.userId}
                        id={friend.userId || -1}
                        // latestMessage={friend.latestMessage}
                        // latestMessageTime={friend.latestMessageTime}
                        currentContactUserId={currentContactUserId}
                        setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                      />
                    ))
                  }
                </div>
              )}
      </div>
    </div>
  );
}

function mapFriendInfos(friends: { userId: number; status: number }[], latestMessages: any[]): contactInfo[] {
  return friends.map((friend) => {
    const latestMessage = latestMessages.find(msg => msg && (msg.senderId === friend.userId || msg.receiverId === friend.userId));
    return {
      userId: friend.userId,
      status: friend.status,
      latestMessage: latestMessage ? String(latestMessage.content) : "",
      latestMessageTime: latestMessage ? latestMessage.createTime : undefined,
    };
  });
}

function sortFriendInfos(friendInfos: contactInfo[]): contactInfo[] {
  return friendInfos.sort((a, b) => {
    if (a.latestMessageTime && b.latestMessageTime) {
      return new Date(b.latestMessageTime).getTime() - new Date(a.latestMessageTime).getTime();
    }
    else if (a.latestMessageTime) {
      return -1;
    }
    return 1;
  });
}

function mergeLatestMessages(latestMessages: any[], allReceivedMessages: any[]) {
  const messageMap = new Map<number, any>();
  latestMessages.forEach((msg) => {
    if (msg) { // 确保 msg 不为 null
      messageMap.set(msg.messageId, msg);
    }
  });
  allReceivedMessages.forEach((msg) => {
    const sameMessageId = findSameTwoContacter(msg);
    if (sameMessageId) {
      messageMap.set(sameMessageId, msg);
    }
  });
  return Array.from(messageMap.values());

  // 查找是否有可以覆盖的消息记录，覆盖为最新消息
  function findSameTwoContacter(msg: any) {
    for (const [messageId, message] of messageMap) {
      const msgTime = new Date(msg.createTime);
      const messageTime = new Date(message.createTime);

      if (message.senderId === msg.senderId && message.receiverId === msg.receiverId && msgTime > messageTime) {
        return messageId;
      }
      else if (message.receiverId === msg.senderId && message.senderId === msg.receiverId && msgTime > messageTime) {
        return messageId;
      }
    }
    return null;
  }
}

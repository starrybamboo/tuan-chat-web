import { SideDrawer } from "@/components/common/sideDrawer";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetMessageDirectPageQueries } from "api/hooks/MessageDirectQueryHooks";
import { useEffect, useMemo } from "react";
import FriendItem from "./FriendItem";

interface contactInfo {
  userId: number;
  status: number;
  latestMessage: string;
  latestMessageTime: string | undefined;
}

export default function LeftChatList({
  currentContactUserId,
  friends,
  allReceivedMessages,
}: {
  currentContactUserId: number | null;
  friends: { userId: number; status: number }[];
    allReceivedMessages: { senderId: number; receiverId: number; content: string; createTime: string }[];
}) {
  // 获取每个好友的最新私聊消息
  const messageQueries = useGetMessageDirectPageQueries(friends);
  const latestMessages = messageQueries.map(query => query.data?.data?.list?.[0] || null);
  // 合并messageQueries的latestMessages消息和allReceivedMessages
  const mergedLatestMessages = useMemo(() => {
    return mergeLatestMessages(latestMessages, allReceivedMessages);
  }, [latestMessages, allReceivedMessages]);
  console.warn("Merged Latest Messages:", mergedLatestMessages);
  // 将好友信息和最新消息合并
  const friendInfos = mapFriendInfos(friends, mergedLatestMessages);
  // 根据最新消息时间排序好友列表
  const sortedFriendInfos = sortFriendInfos(friendInfos);

  // 未读消息提醒
  const websocketUtils = useGlobalContext().websocketUtils;
  const totalUnreadMessages = useMemo(() => {
    return Object.values(websocketUtils.unreadDirectMessagesNumber).reduce((sum, count) => sum + count, 0);
  }, [websocketUtils.unreadDirectMessagesNumber]);
  // 在标签页中显示未读消息或删除未读消息
  useEffect(() => {
    updateUnreadMessagesCountInTag(totalUnreadMessages);
  }, [totalUnreadMessages]);

  return (
    <SideDrawer sideDrawerId="private-chat">
      <div className="flex flex-col w-[300px] h-full bg-base-100">
        {/* 私聊列表 */}
        <div className="flex-1 w-full overflow-auto">
          {/* {followingQuery.isLoading */}
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
                  sortedFriendInfos.map(friend => (
                    <FriendItem
                      key={friend.userId}
                      id={friend.userId || -1}
                      latestMessage={friend.latestMessage}
                      currentContactUserId={currentContactUserId}
                    />
                  ))
                )}
        </div>
        {/* 功能栏目 */}
        {/* <div className="h-20 w-full border-t border-base-300 bg-base-200">
                    <div className="grid grid-cols-2 grid-rows-2 h-full cursor-pointer">
                        <div className="flex items-center justify-center border-r border-b border-base-300 hover:bg-base-300 transition-colors gap-2">
                        <div className="text-sm font-medium">回复我的</div>
                        <div className="text-xs text-gray-500">5</div>
                        </div>
                        <div className="flex items-center justify-center border-b border-base-300 hover:bg-base-300 transition-colors gap-2">
                        <div className="text-sm font-medium">@我的</div>
                        <div className="text-xs text-gray-500">3</div>
                        </div>
                        <div className="flex items-center justify-center border-r border-base-300 hover:bg-base-300 transition-colors gap-2">
                        <div className="text-sm font-medium">收到的赞</div>
                        <div className="text-xs text-gray-500">12</div>
                        </div>
                        <div className="flex items-center justify-center hover:bg-base-300 transition-colors gap-2">
                        <div className="text-sm font-medium">系统通知</div>
                        <div className="text-xs text-gray-500">2</div>
                        </div>
                    </div>
                </div> */}
      </div>
    </SideDrawer>
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

function updateUnreadMessagesCountInTag(totalUnreadMessages: number) {
  // 如果不是私聊页
  if (window.location.pathname !== "/privatechat") {
    return;
  }

  const originalTitle = document.title.replace(/^\d+条新消息-/, ""); // 清除已有前缀
  if (totalUnreadMessages > 0) {
    document.title = `${totalUnreadMessages}条新消息-${originalTitle}`;
  }
  else {
    document.title = originalTitle;
  }
  return () => {
    document.title = originalTitle;
  };
}

function mergeLatestMessages(latestMessages: any[], allReceivedMessages: any[]) {
  const messageMap = new Map<number, any>();
  latestMessages.forEach(msg => {
    if (msg) { // 确保 msg 不为 null
      messageMap.set(msg.messageId, msg);
    }
  });
  console.warn("All Received Messages:", allReceivedMessages);
  allReceivedMessages.forEach(msg => {
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
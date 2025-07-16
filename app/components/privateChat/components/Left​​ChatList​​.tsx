import { SideDrawer } from "@/components/common/sideDrawer";
import { useGetMessageDirectPageQueries } from "api/hooks/MessageDirectQueryHooks";
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
}: {
  currentContactUserId: number | null;
  friends: { userId: number; status: number }[];
}) {
  // 获取每个好友的最新私聊消息
  const messageQueries = useGetMessageDirectPageQueries(friends);
  const latestMessages = messageQueries.map(query => query.data?.data?.list?.[0] || null);
  // 将好友信息和最新消息合并
  const friendInfos = mapFriendInfos(friends, latestMessages);
  // 根据最新消息时间排序好友列表
  const sortedFriendInfos = sortFriendInfos(friendInfos);

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
  return friends.map((friend, index) => {
    const latestMessage = latestMessages[index];
    return {
      userId: friend.userId,
      status: friend.status,
      latestMessage: latestMessage ? String(latestMessage.content) : "暂无消息",
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

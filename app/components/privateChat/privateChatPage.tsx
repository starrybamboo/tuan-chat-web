import { SideDrawer, SideDrawerToggle } from "@/components/common/sideDrawer";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ChevronRight, EmojiIcon, Image2Fill, MoreMenu } from "@/icons";
import {
  useGetMessageDirectPageQueries,
  useGetMessageDirectPageQuery,
  useSendMessageDirectMutation,
} from "api/hooks/MessageDirectQueryHooks";
import { useGetUserFollowingsQuery } from "api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import FriendItem from "./components/FriendItem";

export default function PrivateChatPage() {
  const navigate = useNavigate();
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const [messageInput, setMessageInput] = useState(""); // 用户输入信息
  // const webSocketUtils = globalContext.websocketUtils;
  // const send = webSocketUtils.send;

  /**
   * 用户登录处理
   */
  useEffect(() => {
    if (!userId) {
      navigate("/privatechat", { replace: true });
    }
  }, [userId, navigate]);

  /**
   * 好友列表
   */
  const followingQuery = useGetUserFollowingsQuery(userId ?? -1, { pageNo: 1, pageSize: 100 });
  const friends = followingQuery.data?.data?.list?.filter(user => user.status === 2) ?? [];
  const friendsCopy = friends.map(friend => ({
    userId: friend.userId || -1,
    status: friend.status || 0,
  }));

  // 获取每个好友的最新私聊消息
  const messageQueries = useGetMessageDirectPageQueries(friendsCopy);
  const friendsWithMessages = friends.map((friend, index) => {
    const latestMessage = messageQueries[index]?.data?.data?.list?.[0] || null;
    return {
      userId: friend.userId,
      status: friend.status,
      latestMessage: latestMessage ? String(latestMessage.content) : "暂无消息",
      latestMessageTime: latestMessage ? latestMessage.createTime : null,
    };
  });

  // 根据最新消息时间排序好友列表
  const sortedFriends = friendsWithMessages.sort((a, b) => {
    if (a.latestMessageTime && b.latestMessageTime) {
      return new Date(b.latestMessageTime).getTime() - new Date(a.latestMessageTime).getTime();
    }
    else if (a.latestMessageTime) {
      return -1;
    }
    return 1;
  });

  /**
   * 当前选中的联系人
   */
  const { targetUserId: urlTargetUserId } = useParams();
  const currentTargetUserId = urlTargetUserId ? Number.parseInt(urlTargetUserId) : null; // 从 URL 获取当前选中的联系人
  const currentContact = friends.find(contact => contact.userId === currentTargetUserId); // 获取当前联系人信息
  const currentContactUserInfo = useGetUserInfoQuery(currentTargetUserId || -1).data?.data;
  const handleContactClick = (contactId: number) => { // 处理点击，切换当前联系人
    navigate(`/privatechat/${contactId}`);
  };

  /**
   * 获取当前用户与选中联系人的聊天记录
   */
  const directMessageQuery = useGetMessageDirectPageQuery({
    cursor: 99,
    pageSize: 40,
    targetUserId: currentTargetUserId || -1,
  });
  const directMessageList = directMessageQuery.data?.data?.list || [];
  const chatMsgItems = directMessageList.map((item) => {
    return {
      messageID: item.messageId,
      userId: item.senderId || -1,
      content: item.content,
      createTime: item.createTime,
    };
  });

  /**
   * 发送私聊消息
   */
  // 发送消息
  const sendMessageDirectMutation = useSendMessageDirectMutation();
  function handleSendMessage() {
    if (messageInput.trim() === "")
      return;
    // HTTP
    sendMessageDirectMutation.mutate({
      receiverId: currentTargetUserId || -1, // 如果没有选中联系人，则传入 -1
      content: messageInput,
      messageType: 1, // 1 文本
      extra: {},
    }, {
      onSettled: () => {
        setMessageInput("");
        directMessageQuery.refetch();
      },
    });
    // WebSocket
    // send(sendMessage);
  }

  return (
    <div className="flex flex-row h-full">
      {/* 左侧私聊列表 */}
      <SideDrawer sideDrawerId="private-chat">
        <div className="flex flex-col w-[300px] h-full bg-base-100">
          {/* 私聊列表 */}
          <div className="flex-1 w-full overflow-auto">
            {followingQuery.isLoading
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
                    sortedFriends.map(friend => (
                      <FriendItem
                        key={friend.userId}
                        id={friend.userId || -1}
                        latestMessage={friend.latestMessage}
                        handleContactClick={handleContactClick}
                        currentTargetUserId={currentTargetUserId}
                      />
                    ))
                  )}
          </div>
          {/* 功能栏目 */}
          <div className="h-20 w-full border-t border-base-300 bg-base-200">
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
          </div>
        </div>
      </SideDrawer>
      {/* 右侧聊天窗口 */}
      <div className="flex-1 bg-base-100 border-l border-base-300 flex flex-col">
        {/* 聊天顶部栏 */}
        <div className="h-10 w-full bg-base-100 border-b border-base-300 flex items-center px-4 relative">
          <SideDrawerToggle htmlFor="private-chat">
            <ChevronRight className="size-6" />
          </SideDrawerToggle>
          <span className="absolute left-1/2 transform -translate-x-1/2">
            {currentContact ? `${currentContactUserInfo?.username}` : "选择联系人"}
          </span>
          <span className="absolute right-0 transform -translate-x-4">
            <MoreMenu className="size-6 cursor-pointer rotate-90" />
          </span>
        </div>
        {/* 聊天消息区域 */}
        <div className="flex-1 w-full overflow-auto p-4">
          {currentTargetUserId
            ? (
                <div className="space-y-4">
                  {chatMsgItems.slice().reverse().map(msg => (
                    msg.userId === userId
                      ? (
                          <div key={msg.messageID} className="flex items-start justify-end gap-2">
                            <div className="bg-info p-2 rounded-lg">
                              {msg.content}
                            </div>
                            <UserAvatarComponent
                              userId={msg.userId}
                              width={12}
                              isRounded={true}
                              uniqueKey={`${msg.userId}${msg.messageID}`}
                            />
                          </div>
                        )
                      : (
                          <div key={msg.messageID} className="flex items-start gap-2">
                            <UserAvatarComponent
                              userId={msg.userId}
                              width={12}
                              isRounded={true}
                              uniqueKey={`${msg.userId}${msg.messageID}`}
                            />
                            <div className="bg-base-300 p-2 rounded-lg">
                              {msg.content}
                            </div>
                          </div>
                        )
                  ))}
                </div>
              )
            : (
                <div className="flex items-center justify-center w-full h-full text-gray-500">
                  请选择一个联系人开始聊天
                </div>
              )}
        </div>
        {/* 输入区域 */}
        {currentTargetUserId && (
          <div className="h-36 w-full border-t border-base-300 flex flex-col px-6 pt-4 pb-2">
            <div className="flex-1 w-full">
              <textarea
                className="w-full h-full resize-none px-2 py-1 rounded-lg focus:outline-none"
                placeholder="请输入消息内容..."
                onChange={e => setMessageInput(e.target.value)}
                value={messageInput}
              />
            </div>
            <div className="h-12 w-full flex items-center justify-between px-2">
              <div className="h-full flex items-center gap-4">
                <EmojiIcon className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
                <Image2Fill className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
              </div>
              <button
                type="button"
                className="btn btn-info"
                onClick={handleSendMessage}
              >
                发送
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

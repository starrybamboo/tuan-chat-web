import type { DirectMessageEvent } from "api/wsModels";
import type {
  MessageDirectResponse,
} from "../../../api";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetMessageDirectPageQuery } from "api/hooks/MessageDirectQueryHooks";
import { useGetUserFollowingsQuery } from "api/hooks/userFollowQueryHooks";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import LeftChatList from "./components/Left​​ChatList​​";
import RightChatView from "./components/RightChatView";

export default function PrivateChatPage() {
  const navigate = useNavigate();
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const webSocketUtils = globalContext.websocketUtils;
  const { targetUserId: urlTargetUserId } = useParams();
  const PAGE_SIZE = 30; // 每页消息数量

  // 如果没有登录，则重定向到登录页面
  useEffect(() => {
    if (!userId) {
      navigate("/privatechat", { replace: true });
    }
  }, [userId, navigate]);

  // 从 URL 获取当前选中的联系人
  const currentContactUserId = urlTargetUserId ? Number.parseInt(urlTargetUserId) : null;

  // 好友列表
  const followingQuery = useGetUserFollowingsQuery(userId ?? -1, { pageNo: 1, pageSize: 100 });
  const friends = followingQuery.data?.data?.list?.filter(user => user.status === 2) ?? [];
  const mappedFriends = friends.map(friend => ({
    userId: friend.userId || -1,
    status: friend.status || 0,
  }));

  // 与当前联系人的历史消息
  const directMessageQuery = useGetMessageDirectPageQuery(currentContactUserId || -1, PAGE_SIZE);

  // 从 WebSocket 接收到的实时消息
  const receivedMessages = useMemo(() => {
    if (!currentContactUserId)
      return [];
    const userMessages = webSocketUtils.receivedDirectMessages[userId] || []; // senderId 为 userId
    const contactUserMessages = webSocketUtils.receivedDirectMessages[currentContactUserId] || []; // senderId 为 currentContactUserId
    // 筛选出与当前联系人相关的消息
    const filteredUserMessages = userMessages.filter(msg =>
      msg.receiverId === currentContactUserId, // 用户发给当前联系人的消息
    );
    const filteredContactMessages = contactUserMessages.filter(msg =>
      msg.senderId === currentContactUserId && msg.receiverId === userId, // 当前联系人发给用户的消息
    );
    return [...filteredUserMessages, ...filteredContactMessages];
  }, [webSocketUtils.receivedDirectMessages, userId, currentContactUserId]);

  // 合并历史消息和实时消息
  const allMessages = useMemo(() => {
    return mergeMessages(directMessageQuery.historyMessages, receivedMessages);
  }, [directMessageQuery.historyMessages, receivedMessages]);

  return (
    <div className="flex flex-row h-full">
      {/* 左侧私聊列表 */}
      <LeftChatList
        currentContactUserId={currentContactUserId}
        friends={mappedFriends}
      />
      {/* 右侧聊天窗口 */}
      <RightChatView
        currentContactUserId={currentContactUserId}
        allMessages={allMessages}
        directMessageQuery={directMessageQuery}
      />
    </div>
  );
}

function mergeMessages(historyMessages: MessageDirectResponse[], receivedMessages: DirectMessageEvent[]) {
  const messageMap = new Map<number, MessageDirectResponse>();

  historyMessages.forEach(msg => messageMap.set(msg.messageId || 0, msg));
  receivedMessages.forEach(msg => messageMap.set(msg.messageId, msg));

  // 按消息位置排序，确保消息显示顺序正确
  const allMessages = Array.from(messageMap.values())
    .sort((a, b) => (a.messageId ?? 0) - (b.messageId ?? 0))
    .filter(msg => msg.status !== 1);

  return allMessages;
}

import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetUserFollowingsQuery } from "api/hooks/userFollowQueryHooks";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import LeftChatList from "./components/Left​​ChatList​​";
import RightChatView from "./components/RightChatView";

export default function PrivateChatPage() {
  const navigate = useNavigate();
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const { targetUserId: urlTargetUserId } = useParams();

  // 如果没有登录，则重定向到登录页面
  useEffect(() => {
    if (!userId) {
      navigate("/privatechat", { replace: true });
    }
  }, [userId, navigate]);

  // 好友列表
  const followingQuery = useGetUserFollowingsQuery(userId ?? -1, { pageNo: 1, pageSize: 100 });
  const friends = followingQuery.data?.data?.list?.filter(user => user.status === 2) ?? [];
  const mappedFriends = friends.map(friend => ({
    userId: friend.userId || -1,
    status: friend.status || 0,
  }));

  // 从 URL 获取当前选中的联系人
  const currentContactUserId = Number.parseInt(urlTargetUserId || "-1");

  return (
    <div className="flex flex-row h-full">
      {/* 左侧私聊列表 */}
      <LeftChatList
        friends={mappedFriends}
        currentContactUserId={currentContactUserId}
      />
      {/* 右侧聊天窗口 */}
      <RightChatView
        currentContactUserId={currentContactUserId}
      />
    </div>
  );
}

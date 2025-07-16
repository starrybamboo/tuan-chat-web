import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetUserFollowingsQuery } from "api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import LeftChatList from "./components/Left​​ChatList​​";
import RightChatView from "./components/RightChatView";

export default function PrivateChatPage() {
  const navigate = useNavigate();
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;

  // 如果没有登录，则重定向到登录页面
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

  // 联系人列表
  const contactList = friends.map(friend => ({
    userId: friend.userId || -1,
    status: friend.status || 0,
  }));

  /**
   * 当前选中的联系人
   */
  const { targetUserId: urlTargetUserId } = useParams();

  // ！！！！important
  const currentContactUserId = Number.parseInt(urlTargetUserId || "-1"); // 从 URL 获取当前选中的联系人

  const currentContact = friends.find(contact => contact.userId === currentContactUserId); // 获取当前联系人信息
  const currentContactUserInfo = useGetUserInfoQuery(currentContactUserId || -1).data?.data;

  return (
    <div className="flex flex-row h-full">
      {/* 左侧私聊列表 */}
      <LeftChatList
        friends={contactList}
        currentContactUserId={currentContactUserId}
      />
      {/* 右侧聊天窗口 */}
      <RightChatView
        currentContactUserId={currentContactUserId}
        currentContact={currentContact}
        currentContactUserInfo={currentContactUserInfo}
      />
    </div>
  );
}

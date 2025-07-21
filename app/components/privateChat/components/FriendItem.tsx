import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

export default function FriendItem({
  id,
  currentContactUserId,
  latestMessage,
  latestMessageTime,
}: {
  id: number;
  currentContactUserId: number | null;
  latestMessage?: string; // 可选的最新消息
  latestMessageTime?: string; // 可选的最新消息时间
}) {
  const userInfoQuery = useGetUserInfoQuery(id);
  const userInfo = userInfoQuery.data?.data;
  const navigate = useNavigate();
  const websocketUtils = useGlobalContext().websocketUtils;
  // 未读消息数
  let unreadMessageNumber = 0;
  if (currentContactUserId !== id && websocketUtils.unreadDirectMessagesNumber[id] > 0) {
    unreadMessageNumber = websocketUtils.unreadDirectMessagesNumber[id];
  }
  const absoluteunreadMessageNumber = websocketUtils.unreadDirectMessagesNumber[id] || 0;
  // 重置未读消息数
  const clearUnread = useCallback(() => {
    websocketUtils.updateUnreadDirectMessagesNumber(id, 0);
  }, [websocketUtils, id]);

  // 如果已经选中联系人，不再触发新消息提醒
  useEffect(() => {
    if (currentContactUserId === id && absoluteunreadMessageNumber > 0) {
      clearUnread();
    }
  }, [currentContactUserId, id, absoluteunreadMessageNumber, clearUnread]);

  // 格式化显示最后一条消息的时间
  const formatLatestMessageTime = (time: string | undefined) => {
    if (!time)
      return "无消息";
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    // 如果超过一年，显示完整日期
    if (diff > oneDay * 365) {
      return date.toLocaleDateString();
    }
    // 如果超过一天，显示月日
    if (diff > oneDay) {
      return date.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
    }
    // 如果在同一天，显示时分
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`h-16 w-full border-b border-base-300 flex items-center gap-4 px-4 hover:bg-base-200 cursor-pointer transition-colors 
                ${currentContactUserId === id ? "bg-base-200" : ""}`}
      onClick={() => {
        clearUnread();
        navigate(`/privatechat/${id}`);
      }}
    >
      <UserAvatarComponent
        userId={id}
        width={12}
        isRounded={true}
        uniqueKey={`chatlist-${id}`}
      />
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {userInfoQuery.isLoading
              ? (
                  <div className="skeleton h-4 w-20"></div>
                )
              : (userInfo?.username || `用户${id}`)}
          </span>
          {unreadMessageNumber > 0 && (
            <span className="badge badge-error badge-sm text-white">
              {unreadMessageNumber > 99 ? "99+" : unreadMessageNumber}
            </span>
          )}
        </div>
        <span className="text-sm text-base-content/70 truncate">
          {latestMessage}
        </span>
      </div>
      <span className="text-sm text-base-content/70 truncate">
        {formatLatestMessageTime(latestMessageTime)}
      </span>
    </div>
  );
}

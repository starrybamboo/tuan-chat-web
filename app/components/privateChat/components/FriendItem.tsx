import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

export default function FriendItem({
  id,
  currentContactUserId,
  latestMessage,
}: {
  id: number;
  currentContactUserId: number | null;
  latestMessage?: string; // 可选的最新消息
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
    </div>
  );
}

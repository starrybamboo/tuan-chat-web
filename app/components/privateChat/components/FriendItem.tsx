import UserAvatarComponent from "@/components/common/userAvatar";
import { useGetUserInfoQuery } from "api/queryHooks";

export default function FriendItem({
  id,
  currentTargetUserId,
  latestMessage,
  handleContactClick,
}: {
  id: number;
  currentTargetUserId: number | null;
  latestMessage?: string; // 可选的最新消息
  handleContactClick: (contactId: number) => void;
}) {
// 获取好友信息
  const userInfoQuery = useGetUserInfoQuery(id);
  const userInfo = userInfoQuery.data?.data;

  return (
    <div
      className={`h-16 w-full border-b border-base-300 flex items-center gap-4 px-4 hover:bg-base-200 cursor-pointer transition-colors 
                ${currentTargetUserId === id ? "bg-base-200" : ""}`}
      onClick={() => handleContactClick(id)}
    >
      <UserAvatarComponent
        userId={id}
        width={12}
        isRounded={true}
        uniqueKey={`chatlist-${id}`}
      />
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {userInfoQuery.isLoading
              ? (
                  <div className="skeleton h-4 w-20"></div>
                )
              : (userInfo?.username || `用户${id}`)}
          </span>
        </div>
        <span className="text-sm text-base-content/70 truncate">
          { latestMessage }
        </span>
      </div>
    </div>
  );
}

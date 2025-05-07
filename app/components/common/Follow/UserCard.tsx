import { useState } from "react";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";
import { FollowButton } from "./FollowButton";

interface UserCardProps {
  userId: number;
  initialStatus?: number;
}

export function UserCard({ userId, initialStatus }: UserCardProps) {
  const userInfoQuery = useGetUserInfoQuery(userId);
  const userInfo = userInfoQuery.data?.data;
  const [status, setStatus] = useState(initialStatus);

  return (
    <div className="card card-compact w-48 bg-base-100 shadow-xl">
      <div className="flex items-center p-4">
        <div className="avatar flex-shrink-0">
          <div className="w-12 rounded-full">
            {userInfoQuery.isLoading
              ? (
                  <div className="skeleton w-12 h-12"></div>
                )
              : (
                  <img src={userInfo?.avatar || "/default-avatar.png"} alt={userInfo?.username} />
                )}
          </div>
        </div>
        <div className="ml-4 flex flex-col min-w-0">
          <h3 className="text-lg font-semibold truncate">
            {userInfoQuery.isLoading
              ? (
                  <div className="skeleton h-4 w-20"></div>
                )
              : (
                  userInfo?.username || "未知用户"
                )}
          </h3>
          <FollowButton
            userId={userId}
            status={status}
            onStatusChange={(newStatus) => {
              setStatus(newStatus);
            }}
          />
        </div>
      </div>
    </div>
  );
}

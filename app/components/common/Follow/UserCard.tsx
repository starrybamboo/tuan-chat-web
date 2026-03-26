import type { FollowResponse } from "../../../../api";
import { useState } from "react";
import { Link } from "react-router";
import { resolveUserDisplayName, useResolvedUserInfo } from "@/components/common/userAccess.shared";
import { FollowButton } from "./FollowButton";

interface UserCardProps {
  user: FollowResponse;
}

export function UserCard({ user }: UserCardProps) {
  const userId = user.userId ?? -1;
  const resolvedUser = useResolvedUserInfo(user, userId);
  const [status, setStatus] = useState(user.status);
  const displayName = resolveUserDisplayName({ username: resolvedUser.username }, userId > 0 ? `用户${userId}` : "未知用户");
  const avatarSrc = resolvedUser.avatarThumbUrl || resolvedUser.avatar || "/default-avatar.png";

  return (
    <div className="card card-compact w-48 bg-base-100 shadow-xl">
      <div className="flex items-center p-4">
        <div className="avatar flex-shrink-0">
          <div className="w-12 rounded-full">
            {resolvedUser.isLoading
              ? (
                  <div className="skeleton w-12 h-12"></div>
                )
              : (

                  <Link
                    to={`/profile/${userId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="mask mask-circle pointer"
                    />
                  </Link>
                )}
          </div>
        </div>
        <div className="ml-4 flex flex-col min-w-0">
          <h3 className="text-lg font-semibold truncate">
            {resolvedUser.isLoading
              ? (
                  <div className="skeleton h-4 w-20"></div>
                )
              : (
                  displayName
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

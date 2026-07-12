import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { UserAvatarByUser } from "@/components/common/userAccess";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { resolveUserDisplayName, useResolvedUserInfo } from "@/components/common/userAccess.shared";
import { Skeleton } from "@/components/common/StatusPrimitives";

import type { FollowResponse } from "../../../../api";

import { FollowButton } from "./FollowButton";

type UserCardProps = {
  user: FollowResponse;
}

export function UserCard({ user }: UserCardProps) {
  const userId = user.userId ?? -1;
  const resolvedUser = useResolvedUserInfo(user, userId);
  const [status, setStatus] = useState(user.status);
  const displayName = resolveUserDisplayName({ username: resolvedUser.username }, userId > 0 ? `用户${userId}` : "未知用户");

  return (
    <div className={surfaceClassName({ level: "content", className: "w-48 shadow-xl" })}>
      <div className="flex items-center p-4">
        <div className="relative inline-flex shrink-0 align-middle">
          <div className="size-12 overflow-hidden rounded-full">
            {resolvedUser.isAvatarLoading
              ? (
                  <Skeleton className="w-12 h-12" />
                )
              : (

                  <Link
                    to="/profile/$userId"
                    params={{ userId: String(userId) }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <UserAvatarByUser
                      user={user}
                      fallbackUserId={userId}
                      width={12}
                      isRounded={true}
                      stopToastWindow={true}
                      clickEnterProfilePage={false}
                    />
                  </Link>
                )}
          </div>
        </div>
        <div className="ml-4 flex flex-col min-w-0">
          <h3 className="text-lg font-semibold truncate" title={resolvedUser.isNameLoading ? undefined : displayName}>
            {resolvedUser.isNameLoading
              ? (
                  <Skeleton className="h-4 w-20" />
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

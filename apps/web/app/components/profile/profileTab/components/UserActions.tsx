import { useRouter } from "@tanstack/react-router";
import React from "react";

import { FollowButton } from "@/components/common/Follow/FollowButton";
import { FriendRequestButton } from "@/components/common/FriendRequestButton";

import type { UserInfoResponse } from "../../../../../api";

type ProfileEditingActions = {
  isEditingProfile: boolean;
  startEditingProfile: () => void;
}

type UserActionsProps = {
  user: UserInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  isLoading: boolean;
  profileEditing: ProfileEditingActions;
  variant?: "mobile" | "desktop";
}

export const UserActions: React.FC<UserActionsProps> = ({
  user,
  userId,
  loginUserId,
  isLoading,
  profileEditing,
  variant = "desktop",
}) => {
  const router = useRouter();
  if (isLoading)
    return null;

  const isOwner = userId === loginUserId;
  const isMobile = variant === "mobile";
  const { isEditingProfile, startEditingProfile } = profileEditing;

  if (isOwner) {
    if (isMobile) {
      return (
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={startEditingProfile}
          aria-label="编辑个人资料"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      );
    }

    // Desktop - 只在未编辑时显示编辑按钮
    if (!isEditingProfile) {
      return (
        <button
          className="
            btn flex w-full mt-4 border border-base-300
            hover:text-info
            transition-colors h-10 cursor-pointer
          "
          type="button"
          onClick={startEditingProfile}
          aria-label="编辑个人资料"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-sm">编辑个人资料</span>
        </button>
      );
    }

    return null;
  }

  // 非本人的操作按钮
  if (isMobile) {
    return (
      <div className="flex-col">
        <FollowButton userId={user?.userId || -1} />
        <FriendRequestButton
          targetUserId={user?.userId}
          targetUsername={user?.username}
          className="
            mt-4 flex h-8 min-h-8 btn btn-sm btn-ghost gap-1.5 rounded-md border
            border-base-300 bg-base-100 px-3
            hover:border-info/40 hover:text-info
          "
        />
        <button
          type="button"
          className="flex btn btn-sm btn-ghost mt-4 bg-base-100 border-base-300"
          onClick={() => router.history.push(`/chat/private/${userId}`)}
        >
          <svg
            width="14"
            height="14"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <g
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeWidth="2"
              fill="none"
              stroke="currentColor"
            >
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </g>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-col w-full mt-4">
      <FollowButton userId={user?.userId || 0} className="w-full" />
      <FriendRequestButton
        targetUserId={user?.userId}
        targetUsername={user?.username}
        className="
          btn mt-4 flex h-8 min-h-8 w-full gap-1.5 rounded-md border
          border-base-300 bg-base-100/70 px-3 text-sm transition-colors
          hover:border-info/40 hover:bg-base-200 hover:text-info
        "
      />
      <button
        type="button"
        className="
          btn mt-4 flex h-8 min-h-8 w-full gap-1.5 rounded-md border
          border-base-300 bg-base-100/70 px-3 text-sm transition-colors
          hover:border-info/40 hover:bg-base-200 hover:text-info
        "
        onClick={() => router.history.push(`/chat/private/${userId}`)}
      >
        <svg
          aria-label="私信"
          width="16"
          height="16"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="flex-shrink-0"
        >
          <g
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="2"
            fill="none"
            stroke="currentColor"
          >
            <rect width="20" height="16" x="2" y="4" rx="2"></rect>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
          </g>
        </svg>
        <span className="text-sm">私信</span>
      </button>
    </div>
  );
};

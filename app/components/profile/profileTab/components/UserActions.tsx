import type { UserInfoResponse } from "../../../../../api";
import React from "react";
import { Link } from "react-router";
import { FollowButton } from "@/components/common/Follow/FollowButton";

interface ProfileEditingActions {
  isEditingProfile: boolean;
  startEditingProfile: () => void;
}

interface AccountSecurityActions {
  openPasswordSecurity: () => void;
  openEmailSecurity: () => void;
}

interface UserActionsProps {
  user: UserInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  isLoading: boolean;
  profileEditing: ProfileEditingActions;
  accountSecurity: AccountSecurityActions;
  variant?: "mobile" | "desktop";
}

export const UserActions: React.FC<UserActionsProps> = ({
  user,
  userId,
  loginUserId,
  isLoading,
  profileEditing,
  accountSecurity,
  variant = "desktop",
}) => {
  if (isLoading)
    return null;

  const isOwner = userId === loginUserId;
  const isMobile = variant === "mobile";
  const { isEditingProfile, startEditingProfile } = profileEditing;
  const { openPasswordSecurity, openEmailSecurity } = accountSecurity;

  if (isOwner) {
    if (isMobile) {
      return (
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={openPasswordSecurity}
            aria-label="修改密码"
          >
            改密
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={openEmailSecurity}
            aria-label="绑定或换绑邮箱"
          >
            邮箱
          </button>
        </div>
      );
    }

    return (
      <div className="w-full mt-4 space-y-3">
        {!isEditingProfile && (
          <button
            className="btn flex w-full border border-gray-300 hover:text-primary transition-colors h-10 cursor-pointer"
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
        )}
        <button
          className="btn flex w-full border border-gray-300 hover:text-primary transition-colors h-10 cursor-pointer"
          type="button"
          onClick={openPasswordSecurity}
          aria-label="修改密码"
        >
          <span className="text-sm">修改密码</span>
        </button>
        <button
          className="btn flex w-full border border-gray-300 hover:text-primary transition-colors h-10 cursor-pointer"
          type="button"
          onClick={openEmailSecurity}
          aria-label="绑定或换绑邮箱"
        >
          <span className="text-sm">绑定/换绑邮箱</span>
        </button>
      </div>
    );
  }

  // 非本人的操作按钮
  if (isMobile) {
    return (
      <div className="flex-col">
        <FollowButton userId={user?.userId || -1} />
        <Link
          to={`/chat/private/${userId}`}
          className="flex btn btn-sm btn-ghost mt-4 bg-base-100 border-gray-300"
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
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-col w-full mt-4">
      <FollowButton userId={user?.userId || 0} className="w-full" />
      <Link to={`/chat/private/${userId}`} className="flex w-full flex-shrink-0 mt-4">
        <button
          type="button"
          className="btn flex border w-full border-gray-300 rounded-3 hover:text-primary transition-colors h-8 cursor-pointer"
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
      </Link>
    </div>
  );
};

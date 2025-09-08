import type { UserInfoResponse } from "../../../../../api";
import TagManagement from "@/components/common/userTags";
import GNSSpiderChart from "@/components/profile/cards/GNSSpiderChart";
import React from "react";
import { FollowStats } from "./FollowStats";
import { UserActions } from "./UserActions";
import { UserAvatar } from "./UserAvatar";
import { UserProfile } from "./UserProfile";

interface DesktopProfileSidebarProps {
  user: UserInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  isLoading: boolean;
  isEditingProfile: boolean;
  editingUsername: string;
  editingDescription: string;
  followingCount: number;
  followersCount: number;
  onUsernameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSaveProfile: () => void;
  onCancelEditing: () => void;
  onStartEditing: () => void;
  onAvatarUpdate: (url: string) => void;
  onFollowingClick: () => void;
  onFollowersClick: () => void;
  isSaving: boolean;
}

export const DesktopProfileSidebar: React.FC<DesktopProfileSidebarProps> = ({
  user,
  userId,
  loginUserId,
  isLoading,
  isEditingProfile,
  editingUsername,
  editingDescription,
  followingCount,
  followersCount,
  onUsernameChange,
  onDescriptionChange,
  onSaveProfile,
  onCancelEditing,
  onStartEditing,
  onAvatarUpdate,
  onFollowingClick,
  onFollowersClick,
  isSaving,
}) => {
  return (
    <div className="hidden md:flex flex-col items-center rounded-2xl p-2">
      {/* 头像 */}
      <UserAvatar
        user={user}
        userId={userId}
        loginUserId={loginUserId}
        isLoading={isLoading}
        isEditingProfile={isEditingProfile}
        size="lg"
        onAvatarUpdate={onAvatarUpdate}
      />

      {/* 用户名和简介 */}
      <UserProfile
        user={user}
        userId={userId}
        loginUserId={loginUserId}
        isLoading={isLoading}
        isEditingProfile={isEditingProfile}
        editingUsername={editingUsername}
        editingDescription={editingDescription}
        onUsernameChange={onUsernameChange}
        onDescriptionChange={onDescriptionChange}
        onSave={onSaveProfile}
        onCancel={onCancelEditing}
        isSaving={isSaving}
        variant="desktop"
      />

      {/* 关注粉丝统计 */}
      <FollowStats
        followingCount={followingCount}
        followersCount={followersCount}
        onFollowingClick={onFollowingClick}
        onFollowersClick={onFollowersClick}
        variant="desktop"
      />

      {/* 用户标签 */}
      <div className="mb-4 mt-4">
        <TagManagement userId={userId} />
      </div>

      {/* 编辑个人资料按钮或其他操作按钮 */}
      <UserActions
        user={user}
        userId={userId}
        loginUserId={loginUserId}
        isLoading={isLoading}
        isEditingProfile={isEditingProfile}
        onStartEditing={onStartEditing}
        variant="desktop"
      />

      {/* GNS雷达图 */}
      {!isLoading && (
        <div className="mt-6 w-full">
          <GNSSpiderChart userId={userId} />
        </div>
      )}
    </div>
  );
};

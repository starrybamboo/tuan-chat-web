import type { UserInfoResponse } from "../../../../../api";
import React from "react";
import { FollowStats } from "./FollowStats";
import { ProfileEditPanel } from "./ProfileEditPanel";
import { UserActions } from "./UserActions";
import { UserAvatar } from "./UserAvatar";
import { UserProfile } from "./UserProfile";

interface MobileProfileHeaderProps {
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

export const MobileProfileHeader: React.FC<MobileProfileHeaderProps> = ({
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
    <>
      {/* 小屏幕布局 - 顶部栏样式 */}
      <div className="md:hidden flex flex-row items-center justify-between p-4 bg-base-200 rounded-2xl">
        {/* 头像和用户名 */}
        <div className="flex gap-4">
          <UserAvatar
            user={user}
            userId={userId}
            loginUserId={loginUserId}
            isLoading={isLoading}
            size="sm"
            onAvatarUpdate={onAvatarUpdate}
          />
          <UserProfile
            user={user}
            userId={userId}
            loginUserId={loginUserId}
            isLoading={isLoading}
            isEditingProfile={false} // Mobile 版本不在此处编辑
            editingUsername={editingUsername}
            editingDescription={editingDescription}
            onUsernameChange={onUsernameChange}
            onDescriptionChange={onDescriptionChange}
            onSave={onSaveProfile}
            onCancel={onCancelEditing}
            isSaving={isSaving}
            variant="mobile"
          />
        </div>

        {/* 小屏幕操作按钮 */}
        {!isLoading && (
          <div className="flex gap-2">
            <UserActions
              user={user}
              userId={userId}
              loginUserId={loginUserId}
              isLoading={isLoading}
              isEditingProfile={isEditingProfile}
              onStartEditing={onStartEditing}
              variant="mobile"
            />
          </div>
        )}
      </div>

      {/* 小屏幕编辑面板 */}
      <ProfileEditPanel
        isVisible={userId === loginUserId && isEditingProfile}
        editingUsername={editingUsername}
        editingDescription={editingDescription}
        onUsernameChange={onUsernameChange}
        onDescriptionChange={onDescriptionChange}
        onSave={onSaveProfile}
        onCancel={onCancelEditing}
        isSaving={isSaving}
      />

      {/* 关注粉丝统计 */}
      <FollowStats
        followingCount={followingCount}
        followersCount={followersCount}
        onFollowingClick={onFollowingClick}
        onFollowersClick={onFollowersClick}
        variant="mobile"
      />
    </>
  );
};

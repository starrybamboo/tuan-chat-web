import { UserFollower } from "@/components/common/Follow/UserFollower";

import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import React from "react";

import { useGetUserInfoQuery } from "../../../../api/queryHooks";
import { DesktopProfileSidebar } from "./components/DesktopProfileSidebar";
import { MobileProfileHeader } from "./components/MobileProfileHeader";
import { UserReadMe } from "./components/UserReadMe";
import { useFollowData } from "./hooks/useFollowData";
import { useProfileEditing } from "./hooks/useProfileEditing";

interface HomeTabProps {
  userId: number;
}

export const HomeTab: React.FC<HomeTabProps> = ({ userId }) => {
  const userQuery = useGetUserInfoQuery(userId);
  const loginUserId = useGlobalContext().userId ?? -1;
  const user = userQuery.data?.data;

  // 使用自定义 hooks 管理状态
  const profileEditing = useProfileEditing(user);
  const followData = useFollowData(userId);

  return (
    <div className="max-w-7xl mx-auto p-2 transition-all duration-300 md:flex">
      <div className="w-full flex flex-col md:max-w-1/4 py-4 md:py-8">
        <MobileProfileHeader
          user={user}
          userId={userId}
          loginUserId={loginUserId}
          isLoading={userQuery.isLoading}
          isEditingProfile={profileEditing.isEditingProfile}
          editingUsername={profileEditing.editingUsername}
          editingDescription={profileEditing.editingDescription}
          followingCount={followData.followStats.following}
          followersCount={followData.followStats.followers}
          onUsernameChange={profileEditing.setEditingUsername}
          onDescriptionChange={profileEditing.setEditingDescription}
          onSaveProfile={profileEditing.saveProfile}
          onCancelEditing={profileEditing.cancelEditingProfile}
          onStartEditing={profileEditing.startEditingProfile}
          onAvatarUpdate={profileEditing.handleAvatarUpdate}
          onFollowingClick={followData.handleFollowingClick}
          onFollowersClick={followData.handleFollowersClick}
          isSaving={profileEditing.isSaving}
        />

        <DesktopProfileSidebar
          user={user}
          userId={userId}
          loginUserId={loginUserId}
          isLoading={userQuery.isLoading}
          isEditingProfile={profileEditing.isEditingProfile}
          editingUsername={profileEditing.editingUsername}
          editingDescription={profileEditing.editingDescription}
          followingCount={followData.followStats.following}
          followersCount={followData.followStats.followers}
          onUsernameChange={profileEditing.setEditingUsername}
          onDescriptionChange={profileEditing.setEditingDescription}
          onSaveProfile={profileEditing.saveProfile}
          onCancelEditing={profileEditing.cancelEditingProfile}
          onStartEditing={profileEditing.startEditingProfile}
          onAvatarUpdate={profileEditing.handleAvatarUpdate}
          onFollowingClick={followData.handleFollowingClick}
          onFollowersClick={followData.handleFollowersClick}
          isSaving={profileEditing.isSaving}
        />
      </div>

      <UserReadMe
        user={user}
        userId={userId}
        loginUserId={loginUserId}
        onSave={profileEditing.saveReadMe}
        isSaving={profileEditing.isSaving}
      />

      <PopWindow
        isOpen={followData.isFFWindowOpen}
        onClose={followData.closeFollowWindow}
      >
        <UserFollower activeTab={followData.relationTab} userId={userId} />
      </PopWindow>
    </div>
  );
};

export default HomeTab;

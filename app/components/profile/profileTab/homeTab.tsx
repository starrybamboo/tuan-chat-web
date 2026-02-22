import type { SecurityTab } from "./components/AccountSecurityModal";
import React, { useState } from "react";
import { UserFollower } from "@/components/common/Follow/UserFollower";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import TagManagement from "@/components/common/userTags";
import { useGlobalContext } from "@/components/globalContextProvider";

import GNSSpiderChart from "@/components/profile/cards/GNSSpiderChart";
import { useGetUserProfileQuery } from "../../../../api/hooks/UserHooks";
import { AccountSecurityModal } from "./components/AccountSecurityModal";
import { FollowStats } from "./components/FollowStats";
import { ProfileEditPanel } from "./components/ProfileEditPanel";
import { UserActions } from "./components/UserActions";
import { UserAvatar } from "./components/UserAvatar";
import { UserProfile } from "./components/UserProfile";
import { UserReadMe } from "./components/UserReadMe";
import { useFollowData } from "./hooks/useFollowData";
import { useProfileEditing } from "./hooks/useProfileEditing";

interface HomeTabProps {
  userId: number;
}

const HomeTab: React.FC<HomeTabProps> = ({ userId }) => {
  const userQuery = useGetUserProfileQuery(userId);
  const loginUserId = useGlobalContext().userId ?? -1;
  const user = userQuery.data?.data;

  // 使用自定义 hooks 管理状态
  const profileEditing = useProfileEditing(user);
  const followData = useFollowData(userId);
  const [accountSecurityState, setAccountSecurityState] = useState<{
    isOpen: boolean;
    tab: SecurityTab;
  }>({
    isOpen: false,
    tab: "password",
  });

  const openPasswordSecurity = () => {
    setAccountSecurityState({
      isOpen: true,
      tab: "password",
    });
  };

  const openEmailSecurity = () => {
    setAccountSecurityState({
      isOpen: true,
      tab: "email",
    });
  };

  const closeAccountSecurity = () => {
    setAccountSecurityState(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-2 py-2 pl-3 md:pl-4 lg:pl-6 transition-all duration-300 md:flex">
      <div className="w-full flex flex-col md:w-[30%] lg:w-[27%]">
        {/* 移动端布局 */}
        <div className="md:hidden">
          {/* 小屏幕布局 - 顶部栏样式 */}
          <div className="flex flex-row items-center justify-between p-4 bg-base-100 rounded-2xl">
            {/* 头像和用户名 */}
            <div className="flex gap-4">
              <UserAvatar
                user={user}
                userId={userId}
                loginUserId={loginUserId}
                isLoading={userQuery.isLoading}
                size="sm"
                onAvatarUpdate={profileEditing.handleAvatarUpdate}
              />
              <UserProfile
                user={user}
                userId={userId}
                loginUserId={loginUserId}
                isLoading={userQuery.isLoading}
                profileEditing={profileEditing}
                variant="mobile"
              />
            </div>

            {/* 小屏幕操作按钮 */}
            {!userQuery.isLoading && (
              <div className="flex gap-2">
                <UserActions
                  user={user}
                  userId={userId}
                  loginUserId={loginUserId}
                  isLoading={userQuery.isLoading}
                  profileEditing={profileEditing}
                  accountSecurity={{
                    openPasswordSecurity,
                    openEmailSecurity,
                  }}
                  variant="mobile"
                />
              </div>
            )}
          </div>

          <div className="mb-4 mt-4">
            <TagManagement userId={userId} />
          </div>

          {/* 小屏幕编辑面板 */}
          <ProfileEditPanel
            isVisible={userId === loginUserId && profileEditing.isEditingProfile}
            profileEditing={profileEditing}
          />

          {/* 关注粉丝统计 - 移动端 */}
          <FollowStats
            followingCount={followData.followStats.following}
            followersCount={followData.followStats.followers}
            onFollowingClick={followData.handleFollowingClick}
            onFollowersClick={followData.handleFollowersClick}
            variant="mobile"
          />
        </div>

        {/* 桌面端布局 */}
        <div className="hidden md:flex flex-col items-start rounded-2xl py-4 px-16">
          {/* 头像 */}
          <UserAvatar
            user={user}
            userId={userId}
            loginUserId={loginUserId}
            isLoading={userQuery.isLoading}
            size="lg"
            onAvatarUpdate={profileEditing.handleAvatarUpdate}
          />

          {/* 用户名和简介 */}
          <UserProfile
            user={user}
            userId={userId}
            loginUserId={loginUserId}
            isLoading={userQuery.isLoading}
            profileEditing={profileEditing}
            variant="desktop"
          />

          {/* 关注粉丝统计 - 桌面端 */}
          <FollowStats
            followingCount={followData.followStats.following}
            followersCount={followData.followStats.followers}
            onFollowingClick={followData.handleFollowingClick}
            onFollowersClick={followData.handleFollowersClick}
            variant="desktop"
          />

          {/* 编辑个人资料按钮或其他操作按钮 */}
          <UserActions
            user={user}
            userId={userId}
            loginUserId={loginUserId}
            isLoading={userQuery.isLoading}
            profileEditing={profileEditing}
            accountSecurity={{
              openPasswordSecurity,
              openEmailSecurity,
            }}
            variant="desktop"
          />

          {/* 用户标签 */}
          <div className="mb-4 mt-4">
            <TagManagement userId={userId} canEdit={true} />
          </div>

          {/* GNS雷达图 */}
          {!userQuery.isLoading && (
            <div className="mt-6 w-full">
              <GNSSpiderChart userId={userId} />
            </div>
          )}
        </div>
      </div>

      <UserReadMe
        userId={userId}
        loginUserId={loginUserId}
      />

      <ToastWindow
        isOpen={followData.isFFWindowOpen}
        onClose={followData.closeFollowWindow}
      >
        <UserFollower activeTab={followData.relationTab} userId={userId} />
      </ToastWindow>

      <AccountSecurityModal
        isOpen={accountSecurityState.isOpen}
        initialTab={accountSecurityState.tab}
        onClose={closeAccountSecurity}
      />
    </div>
  );
};

export default HomeTab;

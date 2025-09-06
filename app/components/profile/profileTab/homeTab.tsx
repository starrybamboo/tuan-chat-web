import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { FollowButton } from "@/components/common/Follow/FollowButton";
import { UserFollower } from "@/components/common/Follow/UserFollower";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import { PopWindow } from "@/components/common/popWindow";
import UserStatusDot from "@/components/common/userStatusBadge.jsx";
import TagManagement from "@/components/common/userTags";
import { useGlobalContext } from "@/components/globalContextProvider";
import GNSSpiderChart from "@/components/profile/cards/GNSSpiderChart";
import EditProfilePop from "@/components/profile/popWindows/editProfilePop";
import React, { useState } from "react";
import { Link } from "react-router";
import { useGetUserFollowersQuery, useGetUserFollowingsQuery } from "../../../../api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

interface HomeTabProps {
  userId: number;
}

export const HomeTab: React.FC<HomeTabProps> = ({ userId }) => {
  const userQuery = useGetUserInfoQuery(userId);
  const [isExpanded, setIsExpanded] = useState(false);
  const loginUserId = useGlobalContext().userId ?? -1;
  const user = userQuery.data?.data;
  const [isFFWindowOpen, setIsFFWindowOpen] = useSearchParamsState<boolean>(`userEditPop${userId}`, false);
  const [isEditWindowOpen, setIsEditWindowOpen] = useSearchParamsState<boolean>(`profileEditPop`, false);
  const [relationTab, setRelationTab] = useState<"following" | "followers">("following");

  const followingsQuery = useGetUserFollowingsQuery(userId, {
    pageNo: 1,
    pageSize: 16,
  });

  const followersQuery = useGetUserFollowersQuery(userId, {
    pageNo: 1,
    pageSize: 16,
  });

  const followStats = {
    following: followingsQuery.data?.data?.totalRecords || 0,
    followers: followersQuery.data?.data?.totalRecords || 0,
  };

  // 在点击处理器中
  const handleFollowingClick = () => {
    setRelationTab("following"); // 使用 setState 来更新值
    setIsFFWindowOpen(true);
  };

  const handleFollowersClick = () => {
    setRelationTab("followers"); // 使用 setState 来更新值
    setIsFFWindowOpen(true);
  };

  // 用于测试的，写死的数据
  // const userProfile = {
  //   lastLoginTime: "1999-13-32 25:100",
  //   rating: 0,
  //   sessions: 0,
  //   kpSessions: 0,
  // };

  return (
    <div className="max-w-7xl mx-auto p-2 transition-all duration-300 md:flex">
      {/* 在 md 及以上屏幕显示侧边栏布局，在 md 以下显示顶部栏布局 */}
      <div className="w-full flex flex-col md:max-w-1/4 py-4 md:py-8">
        {/* 小屏幕布局 - 顶部栏样式 */}
        <div className="md:hidden flex flex-row items-center justify-between p-4 bg-base-200 rounded-2xl">
          {/* 头像和用户名 */}
          <div className="flex gap-4">
            <div className="w-16 h-16">
              {userQuery?.isLoading
                ? (
                    <div className="skeleton w-16 h-16 rounded-full"></div>
                  )
                : (
                    <div className="pointer-events-none relative">
                      <img
                        src={user?.avatar || undefined}
                        alt={user?.username}
                        className="mask mask-circle w-16 h-16 object-cover"
                      />
                      <UserStatusDot
                        status={user?.activeStatus}
                        size="sm"
                        editable={true}
                        className="absolute border-2 border-white bottom-1 right-1"
                      />
                    </div>
                  )}
            </div>
            <div>
              {userQuery.isLoading
                ? (
                    <div className="skeleton h-6 w-32"></div>
                  )
                : (
                    <>
                      <h2 className="text-lg font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                        {user?.username || "未知用户"}
                      </h2>
                      <div className="w-52">
                        <p className={`text-base break-words ${isExpanded ? "" : "line-clamp-2"}`}>
                          {user?.description || "这个人就是个杂鱼，什么也不愿意写喵~"}
                        </p>
                        {user?.description && user.description.length > 80 && (
                          <button
                            onClick={() => setIsExpanded(prev => !prev)}
                            className="text-blue-400 text-xs mt-1 hover:underline"
                            type="button"
                          >
                            {isExpanded ? "收起" : "展开"}
                          </button>
                        )}
                      </div>
                    </>
                  )}
            </div>
          </div>
          {/* 小屏幕操作按钮 */}
          {!userQuery.isLoading && (
            <div className="flex gap-2">
              {user?.userId === loginUserId
                ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setIsEditWindowOpen(true)}
                      aria-label="编辑"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )
                : (
                    <div className="flex-col">
                      <FollowButton userId={user?.userId || -1} />
                      <Link to={`/chat/private/${userId}`} className="flex btn btn-sm btn-ghost mt-4 bg-base-100 border-gray-300">
                        <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor">
                            <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                          </g>
                        </svg>
                      </Link>
                    </div>
                  )}
            </div>
          )}
        </div>

        {/* 关注粉丝统计 - 小屏幕显示在顶部栏下方 */}
        <div className="md:hidden flex justify-center gap-8 py-3 rounded-2xl mt-2">
          <div className="btn-active flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer" onClick={handleFollowingClick}>
            <div className="stat-value text-sm">{followStats.following}</div>
            <div className="stat-title text-sm">关注</div>
          </div>
          <span className="border-l"></span>
          <div className="flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer" onClick={handleFollowersClick}>
            <div className="stat-value text-sm">{followStats.followers}</div>
            <div className="stat-title text-sm">粉丝</div>
          </div>
        </div>

        {/* 大屏幕布局 - 侧边栏样式 */}
        <div className="hidden md:flex flex-col items-center rounded-2xl p-2">
          {/* 头像 */}
          <div className="md:w-46 lg:w-54">
            {userQuery?.isLoading
              ? (
                  <div className="skeleton md:w-48 md:h-48 lg:w-54 lg:h-54 rounded-full"></div>
                )
              : (
                  <div className="pointer-events-none w-full h-full relative">
                    <img
                      src={user?.avatar || undefined}
                      alt={user?.username}
                      className="mask mask-circle w-full h-full object-cover"
                    />
                    <UserStatusDot
                      status={user?.activeStatus}
                      size="lg"
                      editable={true}
                      className="absolute border-4 border-white bottom-4 right-4 "
                    />
                  </div>
                )}
          </div>

          {/* 用户名 */}
          <div className="self-start">
            {userQuery.isLoading
              ? (
                  <div className="skeleton h-8 w-48"></div>
                )
              : (
                  <h2 className="text-2xl font-bold h-8 overflow-hidden text-ellipsis whitespace-nowrap">
                    {user?.username || "未知用户"}
                  </h2>
                )}
          </div>

          {/* 简介 */}
          <div className="w-full mt-4">
            {userQuery.isLoading
              ? (
                  <div className="skeleton h-6 w-full"></div>
                )
              : (
                  <div>
                    <div
                      className={`text-base break-words overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? "max-h-96" : "max-h-12"
                      }`}
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: isExpanded ? "unset" : 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      <p className="leading-6">
                        {user?.description || "这个人就是个杂鱼，什么也不愿意写喵~"}
                      </p>
                    </div>
                    {user?.description && user.description.length > 80 && (
                      <button
                        onClick={() => setIsExpanded(prev => !prev)}
                        className="text-blue-400 text-xs cursor-pointer mt-2 hover:underline transition-colors duration-200 flex items-center gap-1"
                        type="button"
                      >
                        <span>{isExpanded ? "收起" : "展开"}</span>
                        <svg
                          className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
          </div>

          {/* 关注粉丝统计 - 大屏幕显示在简介正下方 */}
          <div className="flex gap-8 justify-center w-full mt-4">
            <div className="flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer" onClick={handleFollowingClick}>
              <div className="stat-value text-sm">{followStats.following}</div>
              <div className="stat-title text-sm">关注</div>
            </div>
            <span className="border-l"></span>
            <div className="flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer" onClick={handleFollowersClick}>
              <div className="stat-value text-sm">{followStats.followers}</div>
              <div className="stat-title text-sm">粉丝</div>
            </div>
          </div>

          {/* 操作按钮 - 大屏幕 */}
          {!userQuery.isLoading && user?.userId === loginUserId && (
            <button
              className="btn flex w-full mt-4 border border-gray-300 hover:text-primary transition-colors h-8 cursor-pointer"
              type="button"
              onClick={() => setIsEditWindowOpen(true)}
              aria-label="编辑"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-sm">编辑个人资料</span>
            </button>
          )}
          {!userQuery.isLoading && user?.userId !== loginUserId && (
            <div className="flex-col w-full mt-4">
              <FollowButton userId={user?.userId || 0} className="w-full" />
              <Link to={`/chat/private/${userId}`} className="flex w-full flex-shrink-0 mt-4">
                <button
                  type="button"
                  className="btn flex border w-full border-gray-300 rounded-3 hover:text-primary transition-colors h-8 cursor-pointer"
                >
                  <svg aria-label="私信" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="flex-shrink-0">
                    <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor">
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </g>
                  </svg>
                  <span className="text-sm">私信</span>
                </button>
              </Link>
            </div>
          )}
          {/* 成就模块 */}
          {/* <UserAchievementMedals */}
          {/*  medals={userProfile?.medals} */}
          {/*  className="md:col-span-2 lg:col-span-1 mt-6" */}
          {/* /> */}
        </div>
      </div>
      {/* 右侧 - 真正的主页 */}
      <div className="flex-1 lg:m-2">
        <div className="p-4 shadow-md rounded-xl">
          {/* 个人主页的Readme */}
          <div className="p-2">
            <MarkDownViewer content={user?.readMe || "## Hi, welcome to my personal page!👋"}></MarkDownViewer>
          </div>

          {/* 用户标签 */}
          <div className="mb-4">
            <TagManagement userId={userId} />
          </div>

          {/* 用户ID和登录时间 - 紧凑布局 */}
          <div className="p-4 flex flex-wrap items-center gap-4 md:gap-8 mb-6">
            <div>
              <p className="text-sm">用户ID</p>
              <p className="font-mono text-lg font-medium">{userId}</p>
            </div>
            <div>
              {/* <p className="text-sm">最后上线时间</p> */}
              {/* <p className="font-mono text-lg font-medium">{userProfile.lastLoginTime}</p> */}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* 左侧 - 基本信息 */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 md:grid-cols-3">
                {/*  /!* 综合评价 *!/ */}
                {/*  <div className="rounded-xl p-5"> */}
                {/*    <p className="text-sm">综合评价</p> */}
                {/*    <div className="flex items-end mt-2"> */}
                {/*      <span className="text-4xl font-bold text-amber-600">{userProfile.rating}</span> */}
                {/*      <span className="ml-1 mb-1">/5.0</span> */}
                {/*    </div> */}
                {/*    <div className="mt-2 text-xs"> */}
                {/*      来自 */}
                {/*      {userProfile.sessions} */}
                {/*      个团评价 */}
                {/*    </div> */}
                {/*  </div> */}

                {/*  /!* 参团数量 *!/ */}
                {/*  <div className="rounded-xl p-5"> */}
                {/*    <p className="text-sm">参团数量</p> */}
                {/*    <div className="flex items-end mt-2"> */}
                {/*      <span className="text-4xl font-bold text-purple-600">{userProfile.sessions}</span> */}
                {/*      <span className="ml-1 mb-1">次</span> */}
                {/*    </div> */}
                {/*    <div className="mt-2 text-xs">近30天参与-次</div> */}
                {/*  </div> */}

                {/*  /!* 担任KP次数 *!/ */}
                {/*  <div className="rounded-xl p-5"> */}
                {/*    <p className="text-sm">担任KP次数</p> */}
                {/*    <div className="flex items-end mt-2"> */}
                {/*      <span className="text-4xl font-bold text-indigo-600">{userProfile.kpSessions}</span> */}
                {/*      <span className="ml-1 mb-1">次</span> */}
                {/*    </div> */}
                {/*    <div className="mt-2 text-xs"></div> */}
                {/*  </div> */}
              </div>
              {/* <div className="rounded-xl p-5 col-span-3"> */}
              {/*  <div className="flex justify-between items-center"> */}
              {/*    <p className="text-sm">模组创作</p> */}
              {/*    /!* <span className="text-sm text-indigo-600 font-medium">查看详情</span> *!/ */}
              {/*  </div> */}
              {/*  <div className="mt-3 flex gap-4"> */}
              {/*    <div className="text-center"> */}
              {/*      <div className="text-2xl font-bold text-indigo-600">0</div> */}
              {/*      <div className="text-sm mt-1">原创模组</div> */}
              {/*    </div> */}
              {/*    <div className="text-center"> */}
              {/*      <div className="text-2xl font-bold text-indigo-600">0</div> */}
              {/*      <div className="text-sm mt-1">改编模组</div> */}
              {/*    </div> */}
              {/*    <div className="text-center"> */}
              {/*      <div className="text-2xl font-bold text-indigo-600">0</div> */}
              {/*      <div className="text-sm mt-1">被收藏数量</div> */}
              {/*    </div> */}
              {/*  </div> */}
              {/* </div> */}
            </div>
            {/* 右侧 - 用户 GNS 雷达图 */}
            <div className="mb-4">
              <GNSSpiderChart userId={userId} />
            </div>
          </div>
        </div>

        {/* SC余额卡片 */}
        {/* {loginUserId === userId && ( */}
        {/*  <ScCurrencyDisplay></ScCurrencyDisplay> */}
        {/* )} */}
      </div>

      <PopWindow isOpen={isEditWindowOpen} fullScreen={true} onClose={() => setIsEditWindowOpen(false)}>
        <EditProfilePop onClose={() => setIsEditWindowOpen(false)}></EditProfilePop>
      </PopWindow>
      <PopWindow
        isOpen={isFFWindowOpen}
        onClose={() => {
          setIsFFWindowOpen(false);
          followingsQuery.refetch();
          followersQuery.refetch();
        }}
      >
        <UserFollower activeTab={relationTab} userId={userId}></UserFollower>
      </PopWindow>
    </div>
  );
};

export default HomeTab;

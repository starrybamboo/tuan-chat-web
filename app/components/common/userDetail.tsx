import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider"; // 添加这行导入
import EditProfileWindow from "@/components/profile/editProfileWindow";
import { useState } from "react";
import { useGetUserFollowersQuery, useGetUserFollowingsQuery } from "../../../api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "../../../api/queryHooks";
import { FollowButton } from "./Follow/FollowButton";
import { UserFollower } from "./Follow/UserFollower";
import { PopWindow } from "./popWindow";

/**
 * 显示用户详情界面的组件
 * @param userId 用户ID，组件内会自动调api来获取用户信息
 */
export function UserDetail({ userId }: { userId: number }) {
  const userQuery = useGetUserInfoQuery(userId);
  const globalContext = useGlobalContext(); // 添加这行

  const user = userQuery.data?.data;
  const [isFFWindowOpen, setIsFFWindowOpen] = useSearchParamsState<boolean>(`userEditPop${userId}`, false);
  const [isEditWindowOpen, setIsEditWindowOpen] = useSearchParamsState<boolean>(`profileEditPop`, false);
  // 状态颜色映射
  const activeStatus = String(user?.activeStatus).toLowerCase() as
      "active" | "offline" | "busy" | "away" | undefined;

  const statusColor = {
    active: "badge-success",
    offline: "badge-neutral",
    busy: "badge-warning",
    away: "badge-accent",
  }[activeStatus ?? "offline"] || "badge-neutral";

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

  return (
    <div className="card bg-base-100 relative">
      {/* 主体 */}
      <div className="card-body">
        {/* 头像-名字-描述 */}
        <div className="flex flex-col items-start">
          <img
            src="https://s21.ax1x.com/2025/03/31/pEs53vD.jpg"
            className="h-80 w-full object-cover object-center"
            alt="用户背景"
            onError={(e) => {
              e.currentTarget.src = "/default-background.jpg";
            }}
          />
          <div className="relative px-4 w-full">
            {/* 头像 */}
            <div className="avatar absolute -top-12 left-4">
              <div className="w-24 rounded-full ring-4 ring-base-100 bg-base-100">
                {userQuery.isLoading
                  ? (
                      <div className="skeleton w-24 h-24"></div>
                    )
                  : (
                      <img
                        src={user?.avatar || undefined}
                        alt={user?.username}
                        className="mask mask-circle"
                      />
                    )}
              </div>
            </div>
          </div>

          {/* 主要信息 */}
          <div className="flex justify-between w-full px-4">
            {/* 左边：名字和描述 */}
            <div className="pt-2 pl-32">
              <div className="flex items-center">
                {userQuery.isLoading
                  ? (
                      <div className="skeleton h-8 w-48"></div>
                    )
                  : (
                      <h2 className="text-2xl h-8 font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        {user?.username || "未知用户"}
                      </h2>
                    )}
                {user?.activeStatus && (
                  <div className={`badge ${statusColor} ml-2`}>
                    {user.activeStatus}
                  </div>
                )}
              </div>

              <div className="flex pb-4 pt-2">
                {userQuery.isLoading
                  ? (
                      <div className="skeleton h-6 w-32 mr-6"></div>
                    )
                  : ( // 描述目前是写死的
                      <p className="text-sm text-white/80 h-6 mr-6">
                        这个人就是个杂鱼，什么也不愿意写喵~
                      </p>
                    )}
                {user?.userId === globalContext.userId && (
                  <>
                    <button
                      className="btn p-1 rounded-full w-6 h-6 flex justify-center hover:text-info transition-colors cursor-pointer duration-400"
                      type="button"
                      onClick={() => setIsEditWindowOpen(true)}
                      aria-label="编辑"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* 右边：关注按钮 */}
            {
              user?.userId !== globalContext.userId && (
                <div className="flex justify-between p-4">
                  <FollowButton userId={user?.userId || 0} />
                </div>
              )
            }
          </div>
        </div>

        {/* 次要信息 */}
        <div className="relative">
          <div className="flex justify-between items-start">
            {/* 左边 - ID和最后登录时间 */}
            <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 items-baseline">
              <span className="text-base-content/70 pl-8">用户ID</span>
              <span className="font-mono">{userId}</span>

              {user?.lastLoginTime && (
                <>
                  <span className="text-base-content/70 pl-8">最后登录</span>
                  <span>{user.lastLoginTime}</span>
                </>
              )}
            </div>

            {/* 右边 - 关注/粉丝数 */}
            <div className="flex gap-8 pr-8">
              <div
                className="place-items-center hover:text-info transition-colors cursor-pointer"
                onClick={handleFollowingClick}
              >
                <div className="stat-value text-sm">{followStats.following}</div>
                <div className="stat-title text-sm">关注</div>
              </div>

              <div
                className="place-items-center hover:text-info transition-colors cursor-pointer"
                onClick={handleFollowersClick}
              >
                <div className="stat-value text-sm">{followStats.followers}</div>
                <div className="stat-title text-sm">粉丝</div>
              </div>
            </div>
          </div>
        </div>

        {/* 加载错误处理 */}
        {userQuery.isError && (
          <div className="alert alert-error mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>无法加载用户数据</span>
          </div>
        )}
      </div>

      {/* 相关的弹窗组件 */}
      <PopWindow isOpen={isEditWindowOpen} onClose={() => setIsEditWindowOpen(false)}>
        <EditProfileWindow onClose={() => setIsEditWindowOpen(false)}></EditProfileWindow>
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
}

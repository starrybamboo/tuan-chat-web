import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider"; // 添加这行导入
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
  const [isEditWindowOpen, setIsEditWindowOpen] = useSearchParamsState<boolean>(`userEditPop${userId}`, false);

  // 状态颜色映射
  const activeStatus = String(user?.activeStatus).toLowerCase() as
        "active" | "offline" | "busy" | "away" | undefined;

  const statusColor = {
    active: "badge-success",
    offline: "badge-neutral",
    busy: "badge-warning",
    away: "badge-accent",
  }[activeStatus ?? "offline"] || "badge-neutral";

  const [activeTab, setActiveTab] = useState<"following" | "followers">("following");

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
    setActiveTab("following"); // 使用 setState 来更新值
    setIsEditWindowOpen(true);
  };

  const handleFollowersClick = () => {
    setActiveTab("followers"); // 使用 setState 来更新值
    setIsEditWindowOpen(true);
  };

  return (
    <div className="card bg-base-100 min-w-[20vw]">
      <div className="card-body">
        {/* 头像部分 */}
        <div className="flex flex-col items-center gap-4">
          <div className="avatar">
            <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
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

          {/* 用户名及状态 */}
          {userQuery.isLoading
            ? (
                <div className="space-y-2">
                  <div className="skeleton h-6 w-32"></div>
                  <div className="skeleton h-4 w-20"></div>
                </div>
              )
            : (
                <div className="text-center space-y-1">
                  <h2 className="card-title text-2xl">
                    {user?.username || "未知用户" }
                  </h2>
                  {user?.activeStatus && (
                    <div className={`badge ${statusColor} gap-2`}>
                      user?.activeStatus
                    </div>
                  )}
                </div>
              )}
        </div>
        {/* 关注和粉丝 */}
        <div className="stats bg-base-100 border-base-300 border text-center">
          <div
            className="stat place-items-center hover:text-info transition-colors cursor-pointer"
            onClick={handleFollowingClick}
          >
            <div className="stat-value">{followStats.following}</div>
            <div className="stat-title text-sm">关注</div>
          </div>

          <div
            className="stat place-items-center hover:text-info transition-colors cursor-pointer"
            onClick={handleFollowersClick}
          >
            <div className="stat-value">{followStats.followers}</div>
            <div className="stat-title text-sm">粉丝</div>
          </div>
        </div>
        {/* 详细信息 */}
        <div className="divider"></div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-base-content/70">用户ID</span>
            <span className="font-mono">{userId}</span>
          </div>

          {user?.lastLoginTime && (
            <div className="flex justify-between">
              <span className="text-base-content/70">最后登录</span>
              <span>
                {user.lastLoginTime}
              </span>
            </div>
          )}
        </div>
        {
          user?.userId !== globalContext.userId && (
            <div className="flex justify-center">
              <FollowButton userId={user?.userId || 0} />
            </div>
          )
        }

        {/* 加载错误处理 */}
        {userQuery.isError && (
          <div className="alert alert-error mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>无法加载用户数据</span>
          </div>
        )}
      </div>
      <PopWindow
        isOpen={isEditWindowOpen}
        onClose={() => {
          setIsEditWindowOpen(false);
          followingsQuery.refetch();
          followersQuery.refetch();
        }}
      >
        <UserFollower activeTab={activeTab} userId={userId}></UserFollower>
      </PopWindow>
    </div>
  );
}

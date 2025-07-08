import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider"; // 添加这行导入
import EditProfileWindow from "@/components/profile/editProfileWindow";
import clsx from "clsx";
import { useState } from "react";
import { useGetUserFollowersQuery, useGetUserFollowingsQuery } from "../../../api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "../../../api/queryHooks";
import { FollowButton } from "./Follow/FollowButton";
import { UserFollower } from "./Follow/UserFollower";
import { PopWindow } from "./popWindow";

type Size = "default" | "compact";

interface UserDetailProps {
  userId: number;
  size?: Size; // 默认为 default
}

/**
 * 显示用户详情界面的组件
 * @param userId 用户ID，组件内会自动调api来获取用户信息
 * @param size
 */
export function UserDetail({ userId, size = "default" }: UserDetailProps) {
  const userQuery = useGetUserInfoQuery(userId);
  const globalContext = useGlobalContext(); // 添加这行

  const user = userQuery.data?.data;
  const [isFFWindowOpen, setIsFFWindowOpen] = useSearchParamsState<boolean>(`userEditPop${userId}`, false);
  const [isEditWindowOpen, setIsEditWindowOpen] = useSearchParamsState<boolean>(`profileEditPop`, false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 背景图片的大小
  const backgroundHeightMap = {
    compact: "h-32", // 小卡片
    default: "h-64", // 正常卡片
  };

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
            // 未来在这里会让用户上传背景图片
            // src="https://s21.ax1x.com/2025/03/31/pEs53vD.jpg" 测试用的固定图片
            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMTUwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzY2NiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+"
            className={clsx(
              "w-full object-cover object-center rounded-md",
              backgroundHeightMap[size ?? "default"],
            )}
            alt="用户背景"
            onError={(e) => {
              // No Image 灰色字样
              e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMTUwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzY2NiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+";
              e.currentTarget.onerror = null;
            }}
          />
          <div className="relative px-4 w-full">
            {/* 头像 */}
            <div className={clsx("avatar absolute left-4", size === "compact" ? "-top-9" : "-top-12")}>
              <div className={clsx("rounded-full ring-4 ring-base-100 bg-base-100", size === "compact" ? "w-16" : "w-24")}>
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
            {/* 关注按钮（仅在 sm 情况显示，浮动在头像下方） */}
            {user?.userId !== globalContext.userId && (
              <div
                className={clsx(
                  "absolute",
                  size === "compact" ? "block left-32 top-1" : "sm:block md:hidden left-6 top-[3.5rem]", // compact 时始终显示，否则仅在 sm 及以下显示
                )}
              >
                <FollowButton userId={user?.userId || 0} />
              </div>
            )}
          </div>

          {/* 主要信息 */}
          <div className="flex justify-between w-full">
            {/* 左边：名字和描述 */}
            <div className={clsx("pt-2", size === "compact" ? "pt-14" : "pl-32")}>
              <div className="flex items-center">
                {userQuery.isLoading
                  ? (
                      <div className="skeleton h-8 w-48 pr-4"></div>
                    )
                  : (
                      <h2 className="text-2xl h-8 font-bold pr-4 text-white truncate min-w-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        {user?.username || "未知用户"}
                      </h2>
                    )}
                {/* 用户状态指示小球 */}
                {user?.activeStatus !== undefined && (
                  <div className="badge flex-nowrap gap-1 rounded-full items-center ring-1 ring-white/50 px-2 py-1 text-sm min-w-fit whitespace-nowrap">
                    <div className={`w-4 h-4 rounded-full ${statusColor.replace("badge-", "bg-")}`} />
                    <span className="hidden sm:inline">
                      {
                        {
                          active: "在线",
                          offline: "离线",
                          busy: "忙碌",
                          away: "离开",
                        }[String(user.activeStatus).toLowerCase()] || "离线"
                      }
                    </span>
                  </div>
                )}
                {/* 编辑按钮 */}
                {user?.userId === globalContext.userId && (
                  <>
                    <button
                      className="btn p-1 rounded-full ml-4 w-6 h-6 flex justify-center hover:text-info transition-colors cursor-pointer duration-400"
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
              {/* 个人描述 */}
              <div className="flex flex-col sm:flex-row pb-4 pt-2 gap-2 sm:gap-6 w-full">
                <div className="flex-1 min-w-0 w-full">
                  {userQuery.isLoading
                    ? (
                        <div className="skeleton h-6 w-32"></div>
                      )
                    : (
                        <div className="">
                          <p
                            className={`text-base text-white/80 break-words transition-all duration-300 ${
                              isExpanded ? "" : "line-clamp-2"
                            }`}
                          >
                            这个人就是个杂鱼，什么也不愿意写喵~
                          </p>
                          <button
                            onClick={() => setIsExpanded(prev => !prev)}
                            className="text-blue-400 text-xs mt-1 hover:underline"
                          >
                            {isExpanded ? "收起" : "展开"}
                          </button>
                        </div>
                      )}
                </div>
              </div>
            </div>
            {/* 右边：关注按钮（sm及以上显示） */}
            {user?.userId !== globalContext.userId && size !== "compact" && (
              <div className="flex justify-between p-4 flex-shrink-0 hidden md:flex">
                <FollowButton userId={user?.userId || 0} />
              </div>
            )}
          </div>
        </div>

        {/* 次要信息 */}
        <div className="relative">
          <div className="flex justify-between items-start">
            {/* 左边 - ID和最后登录时间 */}
            <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 items-baseline">
              <span className={clsx("text-base text-base-content/70", size === "compact" ? "" : "pl-8")}>用户ID</span>
              <span className="text-base font-mono">{userId}</span>

              {user?.lastLoginTime && (
                <>
                  <span className="text-base text-base-content/70 pl-8">最后登录</span>
                  <span className="text-base font-mono">{user.lastLoginTime}</span>
                </>
              )}
            </div>

            {/* 右边 - 关注/粉丝数 */}
            <div className={clsx("flex gap-8", size === "compact" ? "" : "pr-8")}>
              <div
                className="flex flex-col items-center hover:text-info transition-colors cursor-pointer"
                onClick={handleFollowingClick}
              >
                <div className="stat-value text-sm">{followStats.following}</div>
                <div className="stat-title text-sm">关注</div>
              </div>

              <div
                className="flex flex-col items-center hover:text-info transition-colors cursor-pointer"
                onClick={handleFollowersClick}
              >
                <div className="stat-value text-sm text-center">{followStats.followers}</div>
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

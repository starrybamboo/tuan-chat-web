import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider";
import EditProfileWindow from "@/components/profile/editProfileWindow";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
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
 * @param {object} props - 组件属性
 * @param {string} props.userId - 用户ID，组件内会自动调api来获取用户信息
 * @param {"default" | "compact"} [props.size] - 组件尺寸，分为 `default` 与 `compact`（小卡片）
 */
export function UserDetail({ userId, size = "default" }: UserDetailProps) {
  const userQuery = useGetUserInfoQuery(userId);
  const globalContext = useGlobalContext(); // 添加这行

  const user = userQuery.data?.data;
  const [isFFWindowOpen, setIsFFWindowOpen] = useSearchParamsState<boolean>(`userEditPop${userId}`, false);
  const [isEditWindowOpen, setIsEditWindowOpen] = useSearchParamsState<boolean>(`profileEditPop`, false);
  const [isSmallMenuOpen, setIsSmallMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // 背景图片的大小
  const backgroundHeightMap = {
    compact: "h-40 scale-150", // 小卡片
    default: "h-64 ", // 正常卡片
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current?.contains(event.target as Node)) {
        setIsSmallMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleReport = () => {

  };

  const handleBlockUser = () => {
  };

  return (
    <div className={clsx(
      "card bg-base-100 relative",
      size === "compact"
        ? "w-90"
        : "w-full",
    )}
    >
      {/* 主体 */}
      <div className="card-body">
        {/* 头像-名字-描述 */}
        <div className="flex flex-col items-start">
          <div className="relative rounded-md overflow-hidden w-full">
            {/* 原图片 - 移除圆角样式 */}
            <img
              // 未来在这里会让用户上传背景图片
              // src="https://s21.ax1x.com/2025/03/31/pEs53vD.jpg" // 测试用的固定图片
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMTUwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzY2NiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+"
              className={clsx(
                "w-full object-cover object-center rounded-md scale-170 sm:scale-150 md:scale-130 lg:scale-100",
                backgroundHeightMap[size ?? "default"],
              )}
              alt="用户背景"
              onError={(e) => {
                // No Image 灰色字样
                e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMTUwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzY2NiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+";
                e.currentTarget.onerror = null;
              }}
            />

            {/* 透明挖角层 */}
            <div className="absolute bottom-0 right-0 rounded-sm
                  border-[20px] border-transparent
                  border-b-gray-200/30 border-r-gray-200/30"
            />

            {/* 更新背景按钮 */}
            <button
              type="button"
              className="absolute bottom-1.5 right-1.5 p-1.5 bg-black/40 rounded-full
               backdrop-blur-sm hover:bg-black/80 transition-colors duration-200 cursor-pointer"
              aria-label="更新背景"
            >
              {/* 相机图标 - 使用 Heroicons 图标 */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
          <div className="relative px-4 w-full">
            {/* 头像 */}
            <div className={clsx("avatar absolute left-4", size === "compact" ? "-top-9" : "-top-12")}>
              <div
                className={clsx("rounded-full ring-4 ring-base-100 bg-base-100", size === "compact" ? "w-16" : "w-24")}
              >
                {userQuery.isLoading
                  ? (
                      <div className="skeleton w-24 h-24"></div>
                    )
                  : (
                      <div className={size === "default" ? "pointer-events-none" : ""}>
                        <Link
                          to={`/profile/${userId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={user?.avatar || undefined}
                            alt={user?.username}
                            className="mask mask-circle"
                            style={{ cursor: size === "default" ? "default" : "pointer" }}
                          />
                        </Link>
                      </div>
                    )}
              </div>
            </div>
            {/* 关注按钮（仅在 sm 情况显示，浮动在头像下方） */}
            {user?.userId !== globalContext.userId && size === "compact" && (
              <div className="absolute block left-38 top-1">
                <FollowButton userId={user?.userId || 0} />
              </div>
            )}
          </div>

          {/* 主要信息 */}
          <div className="flex justify-between w-full pl-2">
            {/* 左边：名字和描述 */}
            <div className={clsx("pt-2", size === "compact" ? "pt-14" : "pl-32")}>
              <div className="flex items-center">
                {userQuery.isLoading
                  ? (
                      <div className="skeleton h-8 w-48 pr-4"></div>
                    )
                  : (
                      <h2 className="text-2xl font-bold h-8 pr-4 transition-all duration-300
               max-w-2/5 sm:max-w-2/5 md:max-w-3/5
               overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        {size === "default"
                          ? (
                              user?.username || "未知用户"
                            )
                          : (
                              <Link
                                to={`/profile/${userId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline cursor-pointer"
                              >
                                {user?.username || "未知用户"}
                              </Link>
                            )}
                      </h2>
                    )}
                {/* 用户状态指示小球 */}
                {user?.activeStatus !== undefined && (
                  <div
                    className="badge flex-nowrap gap-0 rounded-full ring-1 ring-white/50 px-1 text-sm whitespace-nowrap transition-all duration-300"
                  >
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
              </div>
              {/* 个人描述 */}
              <div className="py-2">
                {userQuery.isLoading
                  ? (
                      <div className="skeleton h-6 w-32"></div>
                    )
                  : (
                      <div>
                        <p
                          className={`text-base break-words sm:text-md lg:text-sm mr-4 ${
                            isExpanded ? "" : "line-clamp-2"
                          }`}
                        >
                          {user?.description ?? "这个人就是个杂鱼，什么也不愿意写喵~"}
                        </p>
                        <button
                          onClick={() => setIsExpanded(prev => !prev)}
                          className="text-blue-400 text-xs mt-1 hover:underline"
                          type="button"
                        >
                          {isExpanded ? "收起" : "展开"}
                        </button>
                      </div>
                    )}
              </div>
            </div>
          </div>
        </div>

        {/* 次要信息 */}
        <div className="relative pl-8">
          <div className="flex">
            {/* 左边 - 功能组件（关注，私信等等） */}
            {size === "default" && user?.userId !== globalContext.userId
              && (
                <div className="flex items-center w-full gap-4">
                  {/* 关注按钮 */}
                  <div className="flex-shrink-0 pb-2">
                    <FollowButton userId={user?.userId || 0} />
                  </div>

                  {/* 私信按钮 */}
                  <Link to={`/privatechat/${userId}`} className="flex-shrink-0">
                    <button
                      type="button"
                      className="btn flex items-center justify-center space-x-1 px-4 border border-gray-300 rounded-3 xl hover:text-primary transition-colors h-8 cursor-pointer"
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

                  {/* 三点菜单 */}
                  <div className="relative rounded-full" ref={menuRef}>
                    <button
                      type="button"
                      className="btn px-2 py-0.5 h-8 w-auto flex items-center justify-center border border-gray-300 hover:text-primary transition-colors cursor-pointer"
                      onClick={() => setIsSmallMenuOpen(!isSmallMenuOpen)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <circle cx="11" cy="10" r="1"></circle>
                        <circle cx="11" cy="5" r="1"></circle>
                        <circle cx="11" cy="15" r="1"></circle>
                      </svg>
                    </button>

                    {isSmallMenuOpen && (
                      <div className="absolute left-0 bottom-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          onClick={() => {
                            handleBlockUser();
                            setIsSmallMenuOpen(false);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                          </svg>
                          加入黑名单
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          onClick={() => {
                            handleReport();
                            setIsSmallMenuOpen(false);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          举报
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {size === "default" && user?.userId === globalContext.userId && (
              <button
                className="btn flex border border-gray-300 hover:text-primary transition-colors h-8 cursor-pointer"
                type="button"
                onClick={() => setIsEditWindowOpen(true)}
                aria-label="编辑"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                <span className="text-sm">编辑</span>
              </button>
            )}

            {/* 右边 - 关注/粉丝数 */}
            <div className="flex gap-8 justify-items-end ml-auto">
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
        {size === "compact" && user?.userId !== globalContext.userId && (
          <Link to={`/privatechat/${userId}`} className="flex-shrink-0">
            <button
              type="button"
              className="btn flex items-center justify-center w-full border border-gray-300 rounded-3 xl hover:text-primary transition-colors h-8 cursor-pointer"
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
        )}

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

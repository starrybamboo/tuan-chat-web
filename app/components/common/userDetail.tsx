import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import UserStatusDot from "@/components/common/userStatusBadge.jsx";
import TagManagement from "@/components/common/userTags";
import { useGlobalContext } from "@/components/globalContextProvider";
import { Link } from "react-router";
import { useGetUserFollowersQuery, useGetUserFollowingsQuery } from "../../../api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "../../../api/queryHooks";
import { FollowButton } from "./Follow/FollowButton";
import { UserFollower } from "./Follow/UserFollower";
import { PopWindow } from "./popWindow";

interface UserDetailProps {
  userId: number;
}

/**
 * 显示用户详情界面的组件
 * @param {object} props - 组件属性
 * @param {string} props.userId - 用户ID，组件内会自动调api来获取用户信息
 */
export function UserDetail({ userId }: UserDetailProps) {
  const userQuery = useGetUserInfoQuery(userId);
  const loginUserId = useGlobalContext().userId ?? -1;

  const user = userQuery.data?.data;
  const [isFFWindowOpen, setIsFFWindowOpen] = useSearchParamsState<boolean>(`userEditPop${userId}`, false);

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

  return (
    <div className="card bg-base-100 relative w-90 shadow-lg">
      <div className="card-body p-4 gap-3">
        {/* 顶部：头像 + 名称/描述 */}
        <div className="flex items-start gap-4">
          <div className="avatar">
            <div className="rounded-full ring-2 ring-base-100 bg-base-100 w-16 h-16">
              {userQuery.isLoading
                ? (
                    <div className="skeleton w-16 h-16" />
                  )
                : (
                    <a
                      href={`/profile/${userId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={user?.avatar || undefined}
                        alt={user?.username}
                        className="mask mask-circle w-16 h-16 object-cover"
                      />
                    </a>
                  )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              {userQuery.isLoading
                ? (
                    <div className="skeleton h-6 w-32" />
                  )
                : (
                    <a
                      href={`/profile/${userId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xl font-semibold hover:underline cursor-pointer truncate max-w-xs"
                    >
                      {user?.username || "未知用户"}
                    </a>
                  )}
              <UserStatusDot status={user?.activeStatus} />
            </div>
            <div className="mt-1 text-sm leading-snug">
              {userQuery.isLoading
                ? (
                    <div className="skeleton h-4 w-40" />
                  )
                : (
                    <div>
                      <p className="break-words mr-2 line-clamp-2">
                        {user?.description ?? "这个人就是个杂鱼，什么也不愿意写喵~"}
                      </p>
                    </div>
                  )}
            </div>
          </div>
        </div>

        {/* 用户标签 */}
        <div className="pt-1">
          <TagManagement userId={userId} />
        </div>

        {/* 统计 + 操作区域 */}
        <div className="flex items-center justify-between mt-2 gap-4">
          <div className="flex gap-6">
            <div
              className="flex flex-col items-center pointer-events-none"
            >
              <span className="text-sm font-medium">{followStats.following}</span>
              <span className="text-[11px] opacity-70 leading-none mt-0.5">关注</span>
            </div>
            <div
              className="flex flex-col items-center pointer-events-none"
            >
              <span className="text-sm font-medium">{followStats.followers}</span>
              <span className="text-[11px] opacity-70 leading-none mt-0.5">粉丝</span>
            </div>
          </div>
          {user?.userId !== loginUserId && (
            <div className="flex items-center gap-2 ml-auto">
              <FollowButton userId={user?.userId || 0} />

              <Link to={`/chat/private/${userId}`} className="flex-shrink-0">
                <button
                  type="button"
                  className="btn btn-sm flex items-center h-8 px-3 border border-gray-300 hover:text-primary"
                >
                  <svg aria-label="私信" width="12" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="flex-shrink-0">
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
        </div>

        {/* 加载错误处理 */}
        {userQuery.isError && (
          <div className="alert alert-error mt-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-5 w-5"
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
      <PopWindow
        isOpen={isFFWindowOpen}
        onClose={() => {
          setIsFFWindowOpen(false);
          followingsQuery.refetch();
          followersQuery.refetch();
        }}
      >
        <UserFollower activeTab="following" userId={userId} />
      </PopWindow>
    </div>
  );
}

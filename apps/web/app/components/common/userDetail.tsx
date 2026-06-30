import { useRouter } from "@tanstack/react-router";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { FriendRequestButton } from "@/components/common/FriendRequestButton";
import { MediaImage } from "@/components/common/mediaImage";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import UserStatusDot from "@/components/common/userStatusBadge.jsx";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { imageLowUrl } from "@/utils/media/mediaUrl";

import { useGetUserFollowersQuery, useGetUserFollowingsQuery } from "../../../api/hooks/userFollowQueryHooks";
import { useGetUserProfileQuery } from "../../../api/hooks/UserHooks";
import { FollowButton } from "./Follow/FollowButton";
import { UserFollower } from "./Follow/UserFollower";

type UserDetailProps = {
  userId: number;
}

/**
 * 显示用户详情界面的组件
 * @param {object} props - 组件属性
 * @param {string} props.userId - 用户ID，组件内会自动调api来获取用户信息
 */
export function UserDetail({ userId }: UserDetailProps) {
  const router = useRouter();
  const userQuery = useGetUserProfileQuery(userId);
  const loginUserId = useGlobalUserId() ?? -1;

  const user = userQuery.data?.data;
  const [isFFWindowOpen, setIsFFWindowOpen] = useSearchParamsState<boolean>(`userEditPop${userId}`, false);
  const canInteractWithUser = typeof user?.userId === "number" && user.userId !== loginUserId;

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
    <div className="
      card relative w-[360px] overflow-hidden rounded-xl border
      border-base-300/70 bg-base-100/95 shadow-xl backdrop-blur
    ">
      <div className="card-body gap-3 p-4">
        {/* 顶部：头像 + 名称/描述 */}
        <div className="flex items-start gap-4">
          <div className="avatar">
            <div className="
              rounded-full ring-2 ring-base-100 bg-base-100 w-16 h-16
            ">
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
                      <MediaImage
                        src={imageLowUrl(user?.avatarFileId) || undefined}
                        alt={user?.username}
                        className="mask mask-circle w-16 h-16 object-cover"
                        fallbackSrc="/favicon.ico"
                      />
                    </a>
                  )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
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
                      className="
                        text-xl font-semibold
                        hover:underline
                        cursor-pointer truncate max-w-xs
                      "
                    >
                      {user?.username || "未知用户"}
                    </a>
                  )}
              <UserStatusDot status={user?.activeStatus} />
            </div>
            <span className="text-xs text-gray-400 block">
              UID:
              {" "}
              {userId}
            </span>
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
          {canInteractWithUser && (
            <FollowButton
              userId={user.userId}
              width="w-auto"
              className="h-7 min-h-7 shrink-0 rounded-full px-3 text-xs"
            />
          )}
        </div>

        {/* 统计 + 操作区域 */}
        <div className="mt-2 flex items-end justify-between gap-4">
          <div className="flex shrink-0 items-center gap-5">
            {/* 关注 */}
            <div className="flex flex-col">
              <a
                href={`/profile/${userId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group flex min-w-9 flex-col items-start gap-0.5
                  whitespace-nowrap
                "
              >
                <span className="
                  text-sm font-semibold leading-none text-base-content
                  group-hover:text-info
                ">{followStats.following}</span>
                <span className="text-[11px] leading-none text-base-content/55">关注</span>
              </a>
            </div>

            {/* 粉丝 */}
            <div className="flex flex-col">
              <a
                href={`/profile/${userId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group flex min-w-9 flex-col items-start gap-0.5
                  whitespace-nowrap
                "
              >
                <span className="
                  text-sm font-semibold leading-none text-base-content
                  group-hover:text-info
                ">{followStats.followers}</span>
                <span className="text-[11px] leading-none text-base-content/55">粉丝</span>
              </a>
            </div>
          </div>

          {canInteractWithUser && (
            <div className="ml-auto flex w-[184px] items-center gap-2">
              <FriendRequestButton
                targetUserId={user.userId}
                targetUsername={user?.username}
                className="
                  btn btn-sm flex h-8 min-h-8 flex-1 items-center justify-center
                  gap-1.5 rounded-md border border-base-300/80 bg-base-100/70
                  px-2 text-sm
                  hover:border-info/40 hover:bg-base-200 hover:text-info
                "
              />

              <button
                type="button"
                className="
                  btn btn-sm flex h-8 min-h-8 flex-1 items-center gap-1.5
                  rounded-md border border-base-300/80 bg-base-100/70 px-3
                  text-sm
                  hover:border-info/40 hover:bg-base-200 hover:text-info
                "
                onClick={() => router.history.push(`/chat/private/${userId}`)}
              >
                <svg aria-label="私信" width="12" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="
                  flex-shrink-0
                ">
                  <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor">
                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </g>
                </svg>
                <span className="text-sm">私信</span>
              </button>
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
      <ToastWindow
        isOpen={isFFWindowOpen}
        onClose={() => {
          setIsFFWindowOpen(false);
          followingsQuery.refetch();
          followersQuery.refetch();
        }}
      >
        <UserFollower activeTab="following" userId={userId} />
      </ToastWindow>
    </div>
  );
}

// import { useAddRepositoryMutation, useAddMutation, useRepositoryInfoQuery } from "api/hooks/repositoryQueryHooks";
import { useGetUserInfoQuery } from "api/hooks/UserHooks";
import { useCallback, useState } from "react";
import { FollowButton } from "@/components/common/Follow/FollowButton";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";

export default function Author({ userId }: { userId?: number }) {
  // 获取全局用户ID
  const { userId: contextUserId } = useGlobalContext();

  // 弹窗状态
  const [isUserCardOpen, setIsUserCardOpen] = useState(false);

  // 获取用户信息
  const { data: userInfoData, isLoading: userInfoLoading } = useGetUserInfoQuery(userId || 0);

  // 使用API获取的数据或默认数据
  const userData = userInfoData?.data;
  const data = {
    name: userData?.username || "未知用户",
    avatar: userData?.avatar || "favicon.ico",
    description: userData?.description || "暂无简介",
  };

  // 处理头像点击
  const handleAvatarClick = useCallback(() => {
    if (userId) {
      setIsUserCardOpen(true);
    }
  }, [userId]);

  // 关闭弹窗
  const closeUserCard = useCallback(() => {
    setIsUserCardOpen(false);
  }, []);

  return (
    <div className="flex w-full min-w-0 items-center gap-3 rounded-xl bg-base-200 p-4">
      {userInfoLoading
        ? (
            <div className="skeleton h-14 w-14 shrink-0 rounded-full"></div>
          )
        : (
            <img
              className="h-14 w-14 shrink-0 rounded-full object-cover transition-opacity hover:opacity-80 cursor-pointer"
              src={data.avatar}
              onClick={handleAvatarClick}
              alt="用户头像"
            />
          )}

      <div className="min-w-0 flex-1">
        {userInfoLoading
          ? (
              <>
                <div className="skeleton mb-2 h-6 w-24"></div>
                <div className="skeleton h-4 w-32"></div>
              </>
            )
          : (
              <>
                <h3 className="text-lg font-semibold truncate whitespace-nowrap">{data.name}</h3>
                <p className="text-sm text-base-content/80 line-clamp-2 break-words">{data.description}</p>
              </>
            )}
      </div>
      {/* 关注按钮紧跟在用户信息右侧 */}
      {userId && userId !== contextUserId && (
        <div className="shrink-0">
          <FollowButton userId={userId} size="btn-sm" width="w-20" />
        </div>
      )}

      {/* UserDetail 弹窗 */}
      {userId && (
        <ToastWindow isOpen={isUserCardOpen} onClose={closeUserCard}>
          <UserDetail userId={userId} />
        </ToastWindow>
      )}
    </div>
  );
}

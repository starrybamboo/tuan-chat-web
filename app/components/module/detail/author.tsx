import { FollowButton } from "@/components/common/Follow/FollowButton";
import { PopWindow } from "@/components/common/popWindow";
import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
// import { useAddModuleMutation, useAddMutation, useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useCallback, useState } from "react";

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
    <div className="flex items-center justify-center gap-4 bg-base-200 rounded-xl w-full md:w-fit min-w-fit p-4">
      {userInfoLoading
        ? (
            <div className="skeleton w-16 h-16 rounded-full flex-shrink-0"></div>
          )
        : (
            <img
              className="w-16 h-16 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              src={data.avatar}
              onClick={handleAvatarClick}
              alt="用户头像"
            />
          )}

      <div className="flex flex-col justify-between min-w-0 flex-1">
        {userInfoLoading
          ? (
              <>
                <div className="skeleton h-6 w-24 mb-2"></div>
                <div className="skeleton h-4 w-32"></div>
              </>
            )
          : (
              <>
                <h3 className="card-title text-lg whitespace-nowrap">{data.name}</h3>
                <p className="text-sm text-base-content/80 whitespace-nowrap overflow-hidden text-ellipsis">{data.description}</p>
              </>
            )}
      </div>
      {/* 关注按钮紧跟在用户信息右侧 */}
      {userId && userId !== contextUserId && (
        <div className="flex-shrink-0">
          <FollowButton userId={userId} size="btn-lg" width="w-28" />
        </div>
      )}

      {/* UserDetail 弹窗 */}
      {userId && (
        <PopWindow isOpen={isUserCardOpen} onClose={closeUserCard}>
          <UserDetail userId={userId} />
        </PopWindow>
      )}
    </div>
  );
}

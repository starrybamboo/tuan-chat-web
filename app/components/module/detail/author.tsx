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
    <>
      {userInfoLoading
        ? (
            <div className="skeleton w-16 h-16 rounded-full"></div>
          )
        : (
            <img
              className="w-16 h-16 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              src={data.avatar}
              onClick={handleAvatarClick}
              alt="用户头像"
            />
          )}
      <div className="flex flex-col justify-between">
        {userInfoLoading
          ? (
              <>
                <div className="skeleton h-6 w-24 mb-2"></div>
                <div className="skeleton h-4 w-32"></div>
              </>
            )
          : (
              <>
                <h3 className="card-title text-lg">{data.name}</h3>
                <p className="text-sm text-base-content/80">{data.description}</p>
              </>
            )}
      </div>
      <div className="divider md:divider-horizontal m-0" />
      {/* 只有userId不等于当前context中的ID时才渲染FollowButton */}
      {userId && userId !== contextUserId && <FollowButton userId={userId} />}

      {/* UserDetail 弹窗 */}
      {userId && (
        <PopWindow isOpen={isUserCardOpen} onClose={closeUserCard}>
          <UserDetail userId={userId} />
        </PopWindow>
      )}
    </>
  );
}

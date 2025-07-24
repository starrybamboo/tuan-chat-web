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
  // const addModuleMutation = useAddModuleMutation();
  // const addEntityMutation = useAddMutation();
  // const navigate = useNavigate();

  // const clone = async () => {
  //   try {
  //     // 1. 创建模组，修正所有 number/null 字段类型
  //     const createParams = {
  //       ...moduleData,
  //       authorName: moduleData.authorName ?? undefined,
  //       minTime: moduleData.minTime ?? undefined,
  //       maxTime: moduleData.maxTime ?? undefined,
  //       minPeople: moduleData.minPeople ?? undefined,
  //       maxPeople: moduleData.maxPeople ?? undefined,
  //     };
  //     const addRes = await addModuleMutation.mutateAsync(createParams);
  //     const stageId = addRes.data?.stageId;
  //     if (!stageId)
  //       return;

  //     // 2. 获取模组信息
  //     const infoRes = await useModuleInfoQuery(moduleData.id).refetch();
  //     const entities = infoRes.data?.data?.entities?.map((e) => {
  //       const { ModuleMap, ...rest } = e;
  //       return rest;
  //     }) || [];

  //     // 3. 添加实体到新 stage
  //     for (const entity of entities) {
  //       await addEntityMutation.mutateAsync({ ...entity, stageId });
  //     }

  //     // 4. 跳转到工作区并传递 stageId
  //     navigate("/create", { state: { stageId } });
  //   }
  //   catch (err) {
  //   // 错误处理
  //     console.error("克隆失败", err);
  //   }
  // };

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
      <div className="card bg-base-200 w-full mb-8">
        <div className="card-body p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
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
              <div className="flex gap-4 items-center justify-end flex-1">
                <button type="button" className="btn btn-outline  btn-ghost rounded-md">
                  Branch
                </button>
                <button type="button" className="btn btn-outline btn-ghost rounded-md">
                  Clone
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* UserDetail 弹窗 */}
      {userId && (
        <PopWindow isOpen={isUserCardOpen} onClose={closeUserCard}>
          <UserDetail userId={userId} />
        </PopWindow>
      )}
    </>
  );
}

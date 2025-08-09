import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import { RoleDetail } from "@/components/common/roleDetail";
import React from "react";
import { useGetRoleAvatarQuery, useGetRoleQuery } from "../../../../api/queryHooks";

interface UserRoleCardProps {
  roleId: number;
}
/**
 * 用户创建的角色的小卡片
 * 根据角色ID获取的角色，然后按照下面的格式，在UserRolesList排序
 */
export function UserRoleCard({ roleId }: UserRoleCardProps) {
  // 获取角色基本信息
  const {
    data: roleData,
    isLoading: isRoleLoading,
    isError: isRoleError,
  } = useGetRoleQuery(roleId);
    // 获取角色头像

  const {
    data: avatarData,
    isLoading: isAvatarLoading,
  } = useGetRoleAvatarQuery(roleData?.data?.avatarId || 0);

  const [isRoleParamsPopOpen, setIsRoleParamsPopOpen] = useSearchParamsState<boolean>(`rolePop${avatarData?.data?.avatarId}`, false);

  const role = roleData?.data;
  const isLoading = isRoleLoading || isAvatarLoading;
  const isError = isRoleError;

  if (isLoading) {
    return (
      <div className="w-48 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="relative grid grid-rows-[80%,20%] h-60">
          <div className="row-start-1 row-end-2 bg-gray-200 animate-pulse" />
          <div className="row-start-2 row-end-3 p-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-48 bg-white rounded-lg shadow-md overflow-hidden border border-red-200">
        <div className="relative grid grid-rows-[80%,20%] h-60">
          <div className="row-start-1 row-end-2 bg-red-50 flex items-center justify-center">
            <span className="text-red-500 text-sm">加载失败</span>
          </div>
          <div className="row-start-2 row-end-3 p-2 text-sm text-red-500">
            角色ID:
            {" "}
            {roleId}
          </div>
        </div>
      </div>
    );
  }

  // 获取头像URL，优先使用查询结果，没有则使用角色数据中的avatar
  const avatarUrl = avatarData?.data?.avatarUrl || "/favicon.ico";

  return (
    <div className="cursor-pointer">
      <div
        className="w-48 bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
        onClick={() => setIsRoleParamsPopOpen(true)}
      >
        <div className="relative h-65">
          {/* 头像区 */}
          <div className="row-start-1 row-end-1 relative">
            <figure className="w-full h-full">
              <img
                src={avatarUrl}
                alt={role?.roleName || "角色头像"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/favicon.ico";
                }}
              />
            </figure>
          </div>

          {/* 描述区 */}
          <div className="row-start-2 row-end-3">
            {/* 名字标签 */}
            <div className="absolute left-2 right-2">
              <h3 className="text-gray-900 font-bold py-1 text-sm truncate">
                {role?.roleName || `角色 ${roleId}`}
              </h3>
              <p className="text-sm text-gray-700 line-clamp-1">
                {role?.description || "暂无描述"}
              </p>
            </div>
          </div>
        </div>
      </div>
      {
        (isRoleParamsPopOpen) && (
          <PopWindow
            isOpen={isRoleParamsPopOpen}
            onClose={() => setIsRoleParamsPopOpen(false)}
          >
            <div className="items-center justify-center gap-y-4 flex flex-col w-full overflow-auto">
              <RoleDetail roleId={avatarData?.data?.roleId ?? -1}></RoleDetail>
            </div>
          </PopWindow>
        )
      }
    </div>
  );
}

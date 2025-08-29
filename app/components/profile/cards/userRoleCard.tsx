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
      <div className="card bg-base-100 shadow-md animate-pulse w-full h-full">
        <div className="aspect-square bg-base-300 rounded-t-2xl"></div>
        <div className="card-body p-4 space-y-2 flex-grow">
          <div className="bg-base-300 h-4 rounded-full w-4/5"></div>
          <div className="bg-base-300 h-3 rounded-full w-full"></div>
          <div className="bg-base-300 h-3 rounded-full w-3/4"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card bg-base-100 shadow-md w-full h-full border border-error/20">
        <div className="aspect-square bg-error/5 rounded-t-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.19 2.5 1.732 2.5z" />
            </svg>
            <span className="text-error text-sm">加载失败</span>
          </div>
        </div>
        <div className="card-body p-4 space-y-2 flex-grow">
          <p className="text-sm text-error">
            角色ID:
            {roleId}
          </p>
        </div>
      </div>
    );
  }

  // 获取头像URL，优先使用查询结果，没有则使用角色数据中的avatar
  const avatarUrl = avatarData?.data?.avatarUrl || "/favicon.ico";

  return (
    <div className="cursor-pointer w-full">
      <div
        className="card bg-base-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 w-full h-full"
        onClick={() => setIsRoleParamsPopOpen(true)}
      >
        {/* 头像区 */}
        <figure className="aspect-square overflow-hidden bg-base-200">
          <img
            src={avatarUrl}
            alt={role?.roleName || "角色头像"}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/favicon.ico";
            }}
          />
        </figure>

        {/* 描述区 */}
        <div className="card-body p-4 space-y-2 flex-grow">
          <h3 className="text-base-content font-bold text-sm truncate leading-tight">
            {role?.roleName || `角色 ${roleId}`}
          </h3>
          <p className="text-base-content/70 text-xs line-clamp-2 leading-relaxed">
            {role?.description || "暂无描述"}
          </p>
        </div>
      </div>

      {/* 弹窗 */}
      {isRoleParamsPopOpen && (
        <PopWindow
          isOpen={isRoleParamsPopOpen}
          onClose={() => setIsRoleParamsPopOpen(false)}
        >
          <div className="items-center justify-center gap-y-4 flex flex-col w-full overflow-auto">
            <RoleDetail roleId={avatarData?.data?.roleId ?? -1} />
          </div>
        </PopWindow>
      )}
    </div>
  );
}

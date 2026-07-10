import React, { useState } from "react";

import { RoleAvatarByRole } from "@/components/common/roleAccess";
import { RoleDetail } from "@/components/common/roleDetail";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

import type { UserRole } from "../../../../api";

type UserRoleCardProps = {
  role: UserRole;
}

/**
 * 作品 - 角色 中渲染出的每一个角色，都是采用这个文件的格式渲染的
 */
const UserRoleCard: React.FC<UserRoleCardProps> = ({ role }) => {
  const [isRoleParamsPopOpen, setIsRoleParamsPopOpen] = useState(false);

  return (
    <div className="cursor-pointer w-full">
      <button
        type="button"
        className="
          card bg-base-100 shadow-md
          hover:shadow-xl hover:-translate-y-1
          transition-all duration-200 w-full h-full
        "
        onClick={() => setIsRoleParamsPopOpen(true)}
        title="查看角色详情"
      >
        {/* 头像区 */}
        <figure className="aspect-square overflow-hidden bg-base-200">
          <RoleAvatarByRole
            role={role}
            width="full"
            isRounded={false}
            stopToastWindow={true}
            alt={role?.roleName || "角色头像"}
            imageLoading="lazy"
          />
        </figure>

        {/* 描述区 */}
        <div className="card-body p-4 space-y-2 flex-grow">
          <h3
            className="
            text-base-content font-bold text-sm truncate leading-tight
          "
            title={role.roleName || `角色 ${role.roleId}`}
          >
            {role.roleName || `角色 ${role.roleId}`}
          </h3>
          <p
            className="
            text-base-content/70 text-xs line-clamp-2 leading-relaxed
          "
            title={role.description || "暂无描述"}
          >
            {role.description || "暂无描述"}
          </p>
        </div>
      </button>

      {/* 弹窗 */}
      {isRoleParamsPopOpen && (
        <ToastWindow
          isOpen={isRoleParamsPopOpen}
          onClose={() => setIsRoleParamsPopOpen(false)}
        >
          <div className="
            items-center justify-center gap-y-4 flex flex-col w-full
            overflow-auto
          ">
            <RoleDetail
              roleId={role.roleId}
              onClose={() => setIsRoleParamsPopOpen(false)}
            />
          </div>
        </ToastWindow>
      )}
    </div>
  );
};

export default UserRoleCard;

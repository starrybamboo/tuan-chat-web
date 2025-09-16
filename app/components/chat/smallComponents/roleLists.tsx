import RoleAvatarComponent from "@/components/common/roleAvatar";
import React from "react";

export default function RoleList({ roles, className }: { roles: UserRole[]; className?: string }) {
  return (
    <>
      {roles.map(role => (
        <div
          key={role.roleId}
          className={`flex flex-row gap-3 p-3 bg-base-200 rounded-lg items-center ${className}`}
        >
          {/* role列表 */}
          <RoleAvatarComponent
            avatarId={role.avatarId ?? -1}
            roleId={role.roleId}
            width={10}
            isRounded={true}
            withTitle={false}
          />
          <div className="flex flex-col items-center gap-2">
            <span>{role.roleName}</span>
          </div>
        </div>
      ))}
    </>
  );
}

import type { UserRole } from "../../../../../api";

import RoleAvatarComponent from "@/components/common/roleAvatar";

export default function RoleList({
  roles,
  className,
  isNpcRole = false,
}: {
  roles: UserRole[];
  className?: string;
  isNpcRole?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {roles.map(role => (
        <div
          key={role.roleId}
          className={`flex gap-3 p-3 bg-base-200 rounded-lg items-center ${className}`}
        >
          <div className="flex flex-row gap-3 items-center">
            <RoleAvatarComponent
              avatarId={role.avatarId ?? -1}
              roleId={role.roleId}
              width={10}
              isRounded={true}
              withTitle={false}
              allowKickOut={!isNpcRole}
            />
          </div>
          <span>{role.roleName}</span>
        </div>
      ))}
    </div>
  );
}

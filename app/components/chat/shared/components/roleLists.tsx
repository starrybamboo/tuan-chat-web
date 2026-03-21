import type { UserRole } from "../../../../../api";

import { RoleAvatarByRole } from "@/components/common/roleAccess";

export default function RoleList({
  roles,
  className,
  isNpcRole = false,
  allowKickOut,
  kickOutByManagerOnly = false,
}: {
  roles: UserRole[];
  className?: string;
  isNpcRole?: boolean;
  allowKickOut?: boolean;
  kickOutByManagerOnly?: boolean;
}) {
  const resolvedAllowKickOut = typeof allowKickOut === "boolean" ? allowKickOut : !isNpcRole;

  return (
    <div className="flex flex-col gap-2">
      {roles.map(role => (
        <div
          key={role.roleId}
          className={`flex gap-3 p-3 bg-base-200 rounded-lg items-center ${className}`}
        >
          <div className="flex flex-row gap-3 items-center">
            <RoleAvatarByRole
              role={role}
              width={10}
              isRounded={true}
              withTitle={false}
              allowKickOut={resolvedAllowKickOut}
              kickOutByManagerOnly={kickOutByManagerOnly}
            />
          </div>
          <span>{role.roleName}</span>
        </div>
      ))}
    </div>
  );
}

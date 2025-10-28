import { SpaceContext } from "@/components/chat/spaceContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import React, { use, useMemo } from "react";
import { useGetSpaceModuleRoleQuery } from "../../../../api/hooks/spaceModuleHooks";

export function AddModuleRoleWindow({
  handleAddRole,
}: {
  handleAddRole: (roleId: number) => void;
}) {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  const spaceModuleRolesQuery = useGetSpaceModuleRoleQuery(spaceId);
  const spaceModuleRoles = useMemo(
    () => spaceModuleRolesQuery.data?.data ?? [],
    [spaceModuleRolesQuery.data?.data],
  );

  return (
    <div className="justify-center w-full">
      <p className="text-lg font-bold text-center w-full mb-4">
        导入模组角色
      </p>
      <div className="bg-base-100 rounded-box p-6">
        {
          spaceModuleRoles.length === 0 && (
            <div className="text-center font-bold py-5">无模组角色可导入</div>
          )
        }
        <div className="flex flex-wrap gap-3 justify-center">
          {spaceModuleRoles.map(role => (
            <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={role.roleId}>
              <div className="flex flex-col items-center p-3">
                <div onClick={() => handleAddRole(role.roleId)}>
                  <RoleAvatarComponent
                    avatarId={role.avatarId ?? -1}
                    roleId={role.roleId}
                    width={24}
                    isRounded={true}
                    withTitle={false}
                    stopPopWindow={true}
                  />
                </div>
                <p className="text-center block">{role.roleName}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

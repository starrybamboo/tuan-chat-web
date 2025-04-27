import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import React, { useMemo } from "react";
import { useGetUserRolesQuery } from "../../../../api/queryHooks";

export function AddRoleWindow({ handleAddRole }: { handleAddRole: (roleId: number) => void }) {
  // 获取用户的所有角色
  const userId = useGlobalContext().userId;
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);
  return (
    <div className="justify-center w-max">
      <p className="text-lg font-bold text-center w-full mb-4">选择要加入的角色</p>
      <div className="grid grid-cols-5 gap-2 justify-items-stretch">
        {userRoles.map(role => (
          <div className="" key={role.avatarId}>
            <div className="flex flex-col items-center">
              <div onClick={() => handleAddRole(role.roleId ?? -1)} className="">
                <RoleAvatarComponent
                  avatarId={role.avatarId ?? -1}
                  width={24}
                  isRounded={false}
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
  );
}

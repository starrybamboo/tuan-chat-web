import { RoomContext } from "@/components/chat/roomContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import React, { use, useMemo } from "react";
import { useGetUserRolesQuery } from "../../../../api/queryHooks";

export function AddRoleWindow({ handleAddRole }: { handleAddRole: (roleId: number) => void }) {
  const roomContext = use(RoomContext);
  const roomRolesThatUserOwn = roomContext.roomRolesThatUserOwn; // 用户已加进去的角色
  // 获取用户的所有角色
  const userId = useGlobalContext().userId;
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);
  return (
    <div className="justify-center w-full">
      <p className="text-lg font-bold text-center w-full mb-4">选择要加入的角色</p>
      <div className="flex flex-wrap gap-3">
        {userRoles
          .filter(role => role.avatarId && role.avatarId > 0)
          .filter(role => !roomRolesThatUserOwn.find(r => r.roleId === role.roleId))
          .map(role => (
            <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={role.avatarId}>
              <div className="flex flex-col items-center p-3">
                <div onClick={() => handleAddRole(role.roleId ?? -1)} className="">
                  <RoleAvatarComponent
                    avatarId={role.avatarId ?? -1}
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
  );
}

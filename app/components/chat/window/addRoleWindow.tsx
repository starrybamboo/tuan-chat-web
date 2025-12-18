import { RoomContext } from "@/components/chat/roomContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { AddRingLight } from "@/icons";
import React, { use, useMemo } from "react";
import { useNavigate } from "react-router";
import { useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetUserRolesQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

export function AddRoleWindow({
  handleAddRole,
}: {
  handleAddRole: (roleId: number) => void;
}) {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId;

  const roomRolesQuery = useGetRoomRoleQuery(roomId ?? -1);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);

  const userId = useGlobalContext().userId;
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);

  const navigate = useNavigate();

  const availableRoles = useMemo(() => {
    return userRoles.filter(role => !roomRoles.some(r => r.roleId === role.roleId));
  }, [roomRoles, userRoles]);

  return (
    <div className="justify-center w-full">
      <p className="text-lg font-bold text-center w-full mb-4">
        导入我的角色
      </p>
      <div className="bg-base-100 rounded-box p-6">
        {
          availableRoles.length === 0 && (
            <div className="text-center font-bold py-5">你已经没有角色可以导入了哦</div>
          )
        }
        <div className="flex flex-wrap gap-3 justify-center">
          {availableRoles.map(role => (
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
          <div
            className="card shadow hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/role")}
          >
            <div className="flex flex-col items-center p-3">
              <AddRingLight className="size-24 jump_icon" />
              <p className="text-center block">创建角色</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

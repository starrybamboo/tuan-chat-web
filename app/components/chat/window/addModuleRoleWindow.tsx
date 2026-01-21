import { useGetRoomRoleQuery } from "api/hooks/chatQueryHooks";
import React, { use, useMemo } from "react";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGetSpaceModuleRoleQuery } from "../../../../api/hooks/spaceModuleHooks";
import { RoomContext } from "../core/roomContext";

export function AddModuleRoleWindow({
  handleAddRole,
}: {
  handleAddRole: (roleId: number) => void;
}) {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId;

  const spaceModuleRolesQuery = useGetSpaceModuleRoleQuery(spaceId);
  const roomRolesQuery = useGetRoomRoleQuery(roomId ?? -1);

  const filteredModuleRoles = useMemo(() => {
    const spaceModuleRoles = spaceModuleRolesQuery.data?.data ?? [];
    const roomRoles = roomRolesQuery.data?.data ?? [];
    const roomRoleIds = new Set(roomRoles.map(role => role.roleId));
    return spaceModuleRoles.filter(role => !roomRoleIds.has(role.roleId));
  }, [spaceModuleRolesQuery.data?.data, roomRolesQuery.data?.data]);

  return (
    <div className="justify-center w-full">
      <p className="text-lg font-bold text-center w-full mb-4">
        导入模组角色
      </p>
      <div className="bg-base-100 rounded-box p-6">
        {
          filteredModuleRoles.length === 0 && (
            <div className="text-center font-bold py-5">无模组角色可导入</div>
          )
        }
        <div className="flex flex-wrap gap-3 justify-center">
          {filteredModuleRoles.map(role => (
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

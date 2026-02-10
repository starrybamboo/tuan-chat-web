import React, { use, useMemo, useState } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { AddRingLight } from "@/icons";
import { useGetRoomNpcRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetSpaceRepositoryRoleQuery } from "../../../../api/hooks/spaceRepositoryHooks";
import CreateNpcRoleWindow from "./createNpcRoleWindow";

export function AddNpcRoleWindow({
  handleAddRole,
}: {
  handleAddRole: (roleId: number) => void;
}) {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;

  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  const roomNpcRolesQuery = useGetRoomNpcRoleQuery(roomId);
  const roomNpcRoles = useMemo(() => roomNpcRolesQuery.data?.data ?? [], [roomNpcRolesQuery.data?.data]);

  const spaceRolesQuery = useGetSpaceRepositoryRoleQuery(spaceId);
  const spaceRoles = useMemo(() => spaceRolesQuery.data?.data ?? [], [spaceRolesQuery.data?.data]);

  const roleIdInRoomSet = useMemo(() => {
    return new Set<number>(roomNpcRoles.map(r => r.roleId));
  }, [roomNpcRoles]);

  const availableSpaceRoles = useMemo(() => {
    return spaceRoles.filter(r => !roleIdInRoomSet.has(r.roleId));
  }, [roleIdInRoomSet, spaceRoles]);

  const [isCreatingNpc, setIsCreatingNpc] = useState(false);

  if (isCreatingNpc) {
    return <CreateNpcRoleWindow onClose={() => setIsCreatingNpc(false)} />;
  }

  return (
    <div className="justify-center w-full">
      <p className="text-lg font-bold text-center w-full mb-4">
        导入NPC
      </p>

      <div className="bg-base-100 rounded-box p-6">
        {availableSpaceRoles.length === 0 && (
          <div className="text-center font-bold py-5">暂无NPC可导入</div>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          {availableSpaceRoles.map(role => (
            <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={role.roleId}>
              <div className="flex flex-col items-center p-3">
                <div onClick={() => handleAddRole(role.roleId)}>
                  <RoleAvatarComponent
                    avatarId={role.avatarId ?? -1}
                    roleId={role.roleId}
                    width={24}
                    isRounded={true}
                    withTitle={false}
                    stopToastWindow={true}
                  />
                </div>
                <p className="text-center block">{role.roleName}</p>
              </div>
            </div>
          ))}
          <div
            className="card shadow hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setIsCreatingNpc(true)}
          >
            <div className="flex flex-col items-center p-3">
              <AddRingLight className="size-24 jump_icon" />
              <p className="text-center block">创建NPC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

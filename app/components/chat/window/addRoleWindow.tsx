import { RoomContext } from "@/components/chat/roomContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { AddRingLight } from "@/icons";
import { useGetRoomModuleRoleQuery } from "api/hooks/chatQueryHooks";
import { useGetSpaceModuleRoleQuery } from "api/hooks/spaceModuleHooks";
import React, { use, useMemo } from "react";
import { useNavigate } from "react-router";
import { useGetUserRolesQuery } from "../../../../api/queryHooks";

export function AddRoleWindow({
  handleAddRole,
  addModuleRole,
}: {
  handleAddRole: (roleId: number) => void;
  addModuleRole: boolean;
}) {
  const roomContext = use(RoomContext);
  const roomRolesThatUserOwn = roomContext.roomRolesThatUserOwn;
  const spaceId = roomContext.spaceId;
  const roomId = roomContext.roomId;

  const userId = useGlobalContext().userId;
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);

  const moduleRolesQuery = useGetSpaceModuleRoleQuery(spaceId ?? 0);
  const moduleRoles = useMemo(() => moduleRolesQuery.data?.data ?? [], [moduleRolesQuery.data?.data]);

  const getRoomModuleRole = useGetRoomModuleRoleQuery(roomId ?? 0);
  const roomModuleRole = getRoomModuleRole.data?.data ?? [];

  const navigate = useNavigate();

  const renderRoleCards = (
    roles: any[],
    ownedRoles: any[],
    getId: (role: any) => number,
    getAvatarId: (role: any) => number,
    getName: (role: any) => string,
    emptyText: string,
  ) => {
    const availableRoles = roles.filter(
      role => getId(role) > 0 && !ownedRoles.find(r => getId(r) === getId(role)),
    );

    if (availableRoles.length === 0) {
      return <div className="text-center font-bold">{emptyText}</div>;
    }

    return (
      <div className="flex flex-wrap gap-3 justify-center">
        {availableRoles.map(role => (
          <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={getId(role)}>
            <div className="flex flex-col items-center p-3">
              <div onClick={() => handleAddRole(getId(role))}>
                <RoleAvatarComponent
                  avatarId={getAvatarId(role)}
                  width={24}
                  isRounded={true}
                  withTitle={false}
                  stopPopWindow={true}
                />
              </div>
              <p className="text-center block">{getName(role)}</p>
            </div>
          </div>
        ))}
        {!addModuleRole
          && (
            <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/role")}>
              <div className="flex flex-col items-center p-3">
                <AddRingLight className="size-24 jump_icon" />
                <p className="text-center block">创建角色</p>
              </div>
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="justify-center w-full">
      <p className="text-lg font-bold text-center w-full mb-4">
        {addModuleRole ? "导入模组角色" : "导入我的角色"}
      </p>
      <div className="bg-base-100 rounded-box p-6">
        {addModuleRole
          ? renderRoleCards(
              moduleRoles,
              roomModuleRole,
              role => role.id ?? -1,
              role => role.entityInfo?.avatarIds ?? -1,
              role => role.name,
              "当前房间已经没有模组角色了哦",
            )
          : renderRoleCards(
              userRoles,
              roomRolesThatUserOwn,
              role => role.roleId ?? -1,
              role => role.avatarId ?? -1,
              role => role.roleName,
              "你已经没有角色可以导入了哦",
            )}
      </div>
    </div>
  );
}

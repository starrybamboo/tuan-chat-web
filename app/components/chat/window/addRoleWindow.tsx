import React, { use, useMemo, useState } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { AddRingLight } from "@/icons";
import { useAddRoomRoleMutation, useGetRoomModuleRoleQuery, useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetUserRolesQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import { useGetSpaceModuleRoleQuery } from "../../../../api/hooks/spaceModuleHooks";
import CreateNpcRoleWindow from "./createNpcRoleWindow";

export function AddRoleWindow({
  handleAddRole,
}: {
  handleAddRole: (roleId: number) => void;
}) {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId;

  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  const roomRolesQuery = useGetRoomRoleQuery(roomId ?? -1);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);

  const roomNpcRolesQuery = useGetRoomModuleRoleQuery(roomId ?? -1);
  const roomNpcRoles = useMemo(() => roomNpcRolesQuery.data?.data ?? [], [roomNpcRolesQuery.data?.data]);

  const spaceRolesQuery = useGetSpaceModuleRoleQuery(spaceId);
  const spaceRoles = useMemo(() => spaceRolesQuery.data?.data ?? [], [spaceRolesQuery.data?.data]);

  const roleIdInRoomSet = useMemo(() => {
    return new Set<number>([...roomRoles, ...roomNpcRoles].map(r => r.roleId));
  }, [roomNpcRoles, roomRoles]);

  // Filter space roles that are already in the room?
  // roomRoles contains roleId.
  // We should maybe filter out space roles that are already in the roomRoles list?
  // Common behavior for import windows.
  // roomRoles might be players or NPCs.
  const availableSpaceRoles = useMemo(() => {
    return spaceRoles.filter(r => !roleIdInRoomSet.has(r.roleId));
  }, [roleIdInRoomSet, spaceRoles]);

  const userId = useGlobalContext().userId;
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);
  
  const addRoomRoleMutation = useAddRoomRoleMutation();

  const [isCreatingNpc, setIsCreatingNpc] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "space">("my");

  const availableRoles = useMemo(() => {
    return userRoles.filter(role => role.type !== 2 && !roleIdInRoomSet.has(role.roleId));
  }, [roleIdInRoomSet, userRoles]);

  if (isCreatingNpc) {
    return <CreateNpcRoleWindow onClose={() => setIsCreatingNpc(false)} />;
  }
  
  const handleImportSpaceRole = (roleId: number) => {
    addRoomRoleMutation.mutate({ roomId: roomId ?? -1, roleIdList: [roleId], type: 1 });
  };

  return (
    <div className="justify-center w-full">
      <p className="text-lg font-bold text-center w-full mb-4">
        导入角色
      </p>
      
      <div role="tablist" className="tabs tabs-boxed mb-4 mx-auto w-fit">
        <a 
            role="tab" 
            className={`tab ${activeTab === "my" ? "tab-active" : ""}`} 
            onClick={() => setActiveTab("my")}
        >
            我的角色
        </a>
        <a 
            role="tab" 
            className={`tab ${activeTab === "space" ? "tab-active" : ""}`} 
            onClick={() => setActiveTab("space")}
        >
            空间角色
        </a>
      </div>

      <div className="bg-base-100 rounded-box p-6">
        {activeTab === "my" ? (
          <>
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
                onClick={() => setIsCreatingNpc(true)}
              >
                <div className="flex flex-col items-center p-3">
                  <AddRingLight className="size-24 jump_icon" />
                  <p className="text-center block">创建NPC</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
             {availableSpaceRoles.length === 0 && (
                <div className="text-center font-bold py-5">暂无空间角色可导入</div>
             )}
             <div className="flex flex-wrap gap-3 justify-center">
                {availableSpaceRoles.map(role => (
                   <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={role.roleId}>
                      <div className="flex flex-col items-center p-3">
                        <div onClick={() => handleImportSpaceRole(role.roleId)}>
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
          </>
        )}
      </div>
    </div>
  );
}

import { RoomContext } from "@/components/chat/roomContext";
import RoleList from "@/components/chat/smallComponents/roleLists";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { getScreenSize } from "@/utils/getScreenSize";
import React, { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useAddModuleRoleMutation,
  useAddRoomRoleMutation,
  useGetRoomModuleRoleQuery,
  useGetRoomRoleQuery,
} from "../../../../api/hooks/chatQueryHooks";

export default function RoomRoleList() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const curMember = roomContext.curMember;

  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);

  const moduleRolesQuery = useGetRoomModuleRoleQuery(roomId);
  const moduleRoles = useMemo(() => moduleRolesQuery.data?.data ?? [], [moduleRolesQuery.data?.data]);

  const [isRoleHandleOpen, setIsRoleHandleOpen] = useState<boolean>(false);
  const [isModuleRoleHandleOpen, setIsModuleRoleHandleOpen] = useState<boolean>(false);

  const addRoleMutation = useAddRoomRoleMutation();
  const addModuleRoleMutation = useAddModuleRoleMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate(
      { roomId, roleIdList: [roleId] },
      {
        onSettled: () => {
          toast("添加角色成功");
        },
      },
    );
  };

  const handleAddModuleRole = async (roleId: number) => {
    addModuleRoleMutation.mutate(
      { roomId, ids: [roleId] },
      {
        onSettled: () => {
          toast("添加NPC成功");
        },
      },
    );
  };

  const listWidth = getScreenSize() === "sm" ? "w-full" : "w-60";

  return (
    <div className="space-y-2 p-2 overflow-auto items-center flex flex-col">
      {/* 房间角色列表 */}
      <div className="flex flex-row justify-center items-center gap-2 min-w-60">
        <p className="text-center">
          角色列表-
          <span className="text-sm">{roomRoles.length}</span>
        </p>
        {(curMember?.memberType === 1 || curMember?.memberType === 2) && (
          <button
            type="button"
            className="btn btn-dash btn-info"
            onClick={() => setIsRoleHandleOpen(true)}
          >
            添加角色
          </button>
        )}
      </div>
      <RoleList roles={roomRoles} className={listWidth} />

      {/* 模组角色列表 */}
      <div className="flex flex-row justify-center items-center gap-2 min-w-60">
        <p className="text-center">
          NPC列表-
          <span className="text-sm">{moduleRoles.length}</span>
        </p>
        {curMember?.memberType === 1 && (
          <button
            type="button"
            className="btn btn-dash btn-info"
            onClick={() => setIsModuleRoleHandleOpen(true)}
          >
            添加NPC
          </button>
        )}
      </div>
      {moduleRoles.map(role => (
        <div
          key={role.id}
          className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg w-60 items-center "
        >
          {/* role列表 */}
          <RoleAvatarComponent
            avatarId={role.entityInfo?.avatarIds}
            width={10}
            isRounded={true}
            withTitle={false}
          />
          <div className="flex flex-col items-center gap-2">
            <span>{role.name}</span>
          </div>
        </div>
      ))}

      {/* 弹窗 */}
      <PopWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleHandleOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddRole} addModuleRole={false} />
      </PopWindow>
      <PopWindow isOpen={isModuleRoleHandleOpen} onClose={() => setIsModuleRoleHandleOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddModuleRole} addModuleRole={true} />
      </PopWindow>
    </div>
  );
}

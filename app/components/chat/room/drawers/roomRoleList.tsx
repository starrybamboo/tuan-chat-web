import { RoomContext } from "@/components/chat/core/roomContext";
import RoleList from "@/components/chat/shared/components/roleLists";
import { AddModuleRoleWindow } from "@/components/chat/window/addModuleRoleWindow";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import { PopWindow } from "@/components/common/popWindow";
import { getScreenSize } from "@/utils/getScreenSize";
import React, { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useAddRoomRoleMutation,
  useGetRoomModuleRoleQuery,
  useGetRoomRoleQuery,
} from "../../../../../api/hooks/chatQueryHooks";

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
    addRoleMutation.mutate(
      { roomId, roleIdList: [roleId] },
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
          <span className="text-sm">{roomRoles.length + moduleRoles.length}</span>
        </p>
      </div>
      <div className="flex flex-row gap-4">
        {(curMember?.memberType === 1 || curMember?.memberType === 2) && (
          <button
            type="button"
            className="btn btn-dash btn-info"
            onClick={() => setIsRoleHandleOpen(true)}
          >
            添加角色
          </button>
        )}
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
      <RoleList roles={roomRoles} className={listWidth} />
      <RoleList roles={moduleRoles} className={listWidth} isModuleRole={true} />

      {/* 弹窗 */}
      <PopWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleHandleOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddRole} />
      </PopWindow>
      <PopWindow isOpen={isModuleRoleHandleOpen} onClose={() => setIsModuleRoleHandleOpen(false)}>
        <AddModuleRoleWindow handleAddRole={handleAddModuleRole} />
      </PopWindow>
    </div>
  );
}

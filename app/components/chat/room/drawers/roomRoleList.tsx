import { AddressBookIcon } from "@phosphor-icons/react";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import RoleList from "@/components/chat/shared/components/roleLists";
import { AddModuleRoleWindow } from "@/components/chat/window/addModuleRoleWindow";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import { PopWindow } from "@/components/common/popWindow";
import { getScreenSize } from "@/utils/getScreenSize";
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
    <div className="h-full min-h-0 p-2 flex flex-col items-center">
      <div className="flex flex-row justify-between items-center gap-2 min-w-60 mt-2">
        <div className="flex items-center gap-2">
          <AddressBookIcon className="size-5" />
          <p className="text-start font-semibold">
            角色列表-
            {roomRoles.length + moduleRoles.length}
          </p>
        </div>
        {(curMember?.memberType === 1 || curMember?.memberType === 2) && (
          <button
            type="button"
            className="btn btn-xs btn-dash btn-info"
            onClick={() => setIsRoleHandleOpen(true)}
          >
            角色+
          </button>
        )}
        {curMember?.memberType === 1 && (
          <button
            type="button"
            className="btn btn-xs btn-dash btn-info"
            onClick={() => setIsModuleRoleHandleOpen(true)}
          >
            NPC+
          </button>
        )}
      </div>
      <div className="divider w-full" />

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-visible w-full flex justify-center scrollbar-hide"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <RoleList roles={roomRoles} className={listWidth} />
        <RoleList roles={moduleRoles} className={listWidth} isModuleRole={true} />
      </div>

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

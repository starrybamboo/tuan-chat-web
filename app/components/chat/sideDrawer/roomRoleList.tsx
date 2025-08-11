import { RoomContext } from "@/components/chat/roomContext";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import React, { use, useMemo } from "react";
import toast from "react-hot-toast";
import { useAddRoomRoleMutation, useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";

export default function RoomRoleList() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  // 全局登录用户对应的member
  const curMember = roomContext.curMember;
  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);

  const [isRoleHandleOpen, setIsRoleHandleOpen] = useSearchParamsState<boolean>("roleSettingPop", false);
  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({
      roomId,
      roleIdList: [roleId],
    }, {
      onSettled: () => {
        // setIsRoleHandleOpen(false);
        toast("添加角色成功");
      },
    });
  };
  return (
    <div className="space-y-2 p-2 overflow-auto items-center flex flex-col ">
      <div className="flex flex-row justify-center items-center gap-2 min-w-60">
        <p className="text-center">
          角色列表-
          <span className="text-sm">{roomRoles.length}</span>
        </p>
        {(curMember?.memberType === 1 || curMember?.memberType === 2) && (
          <button
            className="btn btn-dash btn-info"
            type="button"
            onClick={() => setIsRoleHandleOpen(true)}
          >
            添加角色
          </button>
        )}
      </div>
      {roomRoles.map(role => (
        <div
          key={role.roleId}
          className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg w-60 items-center "
        >
          {/* role列表 */}
          <RoleAvatarComponent
            avatarId={role.avatarId ?? 0}
            width={10}
            isRounded={true}
            withTitle={false}
          />
          <div className="flex flex-col items-center gap-2">
            <span>{role.roleName}</span>
          </div>
        </div>
      ))}
      <PopWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleHandleOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddRole}></AddRoleWindow>
      </PopWindow>
    </div>
  )
  ;
}

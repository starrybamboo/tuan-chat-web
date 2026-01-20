import { AddressBookIcon, UsersIcon } from "@phosphor-icons/react";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import MemberLists from "@/components/chat/shared/components/memberLists";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import { getScreenSize } from "@/utils/getScreenSize";
import { useAddRoomMemberMutation, useAddRoomRoleMutation, useGetRoomModuleRoleQuery, useGetRoomRoleQuery } from "../../../../../api/hooks/chatQueryHooks";
import RoleList from "../../shared/components/roleLists";
import { AddModuleRoleWindow } from "../../window/addModuleRoleWindow";
import { AddRoleWindow } from "../../window/addRoleWindow";

export default function RoomUserList({ type}: { type: string }) {
  const isRole = type === "Role";

  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const members = roomContext.roomMembers;
  // 全局登录用户对应的member
  const curMember = roomContext.curMember;
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("memberSettingPop", false);

  const addMemberMutation = useAddRoomMemberMutation();

  async function handleAddMember(userId: number) {
    addMemberMutation.mutate({
      roomId,
      userIdList: [userId],
    }, {
      onSettled: () => {
        setIsMemberHandleOpen(false);
        toast("添加成员成功");
      },
    });
  }

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

  return (
    <div className="h-full min-h-0 p-2 flex flex-col items-center">
      <div className="flex flex-row justify-between items-center gap-2 min-w-60 mt-2">
        <div className="flex items-center gap-2">
          {isRole
            ? (
                <>
                  <AddressBookIcon className="size-5" />
                  <p className="text-start font-semibold">
                    角色列表-
                    {roomRoles.length + moduleRoles.length}
                  </p>
                </>
              )
            : (
                <>
                  <UsersIcon className="inline size-5" />
                  <p className="text-start font-semibold">
                    群成员-
                    {members.length}
                  </p>
                </>
              )}
        </div>

        <div className="flex gap-2">
          {!isRole && curMember?.memberType === 1 && (
            <button
              className="btn btn-dash btn-info"
              type="button"
              onClick={() => setIsMemberHandleOpen(true)}
            >
              添加成员
            </button>
          )}
          {isRole && (curMember?.memberType === 1 || curMember?.memberType === 2) && (
            <button
              type="button"
              className="btn btn-xs btn-dash btn-info"
              onClick={() => setIsRoleHandleOpen(true)}
            >
              角色+
            </button>
          )}
          {isRole && curMember?.memberType === 1 && (
            <button
              type="button"
              className="btn btn-xs btn-dash btn-info"
              onClick={() => setIsModuleRoleHandleOpen(true)}
            >
              NPC+
            </button>
          )}
        </div>
      </div>
      <div className="divider w-full" />

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-visible w-full flex justify-center "
      >
        {isRole
          ? (
              <>
                <RoleList roles={roomRoles} className={getScreenSize() === "sm" ? "w-full" : "w-56"} />
                <RoleList roles={moduleRoles} className={getScreenSize() === "sm" ? "w-full" : "w-56"} isModuleRole={true} />
              </>
            )
          : (
              <MemberLists
                members={members}
                className={getScreenSize() === "sm" ? "w-full" : "w-56"}
                isSpace={false}
              />
            )}
      </div>

      <PopWindow isOpen={isMemberHandleOpen} onClose={() => setIsMemberHandleOpen(false)}>
        <AddMemberWindow handleAddMember={handleAddMember} showSpace={true} />
      </PopWindow>
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

import InitiativeList from "@/components/chat/initiativeList";
import { MemberTypeTag } from "@/components/chat/memberTypeTag";
import { RoomContext } from "@/components/chat/roomContext";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import UserAvatarComponent from "@/components/common/userAvatar";
import React, { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAddRoomMemberMutation, useAddRoomRoleMutation, useGetRoomRoleQuery } from "../../../api/hooks/chatQueryHooks";

export default function RoomRightSidePanel() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const members = roomContext.roomMembers;
  // 全局登录用户对应的member
  const curMember = roomContext.curMember;
  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);

  const [isRoleHandleOpen, setIsRoleHandleOpen] = useState(false);
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useState(false);

  const addMemberMutation = useAddRoomMemberMutation();
  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({
      roomId,
      roleIdList: [roleId],
    }, {
      onSettled: () => {
        setIsRoleHandleOpen(false);
        toast("添加角色成功");
      },
    });
  };

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
  return (
    <div className="flex flex-row gap-4 h-full">
      <div
        className="flex flex-col gap-2 p-4 bg-base-100 rounded-box shadow-sm items-center w-full space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto"
      >
        {/* 先攻表 */}
        <div className="divider">先攻表</div>
        <InitiativeList></InitiativeList>
        <div className="divider">成员与角色</div>
        {/* 群成员列表 */}
        <div className="space-y-2">
          <div className="flex flex-row justify-center items-center gap-2">
            <p className="text-center">
              群成员-
              {members.length}
            </p>
            {
              curMember?.memberType === 1
              && (
                <button
                  className="btn btn-dash btn-info"
                  type="button"
                  onClick={() => setIsMemberHandleOpen(true)}
                >
                  添加成员
                </button>
              )
            }
          </div>
          {members.map(member => (
            <div
              key={member.userId}
              className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg w-60 items-center "
            >
              {/* 成员列表 */}
              <UserAvatarComponent userId={member.userId ?? 0} width={8} isRounded={true} withName={true}>
              </UserAvatarComponent>
              <div className="flex flex-col items-center gap-2 text-sm font-medium">
              </div>
              <MemberTypeTag memberType={member.memberType}></MemberTypeTag>
            </div>
          ))}
        </div>
        {/* 角色列表 */}
        <div className="space-y-2">
          <div className="flex flex-row justify-center items-center gap-2">
            <p className="text-center">
              角色列表-
              <span className="text-sm">{roomRoles.length}</span>
            </p>
            {
              (curMember?.memberType === 1 || curMember?.memberType === 2) && (
                <button
                  className="btn btn-dash btn-info"
                  type="button"
                  onClick={() => setIsRoleHandleOpen(true)}
                >
                  添加角色
                </button>
              )
            }
          </div>
          {roomRoles.map(role => (
            <div
              key={role.roleId}
              className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg w-60 items-center "
            >
              {/* role列表 */}
              <RoleAvatarComponent
                avatarId={role.avatarId ?? 0}
                width={8}
                isRounded={true}
                withTitle={false}
              />
              <div className="flex flex-col items-center gap-2 text-sm font-medium">
                <span>{role.roleName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <PopWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleHandleOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddRole}></AddRoleWindow>
      </PopWindow>
      <PopWindow isOpen={isMemberHandleOpen} onClose={() => setIsMemberHandleOpen(false)}>
        <AddMemberWindow handleAddMember={handleAddMember}></AddMemberWindow>
      </PopWindow>
    </div>
  );
}

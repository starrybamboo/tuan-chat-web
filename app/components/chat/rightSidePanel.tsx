import AddMemberWindow from "@/components/chat/addMemberWindow";
import { AddRoleWindow } from "@/components/chat/addRoleWindow";
import { GroupContext } from "@/components/chat/groupContext";
import { MemberTypeTag } from "@/components/chat/memberTypeTag";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import UserAvatarComponent from "@/components/common/userAvatar";
import React, { use, useMemo, useState } from "react";
import { useAddMemberMutation, useAddRoleMutation, useGetGroupRoleQuery } from "../../../api/queryHooks";

export default function RightSidePanel() {
  const groupContext = use(GroupContext);
  const groupId = groupContext.groupId ?? -1;
  const members = groupContext.groupMembers;
  // 全局登录用户对应的member
  const curMember = groupContext.curMember;
  const groupRolesQuery = useGetGroupRoleQuery(groupId);
  const groupRoles = useMemo(() => groupRolesQuery.data?.data ?? [], [groupRolesQuery.data?.data]);

  const [isRoleHandleOpen, setIsRoleHandleOpen] = useState(false);
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useState(false);

  const addMemberMutation = useAddMemberMutation();
  const addRoleMutation = useAddRoleMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({
      roomId: groupId,
      roleIdList: [roleId],
    }, {
      onSettled: () => {
        setIsRoleHandleOpen(false);
      },
    });
  };

  async function handleAddMember(userId: number) {
    addMemberMutation.mutate({
      roomId: groupId,
      userIdList: [userId],
    }, {
      onSettled: () => {
        setIsMemberHandleOpen(false);
      },
    });
  }
  return (
    <div className="flex flex-row gap-4 h-full">
      <div className="flex flex-col gap-2 p-4 bg-base-100 rounded-box shadow-sm items-center w-full space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
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
              <span className="text-sm">{groupRoles.length}</span>
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
          {groupRoles.map(role => (
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

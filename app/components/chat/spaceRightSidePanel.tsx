import { MemberTypeTag } from "@/components/chat/memberTypeTag";
import { SpaceContext } from "@/components/chat/spaceContext";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import UserAvatarComponent from "@/components/common/userAvatar";
import { Setting } from "@/icons";
import React, { use, useState } from "react";
import {
  useAddSpaceMemberMutation,
  useAddSpaceRoleMutation,
  useGetSpaceMembersQuery,
  useGetSpaceRolesQuery,
} from "../../../api/hooks/chatQueryHooks";
import SpaceSettingWindow from "./window/spaceSettingWindow";

export default function SpaceRightSidePanel() {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;
  const spaceMemberQuery = useGetSpaceMembersQuery(spaceId);
  const spaceMembers = spaceMemberQuery.data?.data ?? [];
  const spaceRolesQuery = useGetSpaceRolesQuery(spaceId);
  const spaceRoles = spaceRolesQuery.data?.data ?? [];

  const [isRoleHandleOpen, setIsRoleHandleOpen] = useState(false);
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useState(false);

  const addMemberMutation = useAddSpaceMemberMutation();
  const addRoleMutation = useAddSpaceRoleMutation();

  const [isOpenSpaceSettingWindow, setIsOpenSpaceSettingWindow] = useState(false);

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({
      spaceId,
      roleIdList: [roleId],
    }, {
      onSettled: () => {
        setIsRoleHandleOpen(false);
      },
    });
  };

  async function handleAddMember(userId: number) {
    addMemberMutation.mutate({
      spaceId,
      userIdList: [userId],
    }, {
      onSettled: () => {
        setIsMemberHandleOpen(false);
      },
    });
  }
  return (
    <div className="flex flex-row gap-4 h-full">
      <div className="flex flex-col gap-2 p-4 bg-base-100 rounded-box shadow-sm items-center w-full space-y-4 overflow-y-auto">
        {
          spaceContext.isSpaceOwner && (
            <div className="w-full flex justify-end">
              <Setting className="w-12 h-12 cursor-pointer hover:text-info" onClick={() => setIsOpenSpaceSettingWindow(true)}> </Setting>
            </div>
          )
        }

        {/* 群成员列表 */}
        <div className="space-y-2">
          <div className="flex flex-row justify-center items-center gap-2">
            <p className="text-center">
              空间成员-
              {spaceMembers.length}
            </p>
            {
              // TODO
              spaceMembers.length > 0
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
          {spaceMembers.map(member => (
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
        角色列表
        <div className="space-y-2">
          <div className="flex flex-row justify-center items-center gap-2">
            <p className="text-center">
              角色列表-
              <span className="text-sm">{spaceRoles.length}</span>
            </p>
            {
              (1) && (
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
          {spaceRoles.map(role => (
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
      <PopWindow isOpen={isOpenSpaceSettingWindow} onClose={() => setIsOpenSpaceSettingWindow(false)}>
        <SpaceSettingWindow onClose={() => setIsOpenSpaceSettingWindow(false)}></SpaceSettingWindow>
      </PopWindow>
      <PopWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleHandleOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddRole}></AddRoleWindow>
      </PopWindow>
      <PopWindow isOpen={isMemberHandleOpen} onClose={() => setIsMemberHandleOpen(false)}>
        <AddMemberWindow handleAddMember={handleAddMember}></AddMemberWindow>
      </PopWindow>
    </div>
  );
}

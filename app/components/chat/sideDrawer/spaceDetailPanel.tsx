import { MemberTypeTag } from "@/components/chat/smallComponents/memberTypeTag";
import { SpaceContext } from "@/components/chat/spaceContext";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import SpaceSettingWindow from "@/components/chat/window/spaceSettingWindow";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import UserAvatarComponent from "@/components/common/userAvatar";
import { GirlIcon, MemberIcon, Setting } from "@/icons";
import React, { use } from "react";
import {
  useAddSpaceMemberMutation,
  useAddSpaceRoleMutation,
  useGetSpaceMembersQuery,
  useGetSpaceRolesQuery,
} from "../../../../api/hooks/chatQueryHooks";

export default function SpaceDetailPanel() {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;
  const spaceMemberQuery = useGetSpaceMembersQuery(spaceId);
  const spaceMembers = spaceMemberQuery.data?.data ?? [];
  const spaceRolesQuery = useGetSpaceRolesQuery(spaceId);
  const spaceRoles = spaceRolesQuery.data?.data ?? [];

  // 是否显示space详情
  const [_, setIsShowSpacePanel] = useSearchParamsState<boolean>("spaceDetailPop", false);

  const [isRoleHandleOpen, setIsRoleHandleOpen] = useSearchParamsState<boolean>(`spaceRolePop${spaceContext.spaceId}`, false);
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>(`spaceUserPop${spaceContext.spaceId}`, false);

  const addMemberMutation = useAddSpaceMemberMutation();
  const addRoleMutation = useAddSpaceRoleMutation();

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
      {/* name of each tab group should be unique */}
      <div className="tabs tabs-lift h-full">
        {/* 群成员列表 */}
        <label className="tab">
          <input type="radio" name="my_tabs_4" defaultChecked />
          <MemberIcon className="size-4"></MemberIcon>
          群成员
        </label>
        <div className="tab-content space-y-2">
          <div className="flex flex-row justify-center items-center gap-2 px-4">
            <p>
              空间成员-
              {spaceMembers.length}
            </p>
            {
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
              className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg items-center "
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
        <label className="tab">
          <input type="radio" name="my_tabs_4" />
          <GirlIcon className="size-4"></GirlIcon>
          角色
        </label>
        <div className="tab-content space-y-2">
          <div className="flex flex-row justify-center items-center gap-2 px-4">
            <p>
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
              className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg items-center "
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
        {/* 设置窗口 */}
        {
          spaceContext.isSpaceOwner && (
            <>
              <label className="tab">
                <input type="radio" name="my_tabs_4" />
                <Setting className="size-4"></Setting>
                设置
              </label>
              <div className="tab-content">
                <SpaceSettingWindow onClose={() => { setIsShowSpacePanel(false); }}></SpaceSettingWindow>
              </div>
            </>
          )
        }
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

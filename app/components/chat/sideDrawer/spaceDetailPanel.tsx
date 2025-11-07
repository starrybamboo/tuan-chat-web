import MemberLists from "@/components/chat/smallComponents/memberLists";
import { SpaceContext } from "@/components/chat/spaceContext";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import RenderWindow from "@/components/chat/window/renderWindow";
import SpaceSettingWindow from "@/components/chat/window/spaceSettingWindow";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import { MemberIcon, Setting, WebgalIcon } from "@/icons";
import React, { use } from "react";
import toast from "react-hot-toast";
import {
  useAddSpaceMemberMutation,
  useAddSpaceRoleMutation,
  useGetSpaceMembersQuery,
} from "../../../../api/hooks/chatQueryHooks";

export default function SpaceDetailPanel() {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;
  const spaceMemberQuery = useGetSpaceMembersQuery(spaceId);
  const spaceMembers = spaceMemberQuery.data?.data ?? [];
  // const spaceRolesQuery = useGetSpaceRolesQuery(spaceId);
  // const spaceRoles = spaceRolesQuery.data?.data ?? [];

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
        // setIsRoleHandleOpen(false);
        toast("添加成员成功");
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
    <div className="flex flex-row gap-4 h-full w-full max-w-3xl">
      {/* name of each tab group should be unique */}
      <div className="tabs tabs-lift h-full">
        {/* 群成员列表 */}
        <label className="tab">
          <input type="radio" name="space_detail_tabs" defaultChecked />
          <MemberIcon className="size-4"></MemberIcon>
          群成员
        </label>
        <div className="tab-content space-y-2 p-4 overflow-y-auto">
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
                  邀请观战
                </button>
              )
            }
          </div>
          <MemberLists members={spaceMembers} isSpace={true}></MemberLists>
        </div>
        {/* 角色列表 */}
        {/* <label className="tab"> */}
        {/*  <input type="radio" name="space_detail_tabs" /> */}
        {/*  <GirlIcon className="size-4"></GirlIcon> */}
        {/*  角色 */}
        {/* </label> */}
        {/* <div className="tab-content space-y-2 p-4 overflow-y-auto"> */}
        {/*  <div className="flex flex-row justify-center items-center gap-2 px-4"> */}
        {/*    <p> */}
        {/*      角色列表- */}
        {/*      <span className="text-sm">{spaceRoles.length}</span> */}
        {/*    </p> */}
        {/*    { */}
        {/*      (1) && ( */}
        {/*        <button */}
        {/*          className="btn btn-dash btn-info" */}
        {/*          type="button" */}
        {/*          onClick={() => setIsRoleHandleOpen(true)} */}
        {/*        > */}
        {/*          添加角色 */}
        {/*        </button> */}
        {/*      ) */}
        {/*    } */}
        {/*  </div> */}
        {/*  {spaceRoles.map((role) => { */}
        {/*    return ( */}
        {/*      <div */}
        {/*        key={role.roleId} */}
        {/*        className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg items-center " */}
        {/*      > */}
        {/*        /!* role列表 *!/ */}
        {/*        <RoleAvatarComponent */}
        {/*          avatarId={role.avatarId ?? 0} */}
        {/*          width={8} */}
        {/*          isRounded={true} */}
        {/*          withTitle={false} */}
        {/*        /> */}
        {/*        <div className="flex flex-col items-center gap-2 text-sm font-medium"> */}
        {/*          <span>{role.roleName || "未命名角色"}</span> */}
        {/*        </div> */}
        {/*      </div> */}
        {/*    ); */}
        {/*  })} */}
        {/* </div> */}
        {/* 设置窗口 */}
        {
          spaceContext.isSpaceOwner && (
            <>
              <label className="tab">
                <input type="radio" name="space_detail_tabs" />
                <Setting className="size-4"></Setting>
                设置
              </label>
              <div className="tab-content p-4 overflow-y-auto">
                <SpaceSettingWindow onClose={() => { setIsShowSpacePanel(false); }}></SpaceSettingWindow>
              </div>
            </>
          )
        }
        {/* 渲染对话 */}
        <label className="tab">
          <input
            type="radio"
            name="space_detail_tabs"
          />
          <WebgalIcon className="size-4 mr-1" />
          渲染
        </label>
        <div className="tab-content p-4 overflow-y-auto">
          <RenderWindow></RenderWindow>
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

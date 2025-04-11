import DialogueWindow from "@/components/chat/dialogueWindow";
import { useCreateGroupMutation, useCreateSubgroupMutation, useGetUserGroupsQuery, useGetUserInfoQuery } from "api/queryHooks";
import React, { useState } from "react";
import { PopWindow } from "../common/popWindow";
import { UserDetail } from "../common/userDetail";

export default function GroupSelect() {
  // 当前展开子群的父群
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  // 当前选中的子群ID
  const [activeSubGroupId, setActiveSubGroupId] = useState<number | null>(null);
  // 获取用户群组列表
  const { data } = useGetUserGroupsQuery();
  const UserGroups = data?.data ?? [];
  // 分离子群和父群
  const groups = UserGroups.filter(group => group.parentGroupId === group.roomId);
  const subGroups = UserGroups;
  // 创建群组
  const createGroupMutation = useCreateGroupMutation();
  // 当前要创建子群的父群ID
  const [currentParentGroupId, setCurrentParentGroupId] = useState<number | null>(null);
  // 创建子群
  const createSubGroupMutation = useCreateSubgroupMutation(currentParentGroupId || 0);
  // 创建群组弹窗是否打开
  const [isGroupHandleOpen, setIsGroupHandleOpen] = useState(false);
  // 创建子群弹窗是否打开
  const [isSubGroupHandleOpen, setIsSubGroupHandleOpen] = useState(false);
  // 处理邀请用户uid
  const [inputUserId, setInputUserId] = useState<number>(-1);
  const inputUserInfo = useGetUserInfoQuery(inputUserId).data?.data;

  // 创建群组
  async function createGroup(userId: number) {
    createGroupMutation.mutate({
      userIdList: [userId],
    }, {
      onSettled: () => {
        setIsGroupHandleOpen(false);
      },
    });
  }
  // 创建子群
  async function createSubGroup(parentGroupId: number, userId: number) {
    setCurrentParentGroupId(parentGroupId);
    createSubGroupMutation.mutate({
      parentRoomId: parentGroupId,
      userIdList: [userId],
    }, {
      onSettled: () => {
        setIsSubGroupHandleOpen(false);
      },
    });
  }

  return (
    <div className="flex flex-row bg-base-100">
      {/* 一级群组列表 */}
      <div className="menu flex flex-col gap-2 p-3 bg-base-300">
        {groups.map(group => (
          <button
            key={group.roomId}
            className="tooltip tooltip-right w-10"
            data-tip={group.name}
            type="button"
            onClick={() => setOpenGroup(group.roomId)}
          >
            <div className="avatar mask mask-squircle">
              <img
                src={group.avatar}
                alt={group.name}
              />
            </div>
          </button>
        ))}
        <button
          className="btn btn-square btn-dash btn-info"
          type="button"
          onClick={() => setIsGroupHandleOpen(true)}
        >
          <div className="avatar mask mask-squircle w-8 flex justify-center items-center">
            <span className="text-xl">+</span>
          </div>
        </button>
      </div>
      {/* 二级群组列表 */}
      <div className="flex flex-col gap-2 p-2 w-[300px] bg-base-100">
        {groups.map(group => (
          <React.Fragment key={group.roomId}>
            {openGroup === group.roomId && (
              subGroups.filter(subGroup => subGroup.parentGroupId === group.roomId)
                .map(subGroup => (
                  <button
                    key={subGroup.roomId}
                    className="btn btn-ghost flex justify-start w-full gap-2"
                    type="button"
                    onClick={() => setActiveSubGroupId(subGroup.roomId)}
                  >
                    <div className="avatar mask mask-squircle w-8">
                      <img
                        src={subGroup.avatar}
                        alt={subGroup.name}
                      />
                    </div>
                    <span>{subGroup.name}</span>
                  </button>
                ))
            )}
          </React.Fragment>
        ))}
        {openGroup !== null && (
          <button
            className="btn btn-dash btn-info flex w-full"
            type="button"
            onClick={() => {
              if (openGroup) {
                setIsSubGroupHandleOpen(true);
                setCurrentParentGroupId(openGroup);
              }
            }}
          >
            创建子群聊
          </button>
        )}
      </div>
      {/* 对话窗口 */}
      <DialogueWindow groupId={activeSubGroupId ?? 1} key={activeSubGroupId ?? 1} />
      {/* 创建群组弹出窗口 */}
      <PopWindow isOpen={isGroupHandleOpen} onClose={() => setIsGroupHandleOpen(false)}>
        <div className="w-full p-4">
          <p className="text-lg font-bold text-center w-full mb-4">输入要加入的用户的ID</p>
          <input type="text" placeholder="输入要加入的成员的ID" className="input input-bordered w-full mb-8" onInput={e => setInputUserId(Number(e.currentTarget.value))} />
          {
            (inputUserId > 0 && inputUserInfo)
            && (
              <div className="items-center flex flex-col gap-y-4">
                <UserDetail userId={inputUserId}></UserDetail>
                <button className="btn btn-info" type="button" onClick={() => createGroup(Number(inputUserId))}>
                  确认
                </button>
              </div>
            )
          }
        </div>
      </PopWindow>
      {/* 创建子群弹出窗口(后面如果与上面功能没太多区别就合并) */}
      <PopWindow isOpen={isSubGroupHandleOpen} onClose={() => setIsSubGroupHandleOpen(false)}>
        <div className="w-full p-4">
          <p className="text-lg font-bold text-center w-full mb-4">输入要加入的用户的ID</p>
          <input type="text" placeholder="输入要加入的成员的ID" className="input input-bordered w-full mb-8" onInput={e => setInputUserId(Number(e.currentTarget.value))} />
          {
            (inputUserId > 0 && inputUserInfo)
            && (
              <div className="items-center flex flex-col gap-y-4">
                <UserDetail userId={inputUserId}></UserDetail>
                <button
                  className="btn btn-info"
                  type="button"
                  onClick={() => {
                    if (currentParentGroupId) {
                      createSubGroup(currentParentGroupId, Number(inputUserId));
                    }
                  }}
                >
                  确认
                </button>
              </div>
            )
          }
        </div>
      </PopWindow>
    </div>
  );
}

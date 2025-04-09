import DialogueWindow from "@/components/chat/dialogueWindow";
import { useGetUserGroupsQuery } from "api/queryHooks";
import React, { useState } from "react";

export default function GroupSelect() {
  // 当前展开子群的父群
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  // 当前选中的子群ID
  const [activeSubGroupId, setActiveSubGroupId] = useState<number | null>(null);
  // 获取用户群组列表
  const getUserGroupsQuery = useGetUserGroupsQuery();
  const UserGroups = getUserGroupsQuery.data?.data ?? [];
  // 分离子群和父群
  const groups = UserGroups.filter(group => group.parentGroupId === group.roomId);
  const subGroups = UserGroups;

  // 展开子群
  const unfoldSubGroup = (mainGroupId: number) => {
    setOpenGroup(openGroup === mainGroupId ? null : mainGroupId);
  };

  return (
    <div className="flex flex-row w-full">
      <div className="channel-selector flex">
        <ul className="menu w-[300px] bg-base-300">
          {groups.map(group => (
            <React.Fragment key={group.roomId}>
              <li>
                <button
                  type="button"
                  className="flex items-center w-full"
                  onClick={() => unfoldSubGroup(group.roomId)}
                >
                  <div className="avatar">
                    <div className="mask mask-squircle w-8">
                      <img
                        src={group.avatar}
                        alt={group.name}
                      />
                    </div>
                  </div>
                  <span className="ml-2 text-base-content/60">{group.name}</span>
                  <span className="ml-auto text-base-content">
                    {openGroup === group.roomId ? "▼" : "▶"}
                  </span>
                </button>
              </li>
              {openGroup === group.roomId && (
                <li>
                  <ul className="pl-4">
                    {subGroups.filter(subGroup => subGroup.parentGroupId === group.roomId)
                      .map(subGroup => (
                        <li key={subGroup.roomId}>
                          <button
                            type="button"
                            className="flex items-center w-full"
                            onClick={() => setActiveSubGroupId(subGroup.roomId)}
                          >
                            <div className="avatar">
                              <div className="mask mask-squircle w-8">
                                <img
                                  src={subGroup.avatar}
                                  alt={subGroup.name}
                                />
                              </div>
                            </div>
                            <span className="ml-2 text-base-content/60">{subGroup.name}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </li>
              )}
            </React.Fragment>
          ))}
        </ul>
      </div>
      <DialogueWindow groupId={activeSubGroupId ?? 1} key={activeSubGroupId ?? 1} />
    </div>
  );
}

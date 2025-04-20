import React from "react";
import { useGetUserGroupsQuery } from "../../../api/queryHooks";

function ForwardWindow({ onClickGroup }: { onClickGroup: (groupId: number) => void }) {
  const userGroupsQuery = useGetUserGroupsQuery();
  const groups = userGroupsQuery.data?.data ?? [];
  return (
    <div className="gap-2 flex flex-col items-center overflow-auto">
      选择要转发的群组：
      {
        groups.map(group => (
          <button
            key={group.roomId}
            className="btn btn-ghost flex justify-start w-full gap-2"
            type="button"
            onClick={() => onClickGroup(group.roomId)}
          >
            <div className="avatar mask mask-squircle w-8">
              <img
                src={group.avatar}
                alt={group.name}
              />
            </div>
            <span>{group.name}</span>
          </button>
        ))
      }

    </div>
  );
}

export default ForwardWindow;

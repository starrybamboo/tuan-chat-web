import { ExpressionChooser } from "@/components/chat/expressionChooser";
import { RoomContext } from "@/components/chat/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { AddRingLight } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import React, { use, useEffect, useMemo } from "react";
import { useGetRoleAvatarsQuery, useGetUserRolesQuery } from "../../../api/queryHooks";

export default function AvatarSwitch({
  curRoleId,
  curAvatarId,
  setCurAvatarId,
  setCurRoleId,
}: {
  curRoleId: number;
  curAvatarId: number;
  setCurAvatarId: (value: React.SetStateAction<number>) => void;
  setCurRoleId: (value: React.SetStateAction<number>) => void;
}) {
  const roomContext = use(RoomContext);
  const globalContext = useGlobalContext();
  const userId = globalContext.userId;

  const [_, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);

  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);

  // 获取当前角色的头像列表
  const roleAvatarsQuery = useGetRoleAvatarsQuery(curRoleId > 0 ? curRoleId : -1);
  const roleAvatars = useMemo(() => roleAvatarsQuery.data?.data ?? [], [roleAvatarsQuery.data?.data]);

  useEffect(() => {
    const currentRole = userRoles.find(role => role.roleId === curRoleId);
    // 优先使用角色的头像列表中的第一个头像，如果没有则使用角色的默认头像
    if (roleAvatars.length > 0) {
      setCurAvatarId(roleAvatars[0].avatarId ?? -1);
    }
    else {
      setCurAvatarId(currentRole?.avatarId ?? -1);
    }
  }, [setCurAvatarId, userRoles, roleAvatars]);

  if (curRoleId <= 0) {
    return (
      (roomContext.curMember?.memberType ?? 3) < 3 && (
        <li className="flex flex-row list-none group" onClick={() => setIsRoleAddWindowOpen(true)}>
          <div className="w-full">
            <AddRingLight className="size-10 md:size-14 group-hover:text-info"></AddRingLight>
            <div className="text-sm truncate w-full text-center">
              添加角色
            </div>
          </div>
        </li>
      )
    );
  }

  return (
    <div className="dropdown dropdown-top flex-shrink-0 w-10 md:w-14 ">
      <div role="button" tabIndex={0} className="">
        <div
          className="tooltip flex justify-center flex-col items-center space-y-2"
          data-tip="切换角色和表情"
        >
          <RoleAvatarComponent
            avatarId={curAvatarId}
            width={getScreenSize() === "sm" ? 10 : 14}
            isRounded={true}
            withTitle={false}
            stopPopWindow={true}
            alt={curRoleId > 0 ? "无可用头像" : "无可用角色"}
          />
          <div className="text-sm truncate w-full text-center">
            {userRoles.find(r => r.roleId === curRoleId)?.roleName || ""}
          </div>
        </div>
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-1 shadow-sm p-0 border border-base-300"
      >
        <ExpressionChooser
          roleId={curRoleId}
          handleExpressionChange={avatarId => setCurAvatarId(avatarId)}
          handleRoleChange={roleId => setCurRoleId(roleId)}
        >
        </ExpressionChooser>
      </ul>
    </div>
  );
}

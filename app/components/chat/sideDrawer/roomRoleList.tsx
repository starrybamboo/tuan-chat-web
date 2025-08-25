import { RoomContext } from "@/components/chat/roomContext";
import RoleList from "@/components/chat/smallComponents/roleLists";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { getScreenSize } from "@/utils/getScreenSize";
import React, { use, useMemo } from "react";
import { useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";

export default function RoomRoleList() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  // 全局登录用户对应的member
  const curMember = roomContext.curMember;
  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);

  const [_, setIsRoleHandleOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  return (
    <div className="space-y-2 p-2 overflow-auto items-center flex flex-col ">
      <div className="flex flex-row justify-center items-center gap-2 min-w-60">
        <p className="text-center">
          角色列表-
          <span className="text-sm">{roomRoles.length}</span>
        </p>
        {(curMember?.memberType === 1 || curMember?.memberType === 2) && (
          <button
            className="btn btn-dash btn-info"
            type="button"
            onClick={() => setIsRoleHandleOpen(true)}
          >
            添加角色
          </button>
        )}
      </div>
      <RoleList roles={roomRoles} className={getScreenSize() === "sm" ? "w-full" : "w-60"}></RoleList>
    </div>
  )
  ;
}

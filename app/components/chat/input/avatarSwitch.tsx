import React, { use, useLayoutEffect, useMemo, useState } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { AddRingLight, NarratorIcon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useGetRoleAvatarsQuery, useGetUserRolesQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

export default function AvatarSwitch({
  curRoleId,
  curAvatarId,
  setCurAvatarId,
  setCurRoleId,
}: {
  curRoleId: number;
  curAvatarId: number;
  setCurAvatarId: (value: number) => void;
  setCurRoleId: (value: number) => void;
}) {
  const roomContext = use(RoomContext);
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const draftCustomRoleNameMap = useRoomPreferenceStore(state => state.draftCustomRoleNameMap);
  const setDraftCustomRoleNameForRole = useRoomPreferenceStore(state => state.setDraftCustomRoleNameForRole);

  const globalContext = useGlobalContext();
  const userId = globalContext.userId;

  const [_, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);

  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);

  // 获取当前角色的头像列表
  const roleAvatarsQuery = useGetRoleAvatarsQuery(curRoleId > 0 ? curRoleId : -1);
  const roleAvatars = useMemo(() => roleAvatarsQuery.data?.data ?? [], [roleAvatarsQuery.data?.data]);
  const currentRole = useMemo(() => userRoles.find(r => r.roleId === curRoleId), [userRoles, curRoleId]);

  // 判断是否为旁白模式（WebGAL 联动模式下无角色）
  const isNarratorMode = curRoleId <= 0 && webgalLinkMode;

  const draftCustomRoleName = draftCustomRoleNameMap[curRoleId];
  const displayName = (draftCustomRoleName?.trim() || currentRole?.roleName || "");

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");

  useLayoutEffect(() => {
    if (curAvatarId > 0)
      return;
    // 优先使用角色的头像列表中的第一个头像，如果没有则使用角色的默认头像
    if (roleAvatars.length > 0) {
      setCurAvatarId(roleAvatars[0].avatarId ?? -1);
    }
    else {
      setCurAvatarId(currentRole?.avatarId ?? -1);
    }
  }, [setCurAvatarId, roleAvatars, curAvatarId, currentRole]);

  // WebGAL 联动模式下的旁白模式
  if (isNarratorMode) {
    return (
      <div className="dropdown dropdown-top flex-shrink-0 w-10 md:w-14">
        <div role="button" tabIndex={0} className="">
          <div
            className="tooltip flex justify-center flex-col items-center space-y-2"
            data-tip="当前为旁白模式，点击切换角色"
          >
            <div className="size-10 md:size-14 rounded-full bg-base-300 flex items-center justify-center">
              <NarratorIcon className="size-6 md:size-8 text-base-content/60" />
            </div>
            <div className="text-sm truncate w-full text-center text-base-content/60">
              旁白
            </div>
          </div>
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-1 shadow-sm p-0 border border-base-300 w-[92vw] md:w-auto max-h-[75vh] overflow-y-auto overflow-x-hidden"
        >
          <ExpressionChooser
            roleId={curRoleId}
            handleExpressionChange={avatarId => setCurAvatarId(avatarId)}
            handleRoleChange={roleId => setCurRoleId(roleId)}
            showNarratorOption={true}
          />
        </ul>
      </div>
    );
  }

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
      <div
        className="tooltip flex justify-center flex-col items-center space-y-2"
        data-tip="切换角色和表情"
      >
        <div role="button" tabIndex={0} className="" title="切换角色和表情" aria-label="切换角色和表情">
          <RoleAvatarComponent
            avatarId={curAvatarId}
            width={getScreenSize() === "sm" ? 10 : 14}
            isRounded={true}
            withTitle={false}
            stopPopWindow={true}
            alt={curRoleId > 0 ? "无可用头像" : "无可用角色"}
          />
        </div>

        {!isEditingName && (
          <div
            className="text-sm truncate w-full text-center cursor-text"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditingName(displayName);
              setIsEditingName(true);
            }}
            title="点击编辑显示名称"
          >
            {displayName}
          </div>
        )}

        {isEditingName && (
          <input
            className="input input-xs input-bordered w-full text-center bg-base-200 border-base-300 px-2 shadow-sm focus:outline-none focus:border-info"
            value={editingName}
            autoFocus
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onChange={e => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setIsEditingName(false);
                setEditingName("");
              }
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                setDraftCustomRoleNameForRole(curRoleId, editingName);
                setIsEditingName(false);
              }
            }}
            onBlur={() => {
              setDraftCustomRoleNameForRole(curRoleId, editingName);
              setIsEditingName(false);
            }}
            placeholder={currentRole?.roleName || ""}
          />
        )}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-1 shadow-sm p-0 border border-base-300 w-[92vw] md:w-auto max-h-[75vh] overflow-y-auto overflow-x-hidden"
      >
        <ExpressionChooser
          roleId={curRoleId}
          handleExpressionChange={avatarId => setCurAvatarId(avatarId)}
          handleRoleChange={roleId => setCurRoleId(roleId)}
          showNarratorOption={webgalLinkMode}
        />
      </ul>
    </div>
  );
}

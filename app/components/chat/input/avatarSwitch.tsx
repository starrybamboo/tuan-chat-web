import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { NarratorIcon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useGetRoleAvatarsQuery, useGetUserRolesQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

export default function AvatarSwitch({
  curRoleId,
  curAvatarId,
  setCurAvatarId,
  setCurRoleId,
  layout = "vertical",
  dropdownPosition = "top",
  dropdownAlign = "start",
  showName = true,
  avatarWidth,
}: {
  curRoleId: number;
  curAvatarId: number;
  setCurAvatarId: (value: number) => void;
  setCurRoleId: (value: number) => void;
  layout?: "vertical" | "horizontal";
  dropdownPosition?: "top" | "bottom";
  dropdownAlign?: "start" | "end";
  showName?: boolean;
  avatarWidth?: React.ComponentProps<typeof RoleAvatarComponent>["width"];
}) {
  const draftCustomRoleNameMap = useRoomPreferenceStore(state => state.draftCustomRoleNameMap);
  const setDraftCustomRoleNameForRole = useRoomPreferenceStore(state => state.setDraftCustomRoleNameForRole);

  const globalContext = useGlobalContext();
  const userId = globalContext.userId;

  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);

  // 获取当前角色的头像列表
  const roleAvatarsQuery = useGetRoleAvatarsQuery(curRoleId > 0 ? curRoleId : -1);
  const roleAvatars = useMemo(() => roleAvatarsQuery.data?.data ?? [], [roleAvatarsQuery.data?.data]);
  const currentRole = useMemo(() => userRoles.find(r => r.roleId === curRoleId), [userRoles, curRoleId]);

  // 当前是否已选择角色
  const hasSelectedRole = curRoleId > 0;
  // 旁白模式：当前已选择旁白（roleId<=0 的情况里，-1 表示旁白；0 通常表示“未选择”）
  const hasSelectedNarrator = curRoleId < 0;
  const hasSelectedIdentity = hasSelectedRole || hasSelectedNarrator;

  const draftCustomRoleName = draftCustomRoleNameMap[curRoleId];
  const displayName = (draftCustomRoleName?.trim() || currentRole?.roleName || "");

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [isAvatarChooserFullscreen, setIsAvatarChooserFullscreen] = useState(false);
  const dropdownTriggerRef = useRef<HTMLDivElement | null>(null);

  const handleCloseDropdown = () => {
    dropdownTriggerRef.current?.blur();
    setIsAvatarChooserFullscreen(false);
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur();
    }
  };

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

  // 旁白模式
  const isHorizontal = layout === "horizontal";
  const wrapperClassName = isHorizontal
    ? `dropdown dropdown-${dropdownPosition} dropdown-${dropdownAlign} flex items-center gap-2`
    : `dropdown dropdown-${dropdownPosition} dropdown-${dropdownAlign} flex-shrink-0 w-10 md:w-14`;
  const tooltipClassName = isHorizontal
    ? "tooltip flex items-center gap-2"
    : "tooltip flex justify-center flex-col items-center space-y-2";
  const nameClassName = isHorizontal
    ? "text-sm truncate max-w-[140px] text-left cursor-text"
    : "text-sm truncate w-full text-center cursor-text";
  const sizeClassMap: Record<NonNullable<typeof avatarWidth>, string> = {
    6: "w-6 h-6",
    8: "w-8 h-8",
    10: "w-10 h-10",
    12: "w-12 h-12",
    14: "w-14 h-14",
    16: "w-16 h-16",
    18: "w-18 h-18",
    20: "w-20 h-20",
    24: "w-24 h-24",
    30: "w-30 h-30",
    32: "w-32 h-32",
    36: "w-36 h-36",
  };
  const computedAvatarWidth = avatarWidth ?? (getScreenSize() === "sm" ? 10 : 14);
  const narratorSizeClass = sizeClassMap[computedAvatarWidth] ?? "w-10 h-10";
  const dropdownWidthClassName = isAvatarChooserFullscreen
    ? "w-[92vw] md:w-[92vw] max-w-[92vw]"
    : "w-[92vw] md:w-auto";

  if (!hasSelectedIdentity) {
    return (
      <div className={wrapperClassName}>
        <div role="button" tabIndex={0} className="" ref={dropdownTriggerRef}>
          <div
            className={tooltipClassName}
            data-tip="未选择角色，点击选择"
          >
            <div className={`${narratorSizeClass} rounded-full bg-base-300 flex items-center justify-center`}>
              <NarratorIcon className={computedAvatarWidth <= 8 ? "size-5 text-base-content/60" : "size-6 md:size-8 text-base-content/60"} />
            </div>
            {showName && (
              <div className={`${isHorizontal ? "text-left" : "text-center"} text-sm truncate w-full text-base-content/60`}>
                未选择角色
              </div>
            )}
          </div>
        </div>
        <ul
          tabIndex={0}
          className={`dropdown-content menu bg-base-100 rounded-box z-9999 shadow-sm p-0 border border-base-300 ${dropdownWidthClassName} max-h-[75vh] overflow-y-auto overflow-x-hidden`}
        >
          <ExpressionChooser
            roleId={curRoleId}
            handleExpressionChange={avatarId => setCurAvatarId(avatarId)}
            handleRoleChange={roleId => setCurRoleId(roleId)}
            onRequestClose={handleCloseDropdown}
            defaultFullscreen={isAvatarChooserFullscreen}
            onRequestFullscreen={setIsAvatarChooserFullscreen}
          />
        </ul>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <div
        className={tooltipClassName}
        data-tip={hasSelectedNarrator ? "切换旁白头像/角色" : "切换角色和表情"}
      >
        <div role="button" tabIndex={0} className="" title="切换角色和表情" aria-label="切换角色和表情" ref={dropdownTriggerRef}>
          {hasSelectedNarrator && curAvatarId <= 0
            ? (
                <div className={`${narratorSizeClass} rounded-full bg-transparent flex items-center justify-center`}>
                  <NarratorIcon className={computedAvatarWidth <= 8 ? "size-5 text-base-content/60" : "size-6 md:size-8 text-base-content/60"} />
                </div>
              )
            : (
                <RoleAvatarComponent
                  avatarId={curAvatarId}
                  roleId={curRoleId}
                  width={computedAvatarWidth}
                  isRounded={true}
                  withTitle={false}
                  stopToastWindow={true}
                  useDefaultAvatarFallback={false}
                  alt={hasSelectedRole ? "无可用头像" : "旁白"}
                />
              )}
        </div>

        {showName && hasSelectedRole && !isEditingName && (
          <div
            className={nameClassName}
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

        {showName && hasSelectedRole && isEditingName && (
          <input
            className={`input input-xs input-bordered w-full ${isHorizontal ? "text-left" : "text-center"} bg-base-200 border-base-300 px-2 shadow-sm focus:outline-none focus:border-info`}
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

        {showName && hasSelectedNarrator && (
          <div className={`${nameClassName} text-base-content/40 select-none`} title="旁白不显示名称">
            &nbsp;
          </div>
        )}
      </div>
      <ul
        tabIndex={0}
        className={`dropdown-content menu bg-base-100 rounded-box z-9999 shadow-sm p-0 border border-base-300 ${dropdownWidthClassName} max-h-[75vh] overflow-y-auto overflow-x-hidden`}
      >
        <ExpressionChooser
          roleId={curRoleId}
          handleExpressionChange={avatarId => setCurAvatarId(avatarId)}
          handleRoleChange={roleId => setCurRoleId(roleId)}
          onRequestClose={handleCloseDropdown}
          defaultFullscreen={isAvatarChooserFullscreen}
          onRequestFullscreen={setIsAvatarChooserFullscreen}
        />
      </ul>
    </div>
  );
}

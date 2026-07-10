import { type ReactNode, use, useMemo, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import { RoomContext } from "@/components/chat/core/roomContext";
import { canManageRoomRoles, hasHostPrivileges } from "@/components/chat/utils/memberPermissions";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { RoleAvatarByRole } from "@/components/common/roleAccess";
import { RoleDetailPagePopup } from "@/components/common/roleDetailPagePopup";
import { RoleTypeBadge } from "@/components/common/roleTypeBadge";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { AddRingLight, AddRoleIcon, IdentificationCardIcon, NarratorIcon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";

import type { UserRole } from "../../../../api";

type RoleSelectionPanelProps = {
  className?: string;
  listClassName?: string;
  roles?: UserRole[];
  selectedRoleId?: number;
  showNarratorOption?: boolean;
  showMobileCurrentRoleToggle?: boolean;
  isMobileLayout?: boolean;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onRoleSelect: (role: UserRole) => void;
  onNarratorSelect?: () => void;
  renderRoleActions?: (role: UserRole) => ReactNode;
};

export function RoleSelectionPanel({
  className,
  listClassName,
  roles,
  selectedRoleId,
  showNarratorOption = false,
  showMobileCurrentRoleToggle = false,
  isMobileLayout = false,
  isExpanded = true,
  onExpandedChange,
  onRoleSelect,
  onNarratorSelect,
  renderRoleActions,
}: RoleSelectionPanelProps) {
  const roomContext = use(RoomContext);
  const [_, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const [manageRoleId, setManageRoleId] = useState<number | null>(null);
  const displayRoles = roles ?? roomContext.roomRolesThatUserOwn;
  const currentMemberType = roomContext.curMember?.memberType;
  const hasHostAccess = hasHostPrivileges(currentMemberType);
  const canAddRole = canManageRoomRoles(currentMemberType);
  const isNarratorMode = (selectedRoleId ?? 0) < 0;
  const isNoRoleMode = selectedRoleId === 0;
  const selectedRole = useMemo(
    () => displayRoles.find(role => role.roleId === selectedRoleId),
    [displayRoles, selectedRoleId],
  );
  const manageRole = useMemo(
    () => displayRoles.find(role => role.roleId === manageRoleId),
    [displayRoles, manageRoleId],
  );

  const handleNarratorClick = () => {
    if (!hasHostAccess) {
      appToast.error("只有主持人可以使用旁白");
      return;
    }
    onNarratorSelect?.();
  };

  return (
    <>
      <div className={className}>
        {showMobileCurrentRoleToggle && (
          <button
            type="button"
            className="
              w-full flex items-center justify-between gap-2 rounded-lg border
              border-base-300 p-2 hover:bg-base-200 transition-colors
            "
            onClick={() => onExpandedChange?.(!isExpanded)}
            aria-expanded={isExpanded}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isNarratorMode
                ? (
                    <div className="
                      size-8 rounded-full bg-transparent flex items-center
                      justify-center shrink-0
                    ">
                      <NarratorIcon className="size-5 text-base-content/60" />
                    </div>
                  )
                : isNoRoleMode
                  ? (
                      <div className="
                        size-8 rounded-full bg-base-200/50 flex items-center
                        justify-center shrink-0
                      ">
                        <AddRoleIcon className="size-5 text-base-content/60" />
                      </div>
                    )
                  : (
                      <RoleAvatarByRole
                        role={selectedRole}
                        width={8}
                        isRounded={true}
                        withTitle={false}
                        stopToastWindow={true}
                      />
                    )}
              <div className="min-w-0 text-left">
                <div className="text-xs text-base-content/50">当前身份</div>
                <div className="text-sm font-medium truncate">
                  {isNarratorMode ? "旁白" : (selectedRole?.roleName ?? "未选择角色")}
                </div>
              </div>
            </div>
            <span className="text-xs text-base-content/70">
              {isExpanded ? "收起角色列表" : "切换角色"}
            </span>
          </button>
        )}
        {(!showMobileCurrentRoleToggle || isExpanded) && (
          <div className={listClassName}>
            {showNarratorOption && hasHostAccess && (
              <button
                type="button"
                onClick={handleNarratorClick}
                className={`
                  flex w-full items-center gap-3 rounded-lg text-left transition-colors cursor-pointer hover:bg-base-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30
                  ${isMobileLayout ? "p-2" : "p-3"}
                  ${isNarratorMode ? "bg-base-200 ring-2 ring-inset ring-info/30" : ""}
                `}
                aria-pressed={isNarratorMode}
              >
                <div className="
                  size-10 rounded-full bg-transparent flex items-center
                  justify-center shrink-0
                ">
                  <NarratorIcon className="size-6 text-base-content/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium truncate">旁白</div>
                  </div>
                  <div className="text-xs text-base-content/50">无角色叙述</div>
                </div>
              </button>
            )}
            {displayRoles.length === 0 && (!showNarratorOption || !hasHostAccess) && (
              <div className="text-center text-sm text-base-content/60 py-4">无可用角色</div>
            )}
            {displayRoles.map(role => (
              <div
                key={role.roleId}
                className={`
                  flex w-full items-center rounded-lg hover:bg-base-200 transition-colors
                  ${selectedRoleId === role.roleId ? "bg-base-200 ring-2 ring-inset ring-info/30" : ""}
                `}
              >
                <button
                  type="button"
                  onClick={() => onRoleSelect(role)}
                  className={`
                    flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30
                    ${isMobileLayout ? "p-2" : "p-3"}
                  `}
                  aria-pressed={selectedRoleId === role.roleId}
                >
                  <RoleAvatarByRole
                    role={role}
                    width={10}
                    isRounded={true}
                    withTitle={false}
                    stopToastWindow={true}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{role.roleName}</div>
                      <RoleTypeBadge role={role} />
                    </div>
                  </div>
                </button>
                {renderRoleActions?.(role) ?? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs mr-2 shrink-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      setManageRoleId(role.roleId);
                    }}
                    aria-label={`查看角色详情：${role.roleName}`}
                    title="查看角色详情"
                  >
                    <IdentificationCardIcon className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {canAddRole && (
              <button
                type="button"
                className={`
                  flex w-full items-center gap-3 rounded-lg cursor-pointer text-left hover:bg-base-200
                  transition-colors group border-2 border-dashed border-base-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30
                  ${isMobileLayout ? "p-2.5" : "p-3"}
                `}
                onClick={() => setIsRoleAddWindowOpen(true)}
              >
                <AddRingLight className="size-10 group-hover:text-info" />
                <div className="text-sm text-base-content/70 group-hover:text-info">
                  添加新角色
                </div>
              </button>
            )}
          </div>
        )}
      </div>
      <ToastWindow
        isOpen={manageRoleId !== null}
        onClose={() => setManageRoleId(null)}
        fullScreen={getScreenSize() === "sm"}
      >
        {manageRoleId !== null && (
          <div className="justify-center w-full">
            <RoleDetailPagePopup
              roleId={manageRoleId}
              roleTypeHint={manageRole?.type}
              roleOwnerUserIdHint={manageRole?.userId}
              roleStateHint={manageRole?.state}
              allowKickOut={true}
              kickOutByManagerOnly={Boolean(manageRole?.type === 2)}
              onClose={() => setManageRoleId(null)}
            />
          </div>
        )}
      </ToastWindow>
    </>
  );
}

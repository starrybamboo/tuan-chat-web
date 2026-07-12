import { use, useMemo, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import { RoomContext } from "@/components/chat/core/roomContext";
import { hasHostPrivileges } from "@/components/chat/utils/memberPermissions";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RoleDetailPagePopup } from "@/components/common/roleDetailPagePopup";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { getScreenSize } from "@/utils/getScreenSize";
import { useDeleteRole1Mutation } from "api/hooks/chatQueryHooks";

import type { UserRole } from "../../../../api";

import { RoleSelectionPanel } from "./roleSelectionPanel";

/**
 * 角色选择器组件，用于在聊天中选择不同的角色。
 * 复用房间角色选择面板，只保留消息改角色场景额外需要的踢出操作。
 */
export default function RoleChooser({
  handleRoleChange,
  roles,
  className,
}: {
  handleRoleChange: (roleId: UserRole) => void;
  roles?: UserRole[];
  className?: string;
}) {
  const roomContext = use(RoomContext);
  const displayRoles = roles ?? roomContext.roomRolesThatUserOwn;
  const roomId = roomContext.roomId ?? -1;
  const currentMemberType = roomContext.curMember?.memberType;
  const isManager = hasHostPrivileges(currentMemberType);
  const ownedRoleIds = useMemo(
    () => new Set(roomContext.roomRolesThatUserOwn.map(role => role.roleId)),
    [roomContext.roomRolesThatUserOwn],
  );
  const deleteRoleMutation = useDeleteRole1Mutation();
  const [manageRoleId, setManageRoleId] = useState<number | null>(null);
  const [kickRoleId, setKickRoleId] = useState<number | null>(null);

  const canKickRole = (role: UserRole) => {
    if (!roomId || roomId <= 0)
      return false;
    if (role.type === 2)
      return Boolean(isManager);
    return Boolean(isManager || ownedRoleIds.has(role.roleId));
  };

  const handleKickOut = () => {
    if (!roomId || roomId <= 0 || !kickRoleId) {
      appToast.error("房间信息异常，无法踢出角色");
      return;
    }
    deleteRoleMutation.mutate(
      { roomId, roleIdList: [kickRoleId] },
      {
        onSuccess: () => {
          appToast.success("已将角色从房间移除");
        },
        onError: (e: any) => {
          console.error("踢出角色失败", e);
          appToast.error(e?.message ? `踢出角色失败：${e.message}` : "踢出角色失败");
        },
        onSettled: () => {
          setKickRoleId(null);
        },
      },
    );
  };

  const manageRole = manageRoleId
    ? displayRoles.find(role => role.roleId === manageRoleId)
    : undefined;

  return (
    <>
      <RoleSelectionPanel
        className={`${className ?? ""} max-h-[30vh] overflow-y-auto`}
        listClassName="space-y-2"
        roles={displayRoles}
        onRoleSelect={handleRoleChange}
        renderRoleActions={role => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={(event) => {
                event.stopPropagation();
                setManageRoleId(role.roleId);
              }}
            >
              管理
            </Button>
            {canKickRole(role) && (
              <Button
                type="button"
                variant="error"
                size="xs"
                onClick={(event) => {
                  event.stopPropagation();
                  setKickRoleId(role.roleId);
                }}
              >
                踢出
              </Button>
            )}
          </div>
        )}
      />
      <ToastWindow
        isOpen={manageRoleId !== null}
        onClose={() => setManageRoleId(null)}
        fullScreen={getScreenSize() === "sm"}
      >
        {manageRoleId !== null && (
          <RoleDetailPagePopup
            roleId={manageRoleId}
            roleTypeHint={manageRole?.type}
            roleOwnerUserIdHint={manageRole?.userId}
            roleStateHint={manageRole?.state}
            allowKickOut={true}
            kickOutByManagerOnly={Boolean(manageRole?.type === 2)}
            onClose={() => setManageRoleId(null)}
          />
        )}
      </ToastWindow>
      <ConfirmDialog
        open={kickRoleId !== null}
        onOpenChange={() => setKickRoleId(null)}
        title="确认踢出角色"
        description="确定要将该角色从当前房间移除吗？此操作将解除该角色与房间的关联。"
        onConfirm={handleKickOut}
        confirmLabel="确认踢出"
        cancelLabel="取消"
        variant="warning"
      />
    </>
  );
}

import type { UserRole } from "../../../../api";
import React, { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import ConfirmModal from "@/components/common/comfirmModel";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { RoleDetailPagePopup } from "@/components/common/roleDetailPagePopup";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { getScreenSize } from "@/utils/getScreenSize";
import { AddRingLight } from "@/icons";
import { useDeleteRole1Mutation } from "api/hooks/chatQueryHooks";

/**
 * 角色选择器组件，用于在聊天中选择不同的角色
 * @param handleRoleChange 角色变更时的回调函数
 * @param roles 如果指定，就会使用这里的角色作为显示的列表，否则使用roomContext.roomRolesThatUserOwn
 * @param className 自定义样式类名
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
  const [_, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const displayRoles = roles ?? roomContext.roomRolesThatUserOwn;
  const roomId = roomContext.roomId ?? -1;
  const isManager = roomContext.curMember?.memberType === 1;
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
      toast.error("房间信息异常，无法踢出角色");
      return;
    }
    deleteRoleMutation.mutate(
      { roomId, roleIdList: [kickRoleId] },
      {
        onSuccess: () => {
          toast.success("已将角色从房间移除");
        },
        onError: (e: any) => {
          console.error("踢出角色失败", e);
          toast.error(e?.message ? `踢出角色失败：${e.message}` : "踢出角色失败");
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
    <div className={`${className} max-h-[30vh]`}>
      {
        roomContext.roomRolesThatUserOwn.length === 0 && (
          <div className="">无可用角色</div>
        )
      }
      {
        // 仅显示角色列表里面有的角色
        displayRoles.map(role => (
          <li
            key={role.roleId}
            className="flex flex-row list-none items-center gap-2"
          >
            <div
              className="flex-1 cursor-pointer"
              onClick={() => handleRoleChange(role)}
            >
              <RoleAvatarComponent
                avatarId={role.avatarId ?? 0}
                roleId={role.roleId}
                width={10}
                isRounded={false}
                withTitle={false}
                stopToastWindow={true}
              >
              </RoleAvatarComponent>
              <div>{role.roleName}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={(event) => {
                  event.stopPropagation();
                  setManageRoleId(role.roleId);
                }}
              >
                管理
              </button>
              {canKickRole(role) && (
                <button
                  type="button"
                  className="btn btn-error btn-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    setKickRoleId(role.roleId);
                  }}
                >
                  踢出
                </button>
              )}
            </div>
          </li>
        ))
      }
      {
        (roomContext.curMember?.memberType ?? 3) < 3 && (
          <li className="flex flex-row list-none group" onClick={() => setIsRoleAddWindowOpen(true)}>
            <div className="w-full">
              <AddRingLight className="size-10 group-hover:text-info"></AddRingLight>
              <div>
                添加角色
              </div>
            </div>
          </li>
        )
      }
      <ToastWindow
        isOpen={manageRoleId !== null}
        onClose={() => setManageRoleId(null)}
        fullScreen={getScreenSize() === "sm"}
      >
        {manageRoleId !== null && (
          <RoleDetailPagePopup
            roleId={manageRoleId}
            allowKickOut={true}
            kickOutByManagerOnly={Boolean(manageRole?.type === 2)}
            onClose={() => setManageRoleId(null)}
          />
        )}
      </ToastWindow>
      <ConfirmModal
        isOpen={kickRoleId !== null}
        onClose={() => setKickRoleId(null)}
        title="确认踢出角色"
        message="确定要将该角色从当前房间移除吗？此操作将解除该角色与房间的关联。"
        onConfirm={handleKickOut}
        confirmText="确认踢出"
        cancelText="取消"
        variant="warning"
      />
    </div>
  );
}

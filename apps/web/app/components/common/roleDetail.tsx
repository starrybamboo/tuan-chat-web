import { ArrowLeftIcon } from "@phosphor-icons/react";
import { use, useState } from "react";

import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { hasHostPrivileges } from "@/components/chat/utils/memberPermissions";
import { Button } from "@/components/common/Button";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RoleAvatarByRole } from "@/components/common/roleAccess";
import { Badge, Skeleton } from "@/components/common/StatusPrimitives";
import { useGlobalUserId } from "@/components/globalContextProvider";
import ExpansionModule from "@/components/Role/rules/ExpansionModule";

import { useDeleteRole1Mutation } from "../../../api/hooks/chatQueryHooks";
import { useGetRoleQuery, useGetUserRolesQuery } from "../../../api/hooks/RoleAndAvatarHooks";
import { useGetUserInfoQuery } from "../../../api/hooks/UserHooks";

/**
 * 角色的详情界面
 * @param roleId
 * @param allowKickOut 是否允许被踢出，仓库角色是不可以的
 * @param kickOutByManagerOnly 是否仅房主可踢出
 */
export function RoleDetail({
  roleId,
  roleTypeHint,
  roleOwnerUserIdHint,
  roleStateHint,
  allowKickOut = true,
  kickOutByManagerOnly = false,
  showAbilities = true,
  onClose,
}: {
  roleId: number;
  roleTypeHint?: number;
  roleOwnerUserIdHint?: number;
  roleStateHint?: number;
  allowKickOut?: boolean;
  kickOutByManagerOnly?: boolean;
  showAbilities?: boolean;
  onClose?: () => void;
}) {
  const shouldFetchRole = roleStateHint == null || roleStateHint === 0;
  const roleQuery = useGetRoleQuery(shouldFetchRole ? roleId : -1);
  const role = roleQuery.data?.data;
  const user = role?.userId ?? -1;
  const userName = useGetUserInfoQuery(user).data?.data?.username || "未知用户";

  /**
   * 仅在chat的上下文中起作用
   */
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const roomId = roomContext?.roomId;
  const ruleId = spaceContext.ruleId;
  const hasHostAccess = hasHostPrivileges(roomContext.curMember?.memberType);
  const deleteRoleMutation = useDeleteRole1Mutation();
  const userId = useGlobalUserId() ?? -1;
  const userRole = useGetUserRolesQuery(userId);
  const [isKickConfirmOpen, setIsKickConfirmOpen] = useState(false);

  // 用于踢出确认文案的角色与房间显示
  const roleDisplayName = role?.roleName || `角色 ${roleId}`;
  const roomDisplayName = roomId ? `房间 ${roomId}` : "当前房间";

  const handleRemoveRole = async () => {
    if (!roomId || roleId <= 0)
      return;
    deleteRoleMutation.mutate(
      { roomId, roleIdList: [roleId] },
      {
        onSettled: () => {
          onClose?.();
          setIsKickConfirmOpen(false);
        },
      },
    );
  };

  const canKick = (() => {
    if (!allowKickOut || !roomId)
      return false;
    if (hasHostAccess)
      return true;
    if (kickOutByManagerOnly)
      return false;
    if (roleTypeHint === 2)
      return false;
    if (roleOwnerUserIdHint != null && userId > 0)
      return roleOwnerUserIdHint === userId;
    return Boolean(userRole.data?.data?.find(r => r.roleId === roleId));
  })();

  return (
    <div className="bg-base-100 flex flex-col gap-4 w-full">
      {onClose && (
        <div className="px-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
            onClick={onClose}
          >
            返回
          </Button>
        </div>
      )}
      <div className={surfaceClassName({ level: "content", className: "border-base-200 p-4 shadow-sm" })}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-4 items-start justify-between">
            <div className="flex flex-row gap-4 items-start">
              <div className="shrink-0">
                <div className="relative inline-flex align-middle">
                  <div className="
                    w-20 h-20 rounded-full ring ring-info
                    ring-offset-base-100 ring-offset-2 overflow-hidden
                  ">
                    {roleQuery.isLoading
                      ? (
                          <Skeleton className="w-20 h-20" />
                        )
                      : (
                          <div className="
                            bg-neutral text-neutral-content flex items-center
                            justify-center text-3xl
                          ">
                            <RoleAvatarByRole
                              role={role}
                              width={20}
                              isRounded={true}
                              stopToastWindow={true}
                              alt="avatar"
                            />
                          </div>
                        )}
                  </div>
                </div>
              </div>

              {/* 基本信息区域 */}
              <div className="flex-1 min-w-0 space-y-2">
                {roleQuery.isLoading
                  ? (
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    )
                  : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className="min-w-0 flex-1 truncate text-lg font-medium">
                            {role?.roleName || `角色 ${roleId}`}
                          </h2>
                          <Badge density="default" appearance="outline" className="font-mono">
                            ID:
                            {" "}
                            {roleId}
                          </Badge>
                        </div>

                        {role?.description && (
                          <p className="
                            text-xs text-base-content/70 line-clamp-2
                          ">
                            {role.description}
                          </p>
                        )}

                        <div className="
                          flex flex-wrap gap-2 text-[11px] text-base-content/60
                        ">
                          {roomId && (
                            <Badge appearance="ghost">
                              房间
                              {" "}
                              {roomId}
                            </Badge>
                          )}
                          {ruleId && (
                            <Badge appearance="ghost">
                              规则
                              {" "}
                              {ruleId}
                            </Badge>
                          )}
                          {user && (
                            <Badge appearance="ghost">
                              所属用户
                              {" "}
                              {userName}
                            </Badge>
                          )}
                          {hasHostAccess && (
                            <Badge tone="info">
                              你有主持权限
                            </Badge>
                          )}
                        </div>
                      </>
                    )}
              </div>
            </div>

            <div className="flex items-start">
              {allowKickOut
                ? (
                    canKick
                      ? (
                          <Button
                            variant="error"
                            size="xs"
                            className="sm:h-8 sm:min-h-8 sm:px-3"
                            onClick={() => setIsKickConfirmOpen(true)}
                            aria-label={`踢出角色「${roleDisplayName}」（${roomDisplayName}）`}
                          >
                            踢出角色
                          </Button>
                        )
                      : null
                  )
                : (
                    <Button
                      size="xs"
                      className="sm:h-8 sm:min-h-8 sm:px-3"
                      disabled
                      onClick={() => setIsKickConfirmOpen(true)}
                    >
                      仓库角色不能被踢出
                    </Button>
                  )}
            </div>
          </div>
        </div>
      </div>

      {showAbilities && (
        <div className={surfaceClassName({ level: "content", className: "border-base-200 p-4 shadow-sm" })}>
          <div className="flex flex-col gap-3">
            <div className="mt-1">
              <ExpansionModule roleId={roleId} ruleId={ruleId ?? undefined} />
            </div>
          </div>
        </div>
      )}

      {/* 踢出角色确认弹窗 */}
      <ConfirmDialog
        open={isKickConfirmOpen}
        onOpenChange={() => setIsKickConfirmOpen(false)}
        title="确认踢出角色"
        description={`确定要将角色「${roleDisplayName}」从${roomDisplayName}移除吗？此操作会解除该角色与${roomDisplayName}的关联，房间内基于该角色的内容将不再生效。`}
        onConfirm={handleRemoveRole}
        confirmLabel="确认踢出"
        cancelLabel="取消"
        variant="warning"
      />
    </div>
  );
}

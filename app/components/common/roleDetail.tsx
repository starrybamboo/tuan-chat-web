import { RoomContext } from "@/components/chat/roomContext";
import { SpaceContext } from "@/components/chat/spaceContext";
import ConfirmModal from "@/components/common/comfirmModel";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider";
import ExpansionModule from "@/components/Role/rules/ExpansionModule";
import { use, useState } from "react";
import { useDeleteRole1Mutation } from "../../../api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery, useGetRoleQuery, useGetUserInfoQuery, useGetUserRolesQuery } from "../../../api/queryHooks";

/**
 * 角色的详情界面
 * @param roleId
 * @param allowKickOut 是否允许被踢出，模组角色是不可以的
 */
export function RoleDetail({ roleId, allowKickOut = true }: {
  roleId: number;
  allowKickOut?: boolean;
}) {
  const roleQuery = useGetRoleQuery(roleId);
  const role = roleQuery.data?.data;
  const avatarQuery = useGetRoleAvatarQuery(role?.avatarId || 0);
  const user = role?.userId ?? -1;
  const userName = useGetUserInfoQuery(user).data?.data?.username || "未知用户";

  /**
   * 仅在chat的上下文中起作用
   */
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const roomId = roomContext?.roomId;
  const ruleId = spaceContext.ruleId;
  // 控制角色详情的popWindow
  const [_, setIsOpen] = useSearchParamsState<boolean>(`rolePop${roleId}`, false);
  // 是否是群主
  function isManager() {
    return roomContext.curMember?.memberType === 1;
  }
  const deleteRoleMutation = useDeleteRole1Mutation();
  const userId = useGlobalContext().userId ?? -1;
  const userRole = useGetUserRolesQuery(userId);
  const [isKickConfirmOpen, setIsKickConfirmOpen] = useState(false);

  const handleRemoveRole = async () => {
    if (!roomId || !role?.roleId)
      return;
    deleteRoleMutation.mutate(
      { roomId, roleIdList: [roleId] },
      {
        onSettled: () => {
          setIsOpen(false);
          setIsKickConfirmOpen(false);
        },
      },
    );
  };

  const canKick
    = allowKickOut
      && (isManager() || userRole.data?.data?.find(r => r.roleId === roleId))
      && roomId;

  return (
    <div className="bg-base-100 flex flex-col gap-4 w-full">
      <div className="card card-compact shadow-sm border border-base-200">
        <div className="card-body gap-4">
          <div className="flex flex-row gap-4 items-start justify-between">
            <div className="flex flex-row gap-4 items-start">
              <div className="shrink-0">
                <div className="avatar">
                  <div className="w-20 h-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden">
                    {roleQuery.isLoading
                      ? (
                          <div className="skeleton w-20 h-20" />
                        )
                      : (
                          <div className="bg-neutral text-neutral-content flex items-center justify-center text-3xl">
                            <img
                              src={avatarQuery.data?.data?.avatarUrl}
                              alt="avatar"
                              className="w-20 h-20 object-cover"
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
                        <div className="skeleton h-5 w-32" />
                        <div className="skeleton h-4 w-48" />
                      </div>
                    )
                  : (
                      <>
                        <div className="flex items-center gap-2">
                          <h2 className="card-title text-lg truncate max-w-[180px]">
                            {role?.roleName || `角色 ${roleId}`}
                          </h2>
                          <span className="badge badge-outline badge-sm font-mono">
                            ID:
                            {" "}
                            {roleId}
                          </span>
                        </div>

                        {role?.description && (
                          <p className="text-xs text-base-content/70 line-clamp-2">
                            {role.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 text-[11px] text-base-content/60">
                          {roomId && (
                            <span className="badge badge-ghost badge-xs">
                              房间
                              {" "}
                              {roomId}
                            </span>
                          )}
                          {ruleId && (
                            <span className="badge badge-ghost badge-xs">
                              规则
                              {" "}
                              {ruleId}
                            </span>
                          )}
                          {user && (
                            <span className="badge badge-ghost badge-xs">
                              所属用户
                              {" "}
                              {userName}
                            </span>
                          )}
                          {isManager() && (
                            <span className="badge badge-primary badge-xs">
                              你是房主
                            </span>
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
                          <button
                            type="button"
                            className="btn btn-error btn-xs sm:btn-sm"
                            onClick={() => setIsKickConfirmOpen(true)}
                          >
                            踢出角色
                          </button>
                        )
                      : null
                  )
                : (
                    <button
                      type="button"
                      className="btn btn-xs sm:btn-sm"
                      disabled
                      onClick={() => setIsKickConfirmOpen(true)}
                    >
                      模组角色不能被踢出
                    </button>
                  )}
            </div>
          </div>
        </div>
      </div>

      <div className="card card-compact border border-base-200 shadow-sm">
        <div className="card-body gap-3">
          <div className="mt-1">
            <ExpansionModule roleId={roleId} ruleId={ruleId ?? undefined} />
          </div>
        </div>
      </div>

      {/* 踢出角色确认弹窗 */}
      <ConfirmModal
        isOpen={isKickConfirmOpen}
        onClose={() => setIsKickConfirmOpen(false)}
        title="确认踢出角色"
        message="确定要将该角色从当前房间移除吗？此操作将解除该角色与房间的关联。"
        onConfirm={handleRemoveRole}
        confirmText="确认踢出"
        cancelText="取消"
        variant="warning"
      />
    </div>
  );
}

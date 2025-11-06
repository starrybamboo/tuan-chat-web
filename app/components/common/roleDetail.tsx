import { RoomContext } from "@/components/chat/roomContext";
import { SpaceContext } from "@/components/chat/spaceContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider";
import ExpansionModule from "@/components/Role/rules/ExpansionModule";
import { use } from "react";
import { useDeleteRole1Mutation } from "../../../api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery, useGetRoleQuery, useGetUserRolesQuery } from "../../../api/queryHooks";

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
  const handleRemoveRole = async () => {
    if (!roomId || !role?.roleId)
      return;
    deleteRoleMutation.mutate(
      { roomId, roleIdList: [roleId] },
      {
        onSettled: () => {
          setIsOpen(false);
        }, // 最终关闭弹窗
      },
    );
  };

  return (
    <div className="bg-base-100 flex sm:flex-row flex-col gap-8 w-full">
      <div className="card-body">
        {/* 角色标识部分 */}
        <div className="flex flex-col items-center gap-4">
          <div className="avatar">
            <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              {roleQuery.isLoading
                ? (
                    <div className="skeleton w-24 h-24"></div>
                  )
                : (
                    <div
                      className="bg-neutral text-neutral-content flex items-center justify-center text-4xl"
                    >
                      <img
                        src={avatarQuery.data?.data?.avatarUrl}
                        alt="avatar"
                        className="w-24 h-24 rounded-full"
                      />
                    </div>
                  )}
            </div>
          </div>

          {/* 角色名称及描述 */}
          {roleQuery.isLoading
            ? (
                <div className="space-y-2">
                  <div className="skeleton h-6 w-32"></div>
                  <div className="skeleton h-4 w-48"></div>
                </div>
              )
            : (
                <div className="flex flex-col items-center text-center space-y-1">
                  <h2 className="card-title text-2xl">
                    {role?.roleName || `角色 ${roleId}`}
                  </h2>
                  {role?.description && (
                    <p className="text-base-content/80 text-sm truncate max-w-[100]">
                      {role.description}
                    </p>
                  )}
                </div>
              )}
        </div>

        {/* 详细信息 */}
        <div className="divider"></div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-base-content/70">角色ID</span>
            <span className="font-mono">{roleId}</span>
          </div>
        </div>

        {/* 加载错误处理 */}
        {roleQuery.isError && (
          <div className="alert alert-error mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>无法加载角色信息</span>
          </div>
        )}

        {/* 只在房间中显示的按钮组 */}
        {
          allowKickOut
            ? ((isManager() || userRole.data?.data?.find(role => role.roleId === roleId)) && roomId && allowKickOut) && (
                <button type="button" className="btn btn-error" onClick={handleRemoveRole}>
                  踢出角色
                </button>
              )
            : (
                <button type="button" className="btn" disabled onClick={handleRemoveRole}>
                  模组角色不能被踢出
                </button>
              )

        }
      </div>
      <ExpansionModule roleId={roleId} ruleId={ruleId ?? undefined}></ExpansionModule>
    </div>
  );
}

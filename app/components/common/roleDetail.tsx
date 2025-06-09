import { RoleAbilityDetail } from "@/components/common/ability/roleAbilityDetail";
import { useGetRoleAvatarQuery, useGetRoleQuery } from "../../../api/queryHooks";

export function RoleDetail({ roleId }: { roleId: number }) {
  const roleQuery = useGetRoleQuery(roleId);

  const role = roleQuery.data?.data;

  const avatarQuery = useGetRoleAvatarQuery(role?.avatarId || 0);

  return (
    <div className="card bg-base-100 shadow-xl flex sm:flex-row flex-col gap-8 ">
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
      </div>
      <RoleAbilityDetail roleId={roleId}></RoleAbilityDetail>
    </div>
  );
}

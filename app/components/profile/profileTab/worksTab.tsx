import { UserRoleCard } from "@/components/profile/module/userRoleCard";
import React from "react";
import { useGetUserRolesQuery } from "../../../../api/queryHooks";

export function WorksTab({ userId }: { userId: number }) {
  const {
    data: response,
  } = useGetUserRolesQuery(userId);

  const roleIds = React.useMemo(() => {
    if (!response?.success || !response.data)
      return [];
    // 确保每个 roleId 都是num
    return response.data
      .map(role => role.roleId)
      .filter((id): id is number => typeof id === "number");
  }, [response]);

  // if (isLoading)
  //   return <LoadingSpinner />;
  // if (isError)
  //   return <ErrorDisplay message={error?.toString()} />;

  return (
    <div className="p-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">创建的角色</h2>
        <span className="text-gray-500">
          共
          {" "}
          {roleIds.length}
          {" "}
          个角色
        </span>
      </div>

      {roleIds.length === 0
        ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-500">暂无创建的角色</p>
            </div>
          )
        : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {roleIds.map(roleId => (
                <UserRoleCard
                  key={roleId}
                  roleId={roleId}
                />
              ))}
            </div>
          )}
    </div>
  );
}

export default WorksTab;

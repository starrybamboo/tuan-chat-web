import Pagination from "@/components/common/pagination";
import { UserRoleCard } from "@/components/profile/module/userRoleCard";
import React, { useMemo, useState } from "react";
import { useGetUserRolesPageQuery } from "../../../../api/queryHooks";

export function WorksTab({ userId }: { userId: number }) {
  const [page, setPage] = useState(1);

  const { data: response } = useGetUserRolesPageQuery({
    userId,
    pageNo: page,
    pageSize: 10,
  });

  // 计算总页数
  const totalPages = useMemo(() => {
    if (!response?.data?.totalRecords || !response.data.pageSize)
      return 0;
    return Math.ceil(response.data.totalRecords / response.data.pageSize);
  }, [response]);

  const roleIds = useMemo((): number[] => {
    return (response?.data?.list || [])
      .map(role => role.roleId)
      .filter((id): id is number => id !== undefined && typeof id === "number");
  }, [response]);

  // if (isLoading)
  // if (isError)

  return (
    <div className="p-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">创建的角色</h2>
        <span className="text-gray-500">
          共
          {" "}
          {response?.data?.totalRecords}
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
            <>
              {/* 根据roleId获取而生成的角色卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {roleIds.map(roleId => (
                  <UserRoleCard
                    key={roleId}
                    roleId={roleId}
                  />
                ))}
              </div>
              {/* 分页组件 如果总页数在0-1就不显示 */}
              <Pagination
                totalPages={totalPages}
                currentPage={page}
                onPageChange={setPage}
                className="mt-8 items-center w-full mt-8"
              />
            </>
          )}
    </div>
  );
}

export default WorksTab;

import Pagination from "@/components/common/pagination";
import { useGlobalContext } from "@/components/globalContextProvider";
import { UserRoleCard } from "@/components/profile/module/userRoleCard";
import React, { useMemo, useState } from "react";
import { Link } from "react-router";
import { useGetUserRolesPageQuery, useGetUserRolesQuery } from "../../../../api/queryHooks";

export function WorksTab({ userId }: { userId: number }) {
  const currentUserId = useGlobalContext().userId ?? -1;
  // const userQuery = useGetUserInfoQuery(userId);
  const [page, setPage] = useState(1);
  const { isLoading } = useGetUserRolesQuery(userId);

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

  return (
    <div className="p-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">创建的角色</h2>
        <span className="text-gray-500">
          共
          {" "}
          {response?.data?.totalRecords || 0}
          {" "}
          个角色
        </span>
      </div>
      {isLoading
        ? (
            <>
              {/* 匹配 UserRoleCard 的骨架屏 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="animate-pulse w-48 bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    <div className="relative h-48 bg-gray-200">
                      <div className="w-full h-full bg-gray-200"></div>
                    </div>
                    {/* 描述区域 */}
                    <div className="p-4 space-y-2">
                      {/* 角色名称 */}
                      <div className="bg-gray-200 h-4 rounded-full w-4/5"></div>
                      {/* 描述 */}
                      <div className="bg-gray-200 h-3 rounded-full w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        : (
            <>
              {roleIds.length === 0
                ? (
                    <div className="text-center py-10 rounded-lg">
                      {currentUserId === userId
                        ? (
                            <div
                              className="w-full flex flex-col items-center justify-center text-gray-500 gap-2 mt-8"
                            >
                              {/* 圆形加号按钮 */}
                              <Link
                                to="/role"
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-pink-100 text-pink-500 hover:bg-pink-200 transition-colors duration-200"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-6 h-6"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </Link>
                              <p className="text-center leading-snug text-sm mt-2">
                                还没有角色呢…
                                <br />
                                可以从一个小小的名字开始喵~
                              </p>
                            </div>

                          )
                        : (
                            <p className="text-gray-500">这里还没有他的角色...仿佛藏着一段被尘封的往事...</p>
                          )}
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

            </>
          )}

    </div>
  );
}

export default WorksTab;

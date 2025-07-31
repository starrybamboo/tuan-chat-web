import { UserRolesList } from "@/components/profile/workTabPart/UserRolesList";
import React, { useMemo, useState } from "react";
import { useGetUserRolesPageQuery, useGetUserRolesQuery } from "../../../../api/queryHooks";

type TabType = "roles" | "modules";

export function WorksTab({ userId }: { userId: number }) {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>("roles");
  const { isLoading } = useGetUserRolesQuery(userId);

  const { data: response } = useGetUserRolesPageQuery({
    userId,
    pageNo: page,
    pageSize: 10,
  });

  // 确保 roleIds 是纯数字数组
  const roleIds = useMemo((): number[] => {
    return (response?.data?.list || [])
      .map(role => role.roleId)
      .filter((id): id is number => id !== undefined && typeof id === "number");
  }, [response]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "roles":
        return (
          <UserRolesList
            userId={userId}
            roleIds={roleIds}
            totalRecords={response?.data?.totalRecords || 0}
            currentPage={page}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        );
      case "modules":
        return <div className="py-10 text-center text-gray-500">模组内容正在开发中...</div>;
      default:
        return null;
    }
  };

  const renderTabButton = (tab: TabType, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 rounded-lg cursor-pointer ${
        activeTab === tab
          ? "bg-success/50 text-base font-medium"
          : "hover:bg-success/30"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* 顶部导航 - 移动端 */}
      <div className="md:hidden overflow-x-auto whitespace-nowrap p-4 border-b border-gray-200">
        <nav className="flex space-x-2">
          {renderTabButton("roles", "角色")}
          {renderTabButton("modules", "模组")}
        </nav>
      </div>

      <div className="flex flex-col md:flex-row flex-1 pl-10">
        {/* 左侧导航 - PC端（垂直） */}
        <div className="hidden md:flex md:flex-col w-48 flex-shrink-0 p-4 border-r border-gray-200 pt-10">
          <nav className="space-y-2 flex flex-col">
            {renderTabButton("roles", "角色")}
            {renderTabButton("modules", "模组")}
          </nav>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 p-4 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {{
                roles: "创建的角色",
                modules: "创建的模组",
              }[activeTab]}
            </h2>
            {activeTab === "roles" && (
              <span className="text-gray-500">
                共
                {" "}
                {response?.data?.totalRecords || 0}
                {" "}
                个角色
              </span>
            )}
          </div>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default WorksTab;

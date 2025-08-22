import UserModulesList from "@/components/profile/workTabPart/moudleList";
import UserPostsList from "@/components/profile/workTabPart/userPostsList";
import UserRolesList from "@/components/profile/workTabPart/UserRolesList";
import React, { useMemo, useState } from "react";
import { useListUserPostsQuery } from "../../../../api/hooks/communityQueryHooks";
import { useModuleListByUserQuery } from "../../../../api/hooks/moduleAndStageQueryHooks";
import { useGetUserRolesPageQuery, useGetUserRolesQuery } from "../../../../api/queryHooks";

type TabType = "roles" | "modules" | "posts";
interface WorksTabProp {
  userId: number;
}
// 在 WorksTab 组件中添加帖子相关内容
export const WorksTab: React.FC<WorksTabProp> = ({ userId }) => {
  const [page, setPage] = useState(1);
  const [modulePage, setModulePage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>("roles");
  const { isLoading } = useGetUserRolesQuery(userId);

  const { data: response } = useGetUserRolesPageQuery({
    userId,
    pageNo: page,
    pageSize: 10,
  });

  const { data: modulesResponse, isLoading: modulesLoading } = useModuleListByUserQuery({
    userId,
    pageNo: modulePage,
    pageSize: 10,
  });

  // 用户帖子查询 - 因为API不支持分页，所以直接获取全部
  const userPostsQuery = useListUserPostsQuery();
  const postsLoading = userPostsQuery.isLoading;

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
        return (
          <UserModulesList
            userId={userId}
            totalRecords={modulesResponse?.data?.totalRecords || 0}
            currentPage={modulePage}
            onPageChange={setModulePage}
            isLoading={modulesLoading}
          />
        );
      case "posts":
        return (
          <UserPostsList
            userId={userId}
            isLoading={postsLoading}
          />
        );
      default:
        return null;
    }
  };

  const renderTitle = () => {
    switch (activeTab) {
      case "roles":
        return (
          <>
            <h2 className="text-2xl font-bold">创建的角色</h2>
            <span className="text-gray-500">
              共
              {" "}
              {response?.data?.totalRecords || 0}
              {" "}
              个角色
            </span>
          </>
        );
      case "modules":
        return (
          <>
            <h2 className="text-2xl font-bold">创建的模组</h2>
            <span className="text-gray-500">
              共
              {" "}
              {modulesResponse?.data?.totalRecords || 0}
              {" "}
              个模组
            </span>
          </>
        );
      case "posts":
        return (
          <>
            <h2 className="text-2xl font-bold">发布的帖子</h2>
            <span className="text-gray-500">
              共
              {" "}
              {userPostsQuery.data?.data?.length || 0}
              {" "}
              个帖子
            </span>
          </>
        );
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
          {renderTabButton("posts", "帖子")}
        </nav>
      </div>

      <div className="flex flex-col md:flex-row flex-1 md:pl-10">
        {/* 左侧导航 - PC端（垂直） */}
        <div className="hidden md:flex md:flex-col w-48 flex-shrink-0 p-4 border-r border-gray-200 pt-10">
          <nav className="space-y-2 flex flex-col">
            {renderTabButton("roles", "角色")}
            {renderTabButton("modules", "模组")}
            {renderTabButton("posts", "帖子")}
          </nav>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 p-4 md:p-8">
          <div className="flex justify-between items-center mb-6">
            {renderTitle()}
          </div>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default WorksTab;

import Pagination from "@/components/common/pagination";
import { useGlobalContext } from "@/components/globalContextProvider";
import 教室图片 from "@/components/module/home/images/教室.webp";

import { ContentCard } from "@/components/module/home/Modulehome";
import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useModuleListByUserQuery } from "../../../../api/hooks/moduleAndStageQueryHooks";
import { useRuleListQuery } from "../../../../api/hooks/ruleQueryHooks";

interface UserModulesListProps {
  userId: number;
  totalRecords: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

/**
 * 在workTab使用的用户模组列表，卡片本身来源于ContentCard，大部分代码直接参考的模组页面
 */
export const UserModulesList: React.FC<UserModulesListProps> = ({
  userId,
  totalRecords,
  currentPage,
  onPageChange,
  isLoading,
}) => {
  const navigate = useNavigate();
  const currentUserId = useGlobalContext().userId ?? -1;
  const totalPages = Math.ceil(totalRecords / 10);

  // 获取用户模组数据
  const moduleListQuery = useModuleListByUserQuery({
    userId,
    pageNo: currentPage,
    pageSize: 10,
  });

  // 获取规则列表用于显示规则名称
  const ruleListQuery = useRuleListQuery();

  // 处理模组数据
  const moduleItems = useMemo(() => {
    if (!moduleListQuery.data?.data?.list) {
      return [];
    }

    return moduleListQuery.data.data.list
      .filter((module: any) => module.moduleId && true && module.moduleId !== "null")
      .map((module: any) => ({
        id: `user-module-${module.moduleId}`,
        rule: ruleListQuery.data?.find(rule => rule.ruleId === module.ruleId)?.ruleName ?? "",
        title: module.moduleName,
        image: (module.image && true && module.image !== "null") ? module.image : 教室图片,
        content: module.description,
        type: "mixed" as const,
        authorName: module.authorName,
        moduleId: module.moduleId,
        ruleId: module.ruleId,
        userId: module.userId,
        createTime: module.createTime,
        updateTime: module.updateTime,
        minPeople: module.minPeople,
        maxPeople: module.maxPeople,
        minTime: module.minTime,
        maxTime: module.maxTime,
        parent: module.parent,
        instruction: module.instruction,
      }));
  }, [moduleListQuery.data, ruleListQuery.data]);

  if (isLoading || moduleListQuery.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={`skeleton-${index}`} className="animate-pulse">
            <div className="bg-base-300 aspect-square rounded-none mb-4"></div>
            <div className="h-4 bg-base-300 rounded mb-2"></div>
            <div className="h-3 bg-base-300 rounded mb-1"></div>
            <div className="h-3 bg-base-300 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (moduleListQuery.isError) {
    return (
      <div className="text-center py-10 rounded-lg">
        <div className="text-error text-lg mb-2">加载失败</div>
        <div className="text-base-content/60 text-sm mb-4">请稍后再试</div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => moduleListQuery.refetch()}
        >
          重新加载
        </button>
      </div>
    );
  }

  if (moduleItems.length === 0) {
    return (
      <div className="text-center py-10 rounded-lg">
        {currentUserId === userId
          ? (
              <div className="w-full flex flex-col items-center justify-center text-gray-500 gap-2 mt-8">
                <Link
                  to="/module/create"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-500 hover:bg-blue-200 transition-colors duration-200"
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
                  还没有创建模组呢…
                  <br />
                  创造一个属于你的精彩世界吧！
                </p>
              </div>
            )
          : (
              <p className="text-gray-500">这里还没有他的模组...也许正在酝酿下一个传奇...</p>
            )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {moduleItems.map(module => (
          <ContentCard
            key={module.id}
            title={module.title}
            ruleId={module.ruleId}
            RuleName={module.rule}
            image={module.image}
            content={module.content}
            type={module.type}
            authorName={module.authorName}
            createTime={module.createTime}
            minPeople={module.minPeople}
            maxPeople={module.maxPeople}
            minTime={module.minTime}
            maxTime={module.maxTime}
            onClick={() => {
              if (!module.moduleId || module.moduleId === null) {
                console.error("模组ID为空，无法跳转");
                return;
              }
              navigate(`/module/detail/${module.moduleId}`, {
                state: {
                  moduleData: {
                    moduleId: module.moduleId,
                    ruleId: module.ruleId,
                    ruleName: module.rule,
                    moduleName: module.title,
                    description: module.content,
                    userId: module.userId,
                    authorName: module.authorName,
                    image: module.image,
                    createTime: module.createTime,
                    updateTime: module.updateTime,
                    minPeople: module.minPeople,
                    maxPeople: module.maxPeople,
                    minTime: module.minTime,
                    maxTime: module.maxTime,
                    parent: module.parent,
                    instruction: module.instruction,
                  },
                },
              });
            }}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={onPageChange}
          className="mt-8 items-center w-full"
        />
      )}
    </>
  );
};

export default UserModulesList;

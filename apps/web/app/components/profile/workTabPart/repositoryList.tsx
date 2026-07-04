import { Link, useRouter } from "@tanstack/react-router";
import React, { useMemo } from "react";

import Pagination from "@/components/common/pagination";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { ContentCard } from "@/components/repository/home/RepositoryHome";
import { imageMediumUrl } from "@/utils/media/mediaUrl";

import { useRepositoryListByUserQuery } from "../../../../api/hooks/repositoryQueryHooks";
import { useRuleListQuery } from "../../../../api/hooks/ruleQueryHooks";

type UserRepositoriesListProps = {
  userId: number;
  totalRecords: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

/**
 * 在workTab使用的用户仓库列表，卡片本身来源于ContentCard，大部分代码直接参考的仓库页面
 */
const UserRepositoriesList: React.FC<UserRepositoriesListProps> = ({
  userId,
  totalRecords,
  currentPage,
  onPageChange,
  isLoading,
}) => {
  const router = useRouter();
  const currentUserId = useGlobalUserId() ?? -1;
  const totalPages = Math.ceil(totalRecords / 10);

  // 获取用户仓库数据
  const repositoryListQuery = useRepositoryListByUserQuery({
    userId,
    pageNo: currentPage,
    pageSize: 10,
  });

  // 获取规则列表用于显示规则名称
  const ruleListQuery = useRuleListQuery();

  // 处理仓库数据
  const repositoryItems = useMemo(() => {
    if (!repositoryListQuery.data?.data?.list) {
      return [];
    }

    return repositoryListQuery.data.data.list
      .filter((repository: any) => repository.repositoryId && true && repository.repositoryId !== "null")
      .map((repository: any) => ({
        id: `user-repository-${repository.repositoryId}`,
        rule: ruleListQuery.data?.find(rule => rule.ruleId === repository.ruleId)?.ruleName ?? "",
        title: repository.repositoryName,
        image: imageMediumUrl(repository.coverFileId),
        content: repository.description,
        type: "mixed" as const,
        authorName: repository.authorName,
        repositoryId: repository.repositoryId,
        coverFileId: repository.coverFileId,
        ruleId: repository.ruleId,
        userId: repository.userId,
        createTime: repository.createTime,
        updateTime: repository.updateTime,
        minPeople: repository.minPeople,
        maxPeople: repository.maxPeople,
        minTime: repository.minTime,
        maxTime: repository.maxTime,
        parent: repository.parentRepositoryId,
        instruction: repository.instruction,
      }));
  }, [repositoryListQuery.data, ruleListQuery.data]);

  if (isLoading || repositoryListQuery.isLoading) {
    return (
      <div className="
        grid grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        gap-6
      ">
        {Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map(key => (
          <div key={key} className="animate-pulse">
            <div className="bg-base-300 aspect-square rounded-none mb-4"></div>
            <div className="h-4 bg-base-300 rounded mb-2"></div>
            <div className="h-3 bg-base-300 rounded mb-1"></div>
            <div className="h-3 bg-base-300 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (repositoryListQuery.isError) {
    return (
      <div className="text-center py-10 rounded-lg">
        <div className="text-error text-lg mb-2">加载失败</div>
        <div className="text-base-content/60 text-sm mb-4">请稍后再试</div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => repositoryListQuery.refetch()}
        >
          重新加载
        </button>
      </div>
    );
  }

  if (repositoryItems.length === 0) {
    return (
      <div className="text-center py-10 rounded-lg">
        {currentUserId === userId
          ? (
              <div className="
                w-full flex flex-col items-center justify-center text-base-content/60
                gap-2 mt-8
              ">
                <Link
                  to="/repository/create"
                  className="
                    w-12 h-12 flex items-center justify-center rounded-full
                    bg-info text-info
                    hover:bg-info
                    transition-colors duration-200
                  "
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
                  还没有创建仓库呢…
                  <br />
                  创造一个属于你的精彩世界吧！
                </p>
              </div>
            )
          : (
              <p className="text-base-content/60">这里还没有他的仓库...也许正在酝酿下一个传奇...</p>
            )}
      </div>
    );
  }

  return (
    <>
      <div className="
        grid grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        gap-6
      ">
        {repositoryItems.map(repositoryCard => (
          <ContentCard
            key={repositoryCard.id}
            title={repositoryCard.title}
            ruleId={repositoryCard.ruleId}
            RuleName={repositoryCard.rule}
            image={repositoryCard.image}
            content={repositoryCard.content}
            type={repositoryCard.type}
            authorName={repositoryCard.authorName}
            createTime={repositoryCard.createTime}
            minPeople={repositoryCard.minPeople}
            maxPeople={repositoryCard.maxPeople}
            minTime={repositoryCard.minTime}
            maxTime={repositoryCard.maxTime}
            onPreload={() => {
              if (!repositoryCard.repositoryId) {
                return;
              }
              void router.preloadRoute({
                to: "/repository/detail/{-$id}",
                params: { id: String(repositoryCard.repositoryId) },
              });
            }}
            onClick={() => {
              if (!repositoryCard.repositoryId) {
                console.error("仓库ID为空，无法跳转");
                return;
              }
              router.history.push(`/repository/detail/${repositoryCard.repositoryId}`, {
                repositoryData: {
                  repositoryId: repositoryCard.repositoryId,
                  ruleId: repositoryCard.ruleId,
                  ruleName: repositoryCard.rule,
                  repositoryName: repositoryCard.title,
                  description: repositoryCard.content,
                  userId: repositoryCard.userId,
                  authorName: repositoryCard.authorName,
                  coverFileId: repositoryCard.coverFileId,
                  image: repositoryCard.image,
                  createTime: repositoryCard.createTime,
                  updateTime: repositoryCard.updateTime,
                  minPeople: repositoryCard.minPeople,
                  maxPeople: repositoryCard.maxPeople,
                  minTime: repositoryCard.minTime,
                  maxTime: repositoryCard.maxTime,
                  parent: repositoryCard.parent,
                  instruction: repositoryCard.instruction,
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

export default UserRepositoriesList;

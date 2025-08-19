import PostsCard from "@/components/activities/cards/postsCard";
import React from "react";
import { useGetUserMomentFeedInfiniteQuery } from "../../../../api/hooks/activitiesFeedQuerryHooks";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

interface ActivitiesTabProps {
  userId: number;
}

export const ActivitiesTab: React.FC<ActivitiesTabProps> = ({ userId }) => {
  // 获取用户信息
  const { data: userInfoData, isLoading: userInfoLoading } = useGetUserInfoQuery(userId);

  // 获取用户动态Feed（无限滚动）
  const {
    data: momentFeedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: momentFeedLoading,
    error: momentFeedError,
  } = useGetUserMomentFeedInfiniteQuery({
    userId,
    pageSize: 10,
  });

  const userData = userInfoData?.data;
  // 根据API文档，数据结构是 data.list 而不是 data.records
  const allMoments = momentFeedData?.pages.flatMap(page => page.data?.list || []) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧用户信息栏 */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* 用户基本信息卡片 */}
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
                {userInfoLoading
                  ? (
                      <div className="space-y-4">
                        <div className="flex flex-col items-center space-y-3">
                          <div className="skeleton w-20 h-20 rounded-full"></div>
                          <div className="skeleton h-6 w-24"></div>
                          <div className="skeleton h-4 w-32"></div>
                        </div>
                      </div>
                    )
                  : (
                      <div className="flex flex-col items-center space-y-4">
                        <img
                          src={userData?.avatar || "favicon.ico"}
                          alt="用户头像"
                          className="w-20 h-20 rounded-full object-cover border-2 border-base-300"
                        />
                        <div className="text-center">
                          <h3 className="font-bold text-lg">{userData?.username || "未知用户"}</h3>
                        </div>
                      </div>
                    )}
              </div>

              {/* 统计信息卡片 */}
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
                <h4 className="font-semibold mb-4">动态统计</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base-content/60">总动态</span>
                    <span className="font-semibold">{allMoments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base-content/60">获得点赞</span>
                    <span className="font-semibold">
                      {allMoments.reduce((sum, m) => sum + (m.stats?.likeCount || 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base-content/60">获得评论</span>
                    <span className="font-semibold">
                      {allMoments.reduce((sum, m) => sum + (m.stats?.commentCount || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧主要内容区域 */}
          <div className="lg:col-span-3">
            {/* 页面标题 */}
            <div className="mb-6">
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="text-2xl font-bold">我的动态</h1>
                </div>
              </div>
            </div>

            {/* 动态内容区域 */}
            <div className="space-y-4">
              {momentFeedLoading && allMoments.length === 0
                ? (
              // 初次加载骨架屏
                    <div className="space-y-4">
                      {[...Array.from({ length: 3 })].map((_, index) => (
                        <div key={index} className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="skeleton w-12 h-12 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="skeleton h-4 w-24"></div>
                              <div className="skeleton h-3 w-32"></div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="skeleton h-4 w-full"></div>
                            <div className="skeleton h-4 w-3/4"></div>
                            <div className="skeleton h-32 w-full rounded-lg"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                : momentFeedError
                  ? (
                // 错误状态
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">😔</div>
                        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
                        <p className="text-base-content/60 mb-4">
                          无法获取动态内容，请稍后重试
                        </p>
                        <button
                          onClick={() => window.location.reload()}
                          className="btn btn-primary"
                          type="button"
                        >
                          重新加载
                        </button>
                      </div>
                    )
                  : allMoments.length === 0
                    ? (
                  // 空状态
                        <div className="text-center py-16">
                          <div className="text-6xl mb-4">📝</div>
                          <h3 className="text-lg font-semibold mb-2">暂无动态</h3>
                          <p className="text-base-content/60">
                            用户还没有发布任何动态
                          </p>
                        </div>
                      )
                    : (
                        <>
                          {/* 动态列表 */}
                          {allMoments.map((dynamic, index) => (
                            <PostsCard key={dynamic.feed?.feedId || index} dynamic={dynamic} />
                          ))}

                          {/* 加载更多按钮 */}
                          {hasNextPage && (
                            <div className="text-center py-6">
                              <button
                                onClick={handleLoadMore}
                                disabled={isFetchingNextPage}
                                className="btn btn-outline btn-primary"
                                type="button"
                              >
                                {isFetchingNextPage
                                  ? (
                                      <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        加载中...
                                      </>
                                    )
                                  : (
                                      "加载更多"
                                    )}
                              </button>
                            </div>
                          )}

                          {/* 已加载完毕提示 */}
                          {!hasNextPage && allMoments.length > 0 && (
                            <div className="text-center py-6">
                              <div className="text-base-content/40 text-sm">
                                已经到底了，没有更多内容了
                              </div>
                            </div>
                          )}
                        </>
                      )}
              {" "}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesTab;

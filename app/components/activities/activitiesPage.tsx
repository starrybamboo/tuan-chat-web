import type { FeedPageRequest } from "../../../api";
import ActivityNotice from "@/components/activities/cards/activituNoticeCard";
import PostsCard from "@/components/activities/cards/postsCard";
import PublishBox from "@/components/activities/cards/publishPostCard";
import TrendingTopics from "@/components/activities/cards/trendingTopicsCard";
import React, { useMemo, useRef, useState } from "react";
import { useGetFollowingMomentFeedInfiniteQuery } from "../../../api/hooks/activitiesFeedQuerryHooks";

/**
 * 动态页面的入口文件
 */

export default function ActivitiesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "module">("all");

  // 固定请求参数引用，避免 queryKey 抖动导致重复拉第一页
  const feedRequest = useMemo<FeedPageRequest>(() => ({
    pageSize: 10,
  }), []);

  const {
    data: feedData,
    // fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useGetFollowingMomentFeedInfiniteQuery(feedRequest);

  // 本地记录上一次发起“加载更多”时使用的 cursor，防止重复请求同一个游标
  const lastRequestedCursorRef = useRef<number | null>(null);

  // 合并分页并按 feedId 去重（保留首次出现顺序）
  const dynamics = useMemo(() => {
    const pages = (feedData?.pages ?? []) as any[];
    const all = pages.flatMap((p: any) => p?.data?.list ?? []);

    const seen = new Set<number | string>();
    const seenFp = new Set<string>();
    const out: any[] = [];

    for (const item of all) {
      const id = item?.feed?.feedId;
      if (id !== null && id !== undefined) {
        if (!seen.has(id)) {
          seen.add(id);
          out.push(item);
        }
      }
      else {
        // 极少数没有 feedId 的情况，用 createTime+content 做指纹避免重复
        const fp = `${item?.feed?.createTime ?? ""}::${String(item?.feed?.content ?? "")}`;
        if (!seenFp.has(fp)) {
          seenFp.add(fp);
          out.push(item);
        }
      }
    }
    return out;
  }, [feedData]);

  // 点击“加载更多”
  const handleLoadMore = async () => {
    if (!hasNextPage || isFetchingNextPage)
      return;

    // 读取“下一页”的 cursor（由后端在上一页返回的 data.cursor 提供）
    const pages = feedData?.pages ?? [];
    const lastPage = pages[pages.length - 1] as any;
    const nextCursorRaw = lastPage?.data?.cursor; // 文档：number<double>
    const nextCursor: number | null
        = nextCursorRaw === null || nextCursorRaw === undefined ? null : Number(nextCursorRaw);

    // 后端如果意外重复给相同 cursor，就不要重复请求
    if (nextCursor !== null && lastRequestedCursorRef.current === nextCursor) {
      return;
    }
    lastRequestedCursorRef.current = nextCursor;

    // try { TODO API异常，暂时无法使用
    //   // 显式把后端返回的 cursor 作为 pageParam 传给 fetchNextPage
    //   await fetchNextPage(
    //     nextCursor !== null ? { pageParam: nextCursor } : undefined,
    //   );
    // }
    // catch {
    //   // 出错允许重试
    //   lastRequestedCursorRef.current = null;
    // }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* 布局 */}
        <div className="block lg:grid lg:grid-cols-12 lg:gap-6">
          {/* 移动端顶部侧边栏 */}
          <div className="lg:hidden mb-4">
            <div className="grid grid-cols-1 gap-3">
              <ActivityNotice />
              <TrendingTopics />
            </div>
          </div>

          {/* 主内容区 */}
          <div className="lg:col-span-9">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-base-content px-1">
              动态
            </h1>

            {/* 发布动态框 */}
            <div className="mb-4 sm:mb-6">
              <PublishBox />
            </div>

            {/* 导航标签 */}
            <div className="mb-4 sm:mb-6">
              <div className="flex space-x-4 sm:space-x-6 text-sm bg-base-100 rounded-t-lg px-3 sm:px-4 pt-3">
                <button
                  className={`font-medium border-b-2 pb-2 transition-colors ${
                    activeTab === "all"
                      ? "text-primary border-primary"
                      : "text-base-content/70 hover:text-primary border-transparent"
                  }`}
                  onClick={() => setActiveTab("all")}
                  type="button"
                >
                  全部
                </button>
                <button
                  className={`font-medium border-b-2 pb-2 transition-colors ${
                    activeTab === "module"
                      ? "text-primary border-primary"
                      : "text-base-content/70 hover:text-primary border-transparent"
                  }`}
                  onClick={() => setActiveTab("module")}
                  type="button"
                >
                  模组动态
                </button>
              </div>
            </div>

            {/* 动态列表 */}
            <div className="space-y-3 sm:space-y-4">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="loading loading-spinner loading-lg text-primary"></div>
                </div>
              )}

              {isError && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-center">
                  <p className="text-error font-medium">加载失败</p>
                  <p className="text-error/80 text-sm mt-1">
                    {error?.message || "请检查网络连接后重试"}
                  </p>
                </div>
              )}

              {dynamics.map((item) => {
                const feedId = item?.feed?.feedId;
                const key = `feed-${feedId}`;
                return <PostsCard key={key} dynamic={item} />;
              })}

              {!isLoading && !isError && dynamics.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-base-content/40 text-lg mb-2">📱</div>
                  <p className="text-base-content/60">还没有动态</p>
                  <p className="text-base-content/40 text-sm">关注一些用户来查看他们的动态吧</p>
                </div>
              )}

              {hasNextPage && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={!hasNextPage || isFetchingNextPage}
                    className="btn btn-outline btn-primary"
                    type="button"
                  >
                    {isFetchingNextPage
                      ? (
                          <>
                            <div className="loading loading-spinner loading-sm"></div>
                            加载中...
                          </>
                        )
                      : (
                          "加载更多"
                        )}
                  </button>
                </div>
              )}

              {!hasNextPage && dynamics.length > 0 && (
                <div className="text-center py-4 text-base-content/40 text-sm">已经到底了</div>
              )}
            </div>
          </div>

          {/* 桌面端右侧边栏 */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-6 space-y-6">
              <ActivityNotice />
              <TrendingTopics />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

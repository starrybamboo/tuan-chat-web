import type { FeedPageRequest } from "../../../api";
import ActivityNotice from "@/components/activities/cards/activituNoticeCard";
import PostsCard from "@/components/activities/cards/postsCard";
import PublishBox from "@/components/activities/cards/publishPostCard";
import TrendingTopics from "@/components/activities/cards/trendingTopicsCard";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGetFollowingMomentFeedInfiniteQuery } from "../../../api/hooks/activitiesFeedQuerryHooks";

/**
 * 动态页面的入口文件（自动在剩 RENDER_MIN 个动态时加载更多）
 */
export default function ActivitiesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "module">("all");
  const RENDER_MIN = 3;
  // 固定请求参数引用，避免 queryKey 抖动导致重复拉第一页
  const feedRequest = useMemo<FeedPageRequest>(() => ({
    pageSize: 10,
  }), []);

  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useGetFollowingMomentFeedInfiniteQuery(feedRequest);

  // 合并分页并按 feedId 去重（保留首次出现顺序）
  const activities = useMemo(() => {
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

  // sentinel ref：用于监听倒数第 3 个动态何时进入视口
  const sentinelRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // 清理旧 observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // 若没有下一页或正在加载下一页，则不创建 observer（避免重复触发）
    if (!hasNextPage || isFetchingNextPage)
      return;

    // 当倒数第 RENDER_MIN 个元素进入视口时触发加载
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // 再次确认条件，避免 race
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage().catch(() => {
                // 忽略错误，React Query 会在 hook 层记录 isError / error
              });
            }
          }
        }
      },
      {
        root: null,
        rootMargin: "0px", // 不提前加载，确保用户确实滚动到倒数第3个
        threshold: 0.1, // 小部分可见即可触发
      },
    );

    const el = sentinelRef.current;
    if (el)
      observerRef.current.observe(el);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
    // 这些依赖项足以在分页数据 / 加载状态 / 是否还有下一页变化时重新建立 observer
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, activities.length]);

  // 计算需要挂载 sentinel 的索引（当 items <= RENDER_MIN 时，挂到索引 0 上以尽快触发加载）
  const sentinelIndex = Math.max(0, activities.length - RENDER_MIN);

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

              {activities.map((item, idx) => {
                const feedId = item?.feed?.feedId;
                const key = `feed-${feedId ?? idx}`;

                // 将 sentinelRef 挂载在倒数第 RENDER_MIN 个 item（或长度 <= RENDER_MIN 时挂在第 0 个）
                if (idx === sentinelIndex) {
                  return (
                    <div key={key} ref={(el) => { sentinelRef.current = el as HTMLElement; }}>
                      <PostsCard dynamic={item} />
                    </div>
                  );
                }

                return <PostsCard key={key} dynamic={item} />;
              })}

              {!isLoading && !isError && activities.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-base-content/40 text-lg mb-2">📱</div>
                  <p className="text-base-content/60">还没有动态</p>
                  <p className="text-base-content/40 text-sm">关注一些用户来查看他们的动态吧</p>
                </div>
              )}

              {/* 取消了手动“加载更多”按钮 —— 由倒数第 RENDER_MIN 个元素进入视口自动触发加载 */}
              {!hasNextPage && activities.length > 0 && (
                <div className="text-center py-4 text-base-content/40 text-sm">已经到底了</div>
              )}

              {/* 显示正在加载下一页的 spinner */}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <div className="loading loading-spinner loading-md text-primary"></div>
                </div>
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

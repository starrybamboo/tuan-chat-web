import type { FeedPageRequest, MessageFeedWithStatsResponse } from "api";

import FeedPreview from "@/components/feed/feedPreview";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";

import { tuanchat } from "api/instance";
import { useEffect, useMemo } from "react";

export default function FeedPage() {
  const PAGE_SIZE = 10;
  const [feedRef, feedEntry] = useIntersectionObserver();
  const FETCH_ON_REMAIN = 2;

  // 无限加载接口
  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: ["pageFeed"],
    queryFn: async ({ pageParam }) => {
      return tuanchat.feedController.pageFeed(pageParam as FeedPageRequest);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data === undefined || lastPage.data?.isLast) {
        return undefined;
      }
      else {
        const params: FeedPageRequest = { pageSize: PAGE_SIZE, cursor: lastPage.data?.cursor };
        return params;
      }
    },
    initialPageParam: { pageSize: PAGE_SIZE, cursor: null } as unknown as FeedPageRequest,
    refetchOnWindowFocus: false,
  });

  // 将分页数据 flatten
  const feeds: MessageFeedWithStatsResponse[] = useMemo(() => {
    return feedInfiniteQuery.data?.pages.flatMap(p => p.data?.list ?? []) ?? [];
  }, [feedInfiniteQuery.data?.pages]);

  // 无限滚动逻辑
  useEffect(() => {
    if (feedEntry?.isIntersecting && !feedInfiniteQuery.isFetching && feedInfiniteQuery.hasNextPage) {
      void feedInfiniteQuery.fetchNextPage();
    }
  }, [feedEntry?.isIntersecting, feedInfiniteQuery.isFetching, feedInfiniteQuery.hasNextPage, feedInfiniteQuery]);

  return (
    <div className="flex justify-center bg-gray-100 dark:bg-gray-900 min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        <header className="mb-6 flex justify-between items-center px-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Feed
          </h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="btn btn-circle btn-ghost text-2xl text-primary"
              onClick={() => {}}
              title="创作"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button
              type="button"
              className="btn btn-circle btn-ghost text-2xl text-gray-600 dark:text-gray-300"
              onClick={() => feedInfiniteQuery.refetch()}
              title="刷新"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m3.906-7.025A9.999 9.999 0 0118.582 9h2.418m-3.906 7.025A9.999 9.999 0 015.418 15h-2.418m4.906 7.025A9.999 9.999 0 0115.418 17h-2.418" />
              </svg>
            </button>
          </div>
        </header>

        {/* 主 feed 流 */}
        <div className="flex flex-col gap-6">
          {feeds.map((feed, index) => (
            <div
              ref={index === feeds.length - FETCH_ON_REMAIN ? feedRef : null}
              key={feed?.feed?.feedId}
              className="cursor-pointer"
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl">
                {feed.feed ? <FeedPreview feed={feed.feed} stats={feed.stats!} /> : <div>加载失败或数据为空</div>}
              </div>
            </div>
          ))}
          {feedInfiniteQuery.isFetchingNextPage && (
            <div className="text-center py-4">
              <span className="loading loading-dots loading-lg text-gray-500"></span>
            </div>
          )}
          {!feedInfiniteQuery.hasNextPage && feeds.length > 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              你已经浏览完所有内容啦！
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
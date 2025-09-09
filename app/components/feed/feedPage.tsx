import type { FeedPageRequest, MessageFeedWithStatsResponse } from "api";

import FeedPreview from "@/components/feed/feedPreview";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";

import { tuanchat } from "api/instance";
import { useEffect, useMemo, useState } from "react";

export default function FeedPage() {
  const PAGE_SIZE = 10;
  const [feedRef, feedEntry] = useIntersectionObserver();
  const FETCH_ON_REMAIN = 2;

  // 不感兴趣的feed
  const [hiddenFeeds, setHiddenFeeds] = useState<number[]>([]);
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

  // 将分页数据 flatten，过滤不感兴趣
  const feeds: MessageFeedWithStatsResponse[] = useMemo(() => {
    return (
      feedInfiniteQuery.data?.pages.flatMap(p => p.data?.list ?? []) ?? []
    ).filter(f => !hiddenFeeds.includes(f.feed!.feedId!));
  }, [feedInfiniteQuery.data?.pages, hiddenFeeds]);

  // 无限滚动逻辑
  useEffect(() => {
    if (feedEntry?.isIntersecting && !feedInfiniteQuery.isFetching && feedInfiniteQuery.hasNextPage) {
      void feedInfiniteQuery.fetchNextPage();
    }
  }, [feedEntry?.isIntersecting, feedInfiniteQuery.isFetching, feedInfiniteQuery.hasNextPage, feedInfiniteQuery]);

  // 点击不感兴趣
  const handleDislike = (feedId: number) => {
    setHiddenFeeds(prev => [...prev, feedId]);
  };

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
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" />
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
                {feed.feed ? <FeedPreview feed={feed.feed} stats={feed.stats!} onDislike={() => feed.feed?.feedId && handleDislike(feed.feed.feedId)} /> : <div>加载失败或数据为空</div>}
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

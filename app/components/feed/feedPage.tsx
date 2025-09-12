import type { CommunityPostFeed, FeedWithStats } from "@/types/feedTypes";
import type { FeedPageRequest } from "api";
import FeedPreview from "@/components/feed/feedPreview";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { tuanchat } from "api/instance";
import { useEffect, useMemo, useState } from "react";

export default function FeedPage() {
  const PAGE_SIZE = 10;
  const [feedRef, feedEntry] = useIntersectionObserver();
  // 顶部哨兵
  const [topSentinelRef] = useIntersectionObserver();
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
      if (!lastPage.data || lastPage.data.isLast)
        return undefined;
      return { pageSize: PAGE_SIZE, cursor: lastPage.data.cursor };
    },
    initialPageParam: { pageSize: PAGE_SIZE, cursor: undefined as number | undefined },
    refetchOnWindowFocus: false,
  });

  // 将分页数据 flatten，过滤不感兴趣
  const feeds: FeedWithStats<CommunityPostFeed>[] = useMemo(() => {
    return (
      feedInfiniteQuery.data?.pages.flatMap((page) => {
      // page.data?.list 是 FeedWithStatsResponse[] 类型，需要转换为 FeedWithStats<CommunityPostFeed>[]
        if (page.data?.list) {
          return page.data.list.map(item => ({
            ...item,
            // 将 response 字段转换为 CommunityPostFeed 类型
            response: item.response as CommunityPostFeed,
            // 将 stats 字段转换为 FeedStats 类型
            stats: item.stats as FeedWithStats<CommunityPostFeed>["stats"],
          }));
        }
        return [];
      }) ?? []
    ).filter(f => !hiddenFeeds.includes(f.stats?.postId ?? -1));
  }, [feedInfiniteQuery.data?.pages, hiddenFeeds]);

  // 无限滚动逻辑
  useEffect(() => {
    if (feedEntry?.isIntersecting && !feedInfiniteQuery.isFetching && feedInfiniteQuery.hasNextPage) {
      void feedInfiniteQuery.fetchNextPage();
    }
  }, [feedEntry?.isIntersecting, feedInfiniteQuery.isFetching, feedInfiniteQuery.hasNextPage, feedInfiniteQuery]);

  // 点击不感兴趣
  const handleDislike = (postId: number) => {
    setHiddenFeeds(prev => [...prev, postId]);
  };

  return (
    <div className="min-h-screen bg-base-200/70 dark:bg-base-200">
      <main className="mx-auto w-full max-w-2xl px-2 sm:px-4 flex flex-col">
        <div ref={topSentinelRef} aria-hidden="true" className="h-px w-full" />
        <header className="sticky top-0 z-20 bg-base-200/70 backdrop-blur border-b border-base-300 px-2 sm:px-4 py-3">
          <h1 className="text-xl font-semibold">社区广场</h1>
        </header>
        <div className="flex flex-col gap-4 py-4">
          {feeds.map((feed, index) => (
            <div
              ref={index === feeds.length - FETCH_ON_REMAIN ? feedRef : null}
              key={feed.stats?.postId}
            >
              {feed.stats?.postId
                ? (
                    <FeedPreview
                      feed={feed.response}
                      stats={feed.stats}
                      onDislike={() => handleDislike(feed.stats!.postId)}
                    />
                  )
                : (
                    <div className="text-sm opacity-60">加载失败或数据为空</div>
                  )}
            </div>
          ))}
          {feedInfiniteQuery.isFetchingNextPage && (
            <div className="text-center py-4">
              <span className="loading loading-dots loading-lg text-primary"></span>
            </div>
          )}
          {!feedInfiniteQuery.hasNextPage && feeds.length > 0 && (
            <p className="text-center text-base-content/50 py-4 text-sm">你已经浏览完所有内容啦！</p>
          )}
        </div>
      </main>
    </div>
  );
}

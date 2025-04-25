import type { Feed, FeedPageRequest } from "api";
import FeedPost from "@/components/feed/feedPost";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { tuanchat } from "api/instance";
import { useEffect, useMemo } from "react";

export default function FeedPage() {
  const PAGE_SIZE = 10;
  const [feedRef, feedEntry] = useIntersectionObserver();
  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: ["pageFeed"],
    queryFn: async ({ pageParam }) => {
      return tuanchat.feedController.pageFeed(pageParam);
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
  // 触发feed流加载
  useEffect(() => {
    if (feedEntry?.isIntersecting && !feedInfiniteQuery.isFetching) {
      feedInfiniteQuery.fetchNextPage();
    }
  }, [feedEntry?.isIntersecting]);

  // 合并所有分页消息 同时更新重复的消息
  const feeds: Feed[] = useMemo(() => {
    return (feedInfiniteQuery.data?.pages.flatMap(p => p.data?.list ?? []) ?? []);
  }, [feedInfiniteQuery.data?.pages]);

  return (
    <div className="w-[70vw] mx-auto overflow-y-auto flex flex-col h-[95vh]">
      {
        feeds.map((feed, index) => {
          return (
            <div ref={index === feeds.length - 2 ? feedRef : null} key={feed.feedId}>
              <FeedPost feed={feed} />
            </div>
          );
        })
      }
    </div>

  );
}
